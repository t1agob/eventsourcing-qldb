import * as cdk from '@aws-cdk/core';
import { CfnLedger, CfnStream } from '@aws-cdk/aws-qldb';
import { Role, ServicePrincipal, ManagedPolicy, PolicyDocument, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import * as Kinesis from '@aws-cdk/aws-kinesis';
import { Runtime, Code, Function } from '@aws-cdk/aws-lambda';
import { Duration, CfnOutput } from '@aws-cdk/core';
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import { CfnDomain } from "@aws-cdk/aws-elasticsearch";
import { Alias } from "@aws-cdk/aws-kms";
import { CfnDeliveryStream } from '@aws-cdk/aws-kinesisfirehose';
import { Bucket } from '@aws-cdk/aws-s3';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';

export class AdsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // UPDATE THIS SECTION WITH YOUR CREDENTIALS
    const esUserName = "elasticads";
    const esPassword = "Elastic4d$";


    // CLIENT
    const lambdaRole = new Role(this, "adstack-lambda-qldbaccess", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      roleName: "adstack-lambda-qldbaccess-role",
    });

    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")
    );
    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonQLDBFullAccess")
    );

    const key = Alias.fromAliasName(this, "esKey", "alias/aws/es");

    const esPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["es:*"],
    });
    esPolicyStatement.addAnyPrincipal();

    const esAccessPolicy = new PolicyDocument({
      assignSids: true,
      statements: [esPolicyStatement],
    });

    const es = new CfnDomain(this, "esDomain", {
      domainName: "elasticads",
      domainEndpointOptions: {
        enforceHttps: true,
      },
      elasticsearchClusterConfig: {
        instanceCount: 1,
        dedicatedMasterEnabled: false,
      },
      elasticsearchVersion: "7.7",
      encryptionAtRestOptions: {
        enabled: true,
        kmsKeyId: key.keyId,
      },
      nodeToNodeEncryptionOptions: {
        enabled: true,
      },
      ebsOptions: {
        ebsEnabled: true,
        volumeSize: 10,
      },
      advancedSecurityOptions: {
        enabled: true,
        internalUserDatabaseEnabled: true,
        masterUserOptions: {
          masterUserName: esUserName,
          masterUserPassword: esPassword,
        },
      },
      accessPolicies: esAccessPolicy,
    });

    const clientHandler = new Function(this, "ClientHandler", {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(
        "../backend/src/AdClientAPI/.serverless/adclientapi.zip"
      ),
      handler: "handler.handler",
      role: lambdaRole,
      timeout: Duration.seconds(15),
      environment: {
        masterUserName: esUserName,
        masterUserPassword: esPassword,
        esUrl: es.attrDomainEndpoint,
      },
    });

    new CfnOutput(this, "esEndpointOutput", {
      exportName: "esEndpoint",
      value: `https://${es.attrDomainEndpoint}/_plugin/kibana`,
    });

    const clientApi = new RestApi(this, "ClientAPI", {
      restApiName: "Ads Client API",
      description: "This API allows customers to search for Ads",
    });

    const searchAdsIntegration = new LambdaIntegration(clientHandler);
    clientApi.root.addMethod("GET", searchAdsIntegration, {
      requestParameters: {
        "method.request.querystring.q": false,
      },
    });

    // PUBLISHER

    const ledger = new CfnLedger(this, "adLedger", {
      name: "adLedger",
      permissionsMode: "ALLOW_ALL",
    });

    const QldbToKinesisRole = new Role(this, "qldbToKinesisRole", {
      roleName: "QldbToKinesisRole",
      assumedBy: new ServicePrincipal("qldb.amazonaws.com"),
    });
    QldbToKinesisRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonKinesisFullAccess")
    );

    const streamKey = Alias.fromAliasName(this, "streamKey", "alias/aws/kinesis");

    const qldbStream = new Kinesis.Stream(this, "qldbStream", {
      shardCount: 1,
      encryption: StreamEncryption.KMS,
      encryptionKey: streamKey,
      streamName: "adsStream"
    });

    new CfnStream(this, "qldbStreamConfig", {
      ledgerName: "adLedger",
      streamName: qldbStream.streamName,
      roleArn: QldbToKinesisRole.roleArn,
      inclusiveStartTime: new Date().toISOString(),
      kinesisConfiguration: {
        aggregationEnabled: true,
        streamArn: qldbStream.streamArn,
      },
    });

    // LAMBDA ROLE WITH PERMISSIONS TO WRITE TO ELASTIC SEARCH
    const processorLambdaRole = new Role(this, "adstack-lambda-es-access", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      roleName: "adstack-lambda-es-access-role",
    });

    processorLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")
    );
    processorLambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonKinesisFirehoseReadOnlyAccess")
    );

    // PROCESSOR LAMBDA
    const processorHandler = new Function(this, "ProcessorHandler", {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(
        "../backend/src/StreamProcessor/.serverless/streamprocessor.zip"
      ),
      handler: "qldb-streams-es.handler",
      role: processorLambdaRole,
      timeout: Duration.minutes(3),
      environment: {
        masterUserName: esUserName,
        masterUserPassword: esPassword,
        esUrl: es.attrDomainEndpoint
      },
    });

    // S3 BUCKET
    const s3bucket = new Bucket(this, "backupBucket", {
      blockPublicAccess: {
        blockPublicPolicy: true,
        restrictPublicBuckets: true,
        blockPublicAcls: true,
        ignorePublicAcls: true
      }
    });

    // ROLE WITH PERMISSIONS TO WRITE TO S3, ACCESS KINESIS DATA STREAM
    const firehoseRole = new Role(this, "kinesisFirehoseRole", {
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
      roleName: "adstack-kinesis-firehose",
    });

    firehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
    );

    firehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")
    );

    firehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonKinesisFullAccess")
    );

    firehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonESFullAccess")
    );

    firehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess")
    );

    firehoseRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonVPCFullAccess")
    );
    
    new CfnDeliveryStream(this, "deliveryStream", {
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: qldbStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      deliveryStreamName: "AdsKinesisFirehose",
      deliveryStreamType: "KinesisStreamAsSource",
      elasticsearchDestinationConfiguration: {
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              type: "Lambda",
              parameters: [
                {
                  parameterName: "LambdaArn",
                  parameterValue: processorHandler.functionArn,
                },
              ],
            },
          ],
        },
        roleArn: firehoseRole.roleArn,
        domainArn: es.attrArn,
        indexName: "ads",
        cloudWatchLoggingOptions: {
          enabled: true,
          logGroupName: "/aws/kinesisfirehose/adsfirehose-elasticsearch",
          logStreamName: "adsfirehose-elasticsearch",
        },
        indexRotationPeriod: "NoRotation",
        s3BackupMode: "AllDocuments",
        s3Configuration: {
          bucketArn: s3bucket.bucketArn,
          roleArn: firehoseRole.roleArn,
          compressionFormat: "GZIP",
          errorOutputPrefix: "error_",
        },
      },
    });

    const publisherHandler = new Function(this, "PublisherHandler", {
      runtime: Runtime.NODEJS_12_X,
      role: lambdaRole,
      timeout: Duration.seconds(15),
      code: Code.fromAsset(
        "../backend/src/AdPublisherAPI/.serverless/adpublisherapi.zip"
      ),
      handler: "handler.handler",
      environment: {
        ledgerName: `${ledger.name}`
      }
    });

    const readerHandler = new Function(this, "ReaderHandler", {
      runtime: Runtime.NODEJS_12_X,
      role: lambdaRole,
      timeout: Duration.seconds(15),
      code: Code.fromAsset(
        "../backend/src/AdReaderAPI/.serverless/adreaderapi.zip"
      ),
      handler: "handler.handler",
      environment: {
        ledgerName: `${ledger.name}`
      }
    });

    const api = new RestApi(this, "AdsAPI", {
      restApiName: "Ads API",
      description: "This API allows users to manage Ads",
    });

    const publisherRoot = api.root.addResource("publisher");
    const publisherResource = publisherRoot.addResource("{publisher}");
    const adRoot = publisherResource.addResource("ad");
    const adOperationsResource = adRoot.addResource("{adId}");

    // POST /publisher/{publisher}/ad
    const createAdIntegration = new LambdaIntegration(publisherHandler);
    adRoot.addMethod("POST", createAdIntegration);

    // PATCH /publisher/{publisher}/ad/{adId}
    const updateAdIntegration = new LambdaIntegration(publisherHandler);
    adOperationsResource.addMethod("PATCH", updateAdIntegration);

    // DELETE /publisher/{publisher}/ad/{adId}
    const deleteAdIntegration = new LambdaIntegration(publisherHandler);
    adOperationsResource.addMethod("DELETE", deleteAdIntegration);

    // GET /publisher/{publisher}/ad/*
    const getAllIntegration = new LambdaIntegration(readerHandler);
    adRoot.addMethod("GET", getAllIntegration);

    // GET /publisher/{publisher}/ad/{adId}?versions=true
    const getAdIntegration = new LambdaIntegration(readerHandler);
    adOperationsResource.addMethod("GET", getAdIntegration, {
      requestParameters: {
        "method.request.querystring.versions": false,
      },
    });
  }
}
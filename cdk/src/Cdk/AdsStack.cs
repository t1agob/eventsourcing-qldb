using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.APIGateway;
using System.Collections.Generic;
using Amazon.CDK.AWS.QLDB;
using Amazon.CDK.AWS.IAM;

namespace Cdk
{
    public class AdsStack : Stack
    {
        internal AdsStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            Role lambdaRole = new Role(this, "adstack-lambda-qldbaccess", new RoleProps{
                AssumedBy = new ServicePrincipal("lambda.amazonaws.com"),
                RoleName = "adstack-lambda-qldbaccess-role"
            });

            lambdaRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName("AWSLambdaFullAccess"));
            lambdaRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName("AmazonQLDBFullAccess"));

            var publisherHandler = new Function(this, "PublisherHandler", new FunctionProps {
                Runtime = Runtime.DOTNET_CORE_3_1,
                Code = Code.FromAsset("../backend/src/AdPublisher/bin/Debug/netcoreapp3.1/publish"),
                Handler = "AdPublisher::AdPublisher.Function::FunctionHandler",
                Role = lambdaRole,
                Timeout = Duration.Seconds(15)
            });

            var readerHandler = new Function(this, "ReaderHandler", new FunctionProps{
                Runtime = Runtime.DOTNET_CORE_3_1,
                Code = Code.FromAsset("../backend/src/AdReader/bin/Debug/netcoreapp3.1/publish"),
                Handler = "AdReader::AdReader.Function::FunctionHandler",
                Role = lambdaRole,
                Timeout = Duration.Seconds(15)
            });
        
            var api = new RestApi(this, "AdsAPI", new RestApiProps{
                RestApiName = "Ads API",
                Description = "This API allows users to manage Ads",

            });

            var publisherRoot = api.Root.AddResource("publisher");
            var publisherResource = publisherRoot.AddResource("{publisher}");
            var adRoot = publisherResource.AddResource("ad");
            var adOperationsResource = adRoot.AddResource("{adId}");

            // POST /publisher/{publisher}/ad
            var createAdIntegration = new LambdaIntegration(publisherHandler);
            adRoot.AddMethod("POST", createAdIntegration);

            // PATCH /publisher/{publisher}/ad/{adId}
            var updateAdIntegration = new LambdaIntegration(publisherHandler);
            adOperationsResource.AddMethod("PATCH", updateAdIntegration);

            // DELETE /publisher/{publisher}/ad/{adId}
            var deleteAdIntegration = new LambdaIntegration(publisherHandler);
            adOperationsResource.AddMethod("DELETE", deleteAdIntegration);

            // GET /publisher/{publisher}/ad/*
            var getAllIntegration = new LambdaIntegration(readerHandler);
            adRoot.AddMethod("GET", getAllIntegration);

            // GET /publisher/{publisher}/ad/{adId}
            var getAdIntegration = new LambdaIntegration(readerHandler);
            adOperationsResource.AddMethod("GET", getAdIntegration);
        }
    }
}

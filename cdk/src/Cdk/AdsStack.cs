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
        
            var api = new RestApi(this, "AdsAPI", new RestApiProps{
                RestApiName = "Ads API",
                Description = "This API allows users to manage Ads",

            });

            
            // POST
            var createAdIntegration = new LambdaIntegration(publisherHandler);
            
            var postParameters = new Dictionary<string, bool>();
            postParameters.Add("method.request.querystring.publisher", true);

            api.Root.AddMethod("POST", createAdIntegration, new MethodOptions{
                RequestParameters = postParameters
            });

            // PATCH
            var updateAdIntegration = new LambdaIntegration(publisherHandler);

            var patchParameters = new Dictionary<string, bool>();
            patchParameters.Add("method.request.querystring.id", true);
            patchParameters.Add("method.request.querystring.publisher", true);

            api.Root.AddMethod("PATCH", updateAdIntegration, new MethodOptions
            {
                RequestParameters = patchParameters
            });

            // DELETE 
            var deleteAdIntegration = new LambdaIntegration(publisherHandler);

            var deleteParameters = new Dictionary<string, bool>();
            deleteParameters.Add("method.request.querystring.id", true);
            deleteParameters.Add("method.request.querystring.publisher", true);

            api.Root.AddMethod("DELETE", deleteAdIntegration, new MethodOptions{
                RequestParameters = deleteParameters
            });
        }
    }
}

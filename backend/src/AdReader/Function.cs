using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AdReader
{
    public class Function
    {
        static AmazonQLDBSessionConfig amazonQLDBSessionConfig = new AmazonQLDBSessionConfig();
        static IQldbDriver driver = QldbDriver.Builder()
            .WithQLDBSessionConfig(amazonQLDBSessionConfig)
            .WithLedger("advertisementLedger")
            .Build();

        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest input, ILambdaContext context)
        {
            //IIonValue publisherId = IonLoader.Default.Load("b6753c33");        

            //driver.Execute(txn =>
            //{
            //    IResult result = txn.Execute("SELECT * FROM Ads WHERE publisherId = ?", publisherId);

            //    foreach(var row in result)
            //    {
            //        Console.WriteLine($"id: {row.GetField("adId").StringValue}");
            //        Console.WriteLine($"title: {row.GetField("adTitle").StringValue}");
            //        Console.WriteLine($"description: {row.GetField("adDescription").StringValue}");
            //        Console.WriteLine($"price: {row.GetField("price").StringValue}{row.GetField("currency").StringValue}");
            //    }
            //});

            return new APIGatewayProxyResponse
            {
                Body = "",
                StatusCode = 200
            };
        }
    }
}

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AdClient.Models;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AdClient
{
    public class Function
    {
        string esUsername = Environment.GetEnvironmentVariable("masterUserName");
        string esPassword = Environment.GetEnvironmentVariable("masterUserPassword");
        string esUrl = Environment.GetEnvironmentVariable("esUrl");
        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest input, ILambdaContext context)
        {
            var query = input.QueryStringParameters["q"];

            Console.WriteLine("query: " + query);

            HttpClient client = new HttpClient();

            var creds = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{esUsername}:{esPassword}"));

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", creds);

            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri($"https://{esUrl}/ad/_search"),
                Content = new StringContent("{\"size\": 25, \"query\": { \"multi_match\": { \"query\": \"" + query + "\",\"fields\": [\"adTitle\",\"adDescription\",\"category\",\"tags\"]}}}", Encoding.UTF8, "application/json")
            };

            

            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();

            var doc = JsonDocument.Parse(responseBody);
            List<ESObject> results = (List<ESObject>)JsonSerializer.Deserialize(doc.RootElement.GetProperty("hits").GetProperty("hits").GetRawText(), typeof(List<ESObject>));

            List<Ad> searchResults = new List<Ad>();
            foreach (var item in results)
            {
                searchResults.Add(item._source);
            }
            

            return new APIGatewayProxyResponse
            {
                Body = JsonSerializer.Serialize(searchResults),
                StatusCode = 200
            };
        }
    }
}

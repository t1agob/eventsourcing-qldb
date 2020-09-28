using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.IonDotnet.Builders;
using Amazon.IonDotnet.Tree;
using Amazon.Lambda.Core;
using Amazon.QLDB.Driver;
using Amazon.QLDBSession;
using Amazon.Lambda.APIGatewayEvents;


// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AdPublisher
{
    public class Function
    {
        static string tableName = "Ads";
        static List<string> indexes = new List<string> { "adId", "publisherId" };
        static string adLedger = Environment.GetEnvironmentVariable("ledgerName");

        static AmazonQLDBSessionConfig amazonQLDBSessionConfig = new AmazonQLDBSessionConfig()
        {
            RetryMode = Amazon.Runtime.RequestRetryMode.Standard
        };

        static IQldbDriver driver = QldbDriver.Builder()
            .WithQLDBSessionConfig(amazonQLDBSessionConfig)
            .WithRetryLogging()
            .WithLedger(adLedger)
            .Build();

        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest input, ILambdaContext context)
        {
            if (input.HttpMethod == "POST")
            {
                checkifTableExists(tableName, indexes);
                Ad adBody = JsonSerializer.Deserialize<Ad>(input.Body);

                try
                {
                    // POPULATE PUBLISHER ID
                    adBody.PublisherId = input.PathParameters["publisher"];

                    // GENERATE NEW AD ID 
                    adBody.Id = GenerateUniqueAdId();

                    Console.WriteLine($"new Ad is: {JsonSerializer.Serialize(adBody, typeof(Ad))}");

                    driver.Execute(t =>
                    {
                        // FORCE PRICE TO BE A 2 PLACE DECIMAL
                        adBody.Price = Convert.ToDecimal(string.Format("{0:F2}", adBody.Price));

                        // INSERT AD INTO QLDB
                        var doc = IonLoader.Default.Load(JsonSerializer.Serialize(adBody, typeof(Ad)));
                        var result = t.Execute("INSERT INTO Ads ?", doc);
                    });

                    return new APIGatewayProxyResponse
                    {
                        Body = $"Ad with id '{adBody.Id}' created successfully.",
                        StatusCode = 200
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                    return new APIGatewayProxyResponse
                    {
                        Body = ex.Message,
                        StatusCode = 500
                    };
                }

            }
            else if (input.HttpMethod == "PATCH")
            {
                Ad adBody = JsonSerializer.Deserialize<Ad>(input.Body);

                try
                {
                    // POPULATE PUBLISHER ID AND AD ID
                    adBody.PublisherId = input.PathParameters["publisher"];
                    adBody.Id = input.PathParameters["adId"];


                    bool owner = false, exists = false;
                    driver.Execute(t =>
                    {
                        // CHECK IF AD BELONGS TO PUBLISHER
                        var result = t.Execute($"SELECT * FROM Ads WHERE adId = '{adBody.Id}'");

                        foreach (var row in result)
                        {
                            exists = true;

                            Console.WriteLine($"Ad '{adBody.Id}' exists");

                            if (row.GetField("publisherId").StringValue.CompareTo(adBody.PublisherId) == 0)
                            {
                                Console.WriteLine($"Valid owner. Ad '{adBody.Id}' belongs to publisher '{adBody.PublisherId}'");
                                owner = true;
                            }
                        }

                        // IF SO, UPDATE AD
                        if (owner && exists)
                        {
                            // FORCE PRICE TO BE A 2 PLACE DECIMAL
                            adBody.Price = Convert.ToDecimal(string.Format("{0:F2}", adBody.Price));

                            t.Execute($"UPDATE Ads SET adTitle = '{adBody.Title}', adDescription = '{adBody.Description}', price = {adBody.Price}, category = '{adBody.Category}', tags = '{buildTags(adBody.Tags)}' WHERE adId = '{adBody.Id}'");
                            Console.WriteLine($"Ad '{adBody.Id}' updated");
                        }
                    });

                    if (!exists)
                    {
                        return new APIGatewayProxyResponse
                        {
                            Body = $"Ad '{adBody.Id}' does not exist.",
                            StatusCode = 400
                        };
                    }

                    if (!owner)
                    {
                        return new APIGatewayProxyResponse
                        {
                            Body = $"Publisher '{adBody.PublisherId}' is not the owner of Ad '{adBody.Id}'",
                            StatusCode = 400
                        };
                    }

                    return new APIGatewayProxyResponse
                    {
                        Body = $"Ad '{adBody.Id}' updated successfully.",
                        StatusCode = 200
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine("patching error: " + ex);
                    return new APIGatewayProxyResponse
                    {
                        Body = ex.Message,
                        StatusCode = 500
                    };
                }
            }
            else if (input.HttpMethod == "DELETE")
            {
                try
                {
                    // POPULATE PUBLISHER ID AND AD ID
                    var publisher = input.PathParameters["publisher"];
                    var id = input.PathParameters["adId"];

                    bool owner = false, exists = false;
                    driver.Execute(t =>
                    {
                        // CHECK IF AD BELONGS TO PUBLISHER
                        var result = t.Execute($"SELECT * FROM Ads WHERE adId = '{id}'");

                        foreach (var row in result)
                        {
                            exists = true;

                            Console.WriteLine($"Ad '{id}' exists");

                            if (row.GetField("publisherId").StringValue.CompareTo(publisher) == 0)
                            {
                                Console.WriteLine($"Valid owner. Ad '{id}' belongs to publisher '{publisher}'");
                                owner = true;
                            }
                        }

                        // IF SO, DELETE AD
                        if (owner && exists)
                        {
                            t.Execute($"DELETE FROM Ads WHERE adId = '{id}'");
                            Console.WriteLine($"Ad '{id}' removed");
                        }
                    });

                    if (!exists)
                    {
                        return new APIGatewayProxyResponse
                        {
                            Body = $"Ad '{id}' does not exist.",
                            StatusCode = 400
                        };
                    }

                    if (!owner)
                    {
                        return new APIGatewayProxyResponse
                        {
                            Body = $"Publisher '{publisher}' is not the owner of Ad '{id}'",
                            StatusCode = 400
                        };
                    }

                    return new APIGatewayProxyResponse
                    {
                        Body = $"Ad '{id}' removed successfully.",
                        StatusCode = 200
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine("delete error: " + ex.Message);
                    return new APIGatewayProxyResponse
                    {
                        Body = ex.Message,
                        StatusCode = 500
                    };
                }
            }
            else
            {
                Console.WriteLine($"{input.HttpMethod} is a non-support operation");
                return new APIGatewayProxyResponse
                {
                    Body = $"{input.HttpMethod} operation not supported",
                    StatusCode = 500
                };
            }
        }

        private object buildTags(List<string> tags)
        {
            string result = "";

            foreach (var item in tags)
            {
                if(result == "")
                {
                    result += item;
                }
                else
                {
                    result += $", {item}";
                }
            }

            return result;
        }

        private void checkifTableExists(string tableName, List<string> indexes)
        {
            driver.Execute(t =>
            {
                try
                {
                    Console.WriteLine("Checking if table exists");
                    // CHECK IF TABLE EXISTS
                    t.Execute($"SELECT COUNT(1) FROM {tableName}");
                }
                catch(Exception)
                {
                    // CREATE TABLE AND INDEXES
                    Console.WriteLine($"Creating table {tableName}");
                    t.Execute($"CREATE TABLE {tableName}");

                    foreach (var index in indexes)
                    {
                        t.Execute($"CREATE INDEX ON {tableName}({index})");
                    }
                }
            });
        }

        private static string GenerateUniqueAdId()
        {
            return Guid.NewGuid().ToString().Substring(0, 8);
        }
    }
}

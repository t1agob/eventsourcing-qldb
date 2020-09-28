using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.QLDBSession;
using Amazon.QLDB.Driver;
using AdReader.Models;
using System.Text.Json;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AdReader
{
    public class Function
    {
        static string adLedger = Environment.GetEnvironmentVariable("ledgerName");

        static AmazonQLDBSessionConfig amazonQLDBSessionConfig = new AmazonQLDBSessionConfig();
        static IQldbDriver driver = QldbDriver.Builder()
            .WithQLDBSessionConfig(amazonQLDBSessionConfig)
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
            if (input.HttpMethod == "GET")
            {
                var publisher = input.PathParameters["publisher"];

                try //RETRIEVE SPECIFIC AD FROM PUBLISHER
                {
                    var adId = input.PathParameters["adId"];

                    try
                    {
                        if (input.QueryStringParameters["versions"] == "true")
                        {
                            List<Ad> adWithVersion = new List<Ad>();

                            driver.Execute(txn =>
                            {
                                IResult result = txn.Execute($"SELECT h.data.adId, h.data.publisherId, h.data.adTitle, h.data.category, h.data.adDescription, h.data.price, h.data.currency, h.metadata.version, h.metadata.txTime FROM history(Ads) AS h WHERE h.data.adId = '{adId}' and h.data.publisherId = '{publisher}'");

                                foreach (var row in result)
                                {
                                    Ad ad = new Ad()
                                    {
                                        Id = row.GetField("adId").StringValue,
                                        PublisherId = row.GetField("publisherId").StringValue,
                                        Title = row.GetField("adTitle").StringValue,
                                        Description = row.GetField("adDescription").StringValue,
                                        Currency = row.GetField("currency").StringValue,
                                        Category = row.GetField("category").StringValue,
                                        Price = row.GetField("price").DecimalValue,
                                        Version = row.GetField("version").IntValue,
                                        Timestamp = row.GetField("txTime").TimestampValue.ToString()
                                    };

                                    adWithVersion.Add(ad);
                                }
                            });


                            if (adWithVersion.Count == 0)
                            {
                                return new APIGatewayProxyResponse
                                {
                                    Body = "[]",
                                    StatusCode = 200
                                };
                            }
                            else
                            {
                                return new APIGatewayProxyResponse
                                {
                                    Body = JsonSerializer.Serialize(adWithVersion, typeof(List<Ad>)),
                                    StatusCode = 200
                                };
                            }
                        }
                        else
                        {
                            Ad ad = new Ad();

                            driver.Execute(txn =>
                            {
                                IResult result = txn.Execute($"SELECT * FROM Ads WHERE publisherId = '{publisher}' and adId = '{adId}'");


                                foreach (var row in result)
                                {
                                    ad.Id = row.GetField("adId").StringValue;
                                    ad.PublisherId = row.GetField("publisherId").StringValue;
                                    ad.Title = row.GetField("adTitle").StringValue;
                                    ad.Category = row.GetField("category").StringValue;
                                    ad.Description = row.GetField("adDescription").StringValue;
                                    ad.Currency = row.GetField("currency").StringValue;
                                    ad.Price = row.GetField("price").DecimalValue;
                                }
                            });

                            if (string.IsNullOrEmpty(ad.Id))
                            {
                                return new APIGatewayProxyResponse
                                {
                                    Body = "",
                                    StatusCode = 200
                                };
                            }
                            else
                            {
                                return new APIGatewayProxyResponse
                                {
                                    Body = JsonSerializer.Serialize(ad, typeof(Ad)),
                                    StatusCode = 200
                                };
                            }
                        }
                    }
                    catch (NullReferenceException)
                    {
                        Ad ad = new Ad();

                        driver.Execute(txn =>
                        {
                            IResult result = txn.Execute($"SELECT * FROM Ads WHERE publisherId = '{publisher}' and adId = '{adId}'");


                            foreach (var row in result)
                            {
                                ad.Id = row.GetField("adId").StringValue;
                                ad.PublisherId = row.GetField("publisherId").StringValue;
                                ad.Title = row.GetField("adTitle").StringValue;
                                ad.Category = row.GetField("category").StringValue;
                                ad.Description = row.GetField("adDescription").StringValue;
                                ad.Currency = row.GetField("currency").StringValue;
                                ad.Price = row.GetField("price").DecimalValue;
                            }
                        });

                        if (string.IsNullOrEmpty(ad.Id))
                        {
                            return new APIGatewayProxyResponse
                            {
                                Body = "",
                                StatusCode = 200
                            };
                        }
                        else
                        {
                            return new APIGatewayProxyResponse
                            {
                                Body = JsonSerializer.Serialize(ad, typeof(Ad)),
                                StatusCode = 200
                            };
                        }
                    }

                }
                catch (KeyNotFoundException) // RETRIEVE ALL ADS FROM PUBLISHER
                {
                    List<Ad> adList = new List<Ad>();

                    driver.Execute(txn =>
                    {
                        IResult result = txn.Execute($"SELECT * FROM Ads WHERE publisherId = '{publisher}'");

                        foreach (var row in result)
                        {
                            Ad ad = new Ad()
                            {
                                Id = row.GetField("adId").StringValue,
                                PublisherId = row.GetField("publisherId").StringValue,
                                Title = row.GetField("adTitle").StringValue,
                                Category = row.GetField("category").StringValue,
                                Description = row.GetField("adDescription").StringValue,
                                Currency = row.GetField("currency").StringValue,
                                Price = row.GetField("price").DecimalValue
                            };

                            adList.Add(ad);

                        }
                    });


                    if (adList.Count == 0)
                    {
                        return new APIGatewayProxyResponse
                        {
                            Body = "[]",
                            StatusCode = 200
                        };
                    }
                    else
                    {
                        return new APIGatewayProxyResponse
                        {
                            Body = JsonSerializer.Serialize(adList, typeof(List<Ad>)),
                            StatusCode = 200
                        };
                    }
                }
            }
            else
            {
                return new APIGatewayProxyResponse
                {
                    Body = $"{input.HttpMethod} is not a supported operation.",
                    StatusCode = 400
                };
            }


        }
    }
}

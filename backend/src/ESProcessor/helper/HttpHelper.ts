import * as AWS from 'aws-sdk';
import * as path from 'path';

const REGION = process.env.AWS_REGION;
const ELASTICSEARCH_DOMAIN =
    process.env.esUrl;
const esUserName = process.env.masterUserName;
const esPassword = process.env.masterUserPassword;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);

// @ts-ignore
const httpClient = new AWS.HttpClient();

const sendRequest = async (httpMethod: string, requestPath: string, payload?) => {
    console.log(
        `In sendRequest with method ${httpMethod} path ${requestPath} and payload ${payload}`
    );

    const request = new AWS.HttpRequest(endpoint, REGION);

    request.method = httpMethod;
    request.path = path.join(request.path, requestPath);
    request.body = JSON.stringify(payload);
    request.headers["Content-Type"] = "application/json";
    request.headers["Authorization"] =
        "Basic " + Buffer.from(`${esUserName}:${esPassword}`).toString("base64");
    request.headers.Host = ELASTICSEARCH_DOMAIN;

    return new Promise((resolve, reject) => {
        httpClient.handleRequest(
            request,
            null,
            (response) => {
                const { statusCode, statusMessage, headers } = response;
                console.log(
                    `statusCode ${statusCode} statusMessage ${statusMessage} headers ${headers}`
                );

                let body = "";
                response.on("data", (chunk) => {
                    body += chunk;
                });
                response.on("end", () => {
                    const data = {
                        statusCode,
                        statusMessage,
                        headers,
                        body,
                    };
                    if (body) {
                        data.body = JSON.parse(body);
                    }
                    resolve(data);
                });
            },
            (err) => {
                console.log(`Error inserting into ES: ${err}`);
                reject(err);
            }
        );
    });
}

export default sendRequest;
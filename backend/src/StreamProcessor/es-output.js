const AWS = require("aws-sdk");
const path = require("path");

const REGION = process.env.AWS_REGION;
const ELASTICSEARCH_DOMAIN =
    process.env.esUrl;
const esUserName = process.env.masterUserName;
const esPassword = process.env.masterUserPassword;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);
const httpClient = new AWS.HttpClient();
const creds = new AWS.EnvironmentCredentials("AWS");

async function sendRequest({ httpMethod, requestPath, payload }) {
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

  // const signer = new AWS.Signers.V4(request, 'es');
  // signer.addAuthorization(creds, new Date());

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

module.exports.sendRequest = sendRequest;

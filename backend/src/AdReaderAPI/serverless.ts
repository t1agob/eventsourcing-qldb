import type { Serverless } from 'serverless/aws';

const serverlessConfiguration: Serverless = {
  service: {
    name: 'adreaderapi',
    // app and org for use with dashboard.serverless.com
    // app: your-app-name,
    // org: your-org-name,
  },
  configValidationMode: 'warn',
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    }
  },
  // Add the serverless-webpack plugin
  plugins: ['serverless-webpack'],
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    region: "eu-west-1",
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    },
  },
  functions: {
    hello: {
      handler: 'handler.handler',
      environment: {
        ledgerName: "adLedger"
      },
      role: "arn:aws:iam::414275540131:role/adstack-lambda-qldbaccess-role" ,
      events: [
        {
          http: {
            method: 'get',
            path: '{publisher}/ad/{adId}',
            request: {
              parameters: {
                querystrings: {
                  versions: false
                }
              }
            }
          }
        }
      ]
    }
  }
}

module.exports = serverlessConfiguration;

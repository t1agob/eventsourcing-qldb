# Event Sourcing using AWS QLDB
This is an example implementation of the Event Sourcing pattern using QLDB. In order to make this as close as possible to a real world scenario we choose a **Classified Ads** use case.

As such, the focus of this example were the backend services that will provide the APIs for both Publishers and Clients. 

#### Publishers
Publishers are registered users that are allowed to manage Ads. Each publisher has its own PublisherId. 

> Generating PublisherIds is not part of the example. Any PublisherId will work.

#### Clients 
Clients are any user that will search for Ads through the API or frontend.

> For this example we have not created any frontend.

## Architecture
The below architecture represents all the components used in setting up this example. We want to use QLDB as our single source of truth but still integrate with other platforms and datastores that fit each scenario (*ex: ElasticSearch for Client APIs or EventBridge for integration across AWS Accounts*).

![architecture](images/architecture.png)

> **Amazon EventBridge integration is still work in progress**

#### Publishers
- **API Gateway** exposes all API operations to Ad Publishers.
- **Lambda Functions** implements all the operations possible to Ad Publishers such as:
  - Create Ad
  - Update Ad
  - Delete Ad
  - Get All Ads for specific Publisher
  - Get specific Ad
  - Get specific Ad with versions 
- **Amazon Kinesis Data Streams** and **Firehose** to deliver every event to other components:
  - **S3** for long term backups
  - **Elastic Search** for Client API search operations
  - **Amazon EventBridge** for integration across AWS Accounts or Integration Partners

#### Clients
- **API Gateway** exposes all API operations to Ad Clients.
- **Lambda Functions** implements all search operation to query Ads on Elastic Search

## Requirements
- Visual Studio Code ([install](https://code.visualstudio.com/download))
- AWS Toolkit for Visual Studio Code ([install](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/setup-toolkit.html))
- Node.js ([install](https://nodejs.org/en/download/))
- Serverless Framework ([install](https://www.serverless.com/framework/docs/providers/aws/guide/installation/))
  

  
## How to deploy
Every single component of this infrastructure is automatically deploy by using [AWS CDK](https://aws.amazon.com/cdk/). To deploy follow this steps:

1. **Clone the project**

```bash
$ mkdir projects && cd projects
$ git clone https://github.com/t1agob/eventsourcing-qldb.git eventsourcing-qldb
```

2. **Open the project in Visual Studio Code**
   
    ```bash
    $ cd eventsourcing-qldb
    $ code .
    ```

3. **Navigate to cdk folder and install dependencies**
   
    ```bash
    $ cd cdk
    $ npm install
    ```

4. **Update master username and password for ElasticSearch**

    On lines 19 and 20 you may find the master username and password that are going to be used as the credentials to access ElasticSearch service. You may want to use your own credentials so you should update the values here.

    > ElasticSearch enforces that the password contains one uppercase letter, one lowercase letter, one number and a special character. 


    ![updateCredentials](images/updateCredentials.png)

5. **Deploy with CDK**

    ```bash
    $ cdk deploy
    ```

    The full deployment takes around 15min to complete since this is a complex infrastructure but once deployed everything should be working right away.


## How to use
Since we just created the APIs for the services we don't have a UI that allows us to test the scenario so it needs to be done by calling the APIs directly. For that you can use cURL, Postman or any other tool you prefer - I will use cURL for simplicity.

> **Make sure to replace placeholders in the Url.**

#### Create Ad

```json
curl --location --request POST '[API ENDPOINT]/publisher/[PUBLISHER ID]/ad' \
--header 'Content-Type: application/json' \
--data-raw '{
  "adTitle": "awesome title",
  "adDescription": "awesome description",
  "price": 10,
  "currency": "€",
  "category": "awesome category",
  "tags": [
      "awesome",
      "category"
  ]
}'
```

#### Update Ad

```json
curl --location --request PATCH '[API ENDPOINT]/publisher/[PUBLISHER ID]/ad/[AD ID]' \
--header 'Content-Type: application/json' \
--data-raw '{
  "adTitle": "awesome title",
  "adDescription": "awesome description",
  "price": 150,
  "currency": "€",
  "category": "awesome category",
  "tags": [
      "awesome",
      "category"
  ]
}'
```

#### Delete Ad

```json 
curl --location --request DELETE '[API ENDPOINT]/publisher/[PUBLISHER ID]/ad/[AD ID]'
```

#### Get All Ads for specific Publisher

```json
curl --location --request GET '[API ENDPOINT]/publisher/[PUBLISHER ID]/ad'
```

#### Get specific Ad

```json
curl --location --request GET '[API ENDPOINT]/publisher/[PUBLISHER ID]/ad/[AD ID]'
```

#### Get specific Ad with versions

```json
curl --location --request GET '[API ENDPOINT]/publisher/[PUBLISHER ID]/ad/[AD ID]?versions=true'
```

#### Search Ads on ElasticSearch

```json
curl --location --request GET '[API ENDPOINT]/?q=[QUERY]'
```

# Work in progress
- [ ] Integration with EventBridge


## Contributions are welcome!

If you feel that there is space for improvement in this project or if you find a bug please raise an issue or submit a PR.
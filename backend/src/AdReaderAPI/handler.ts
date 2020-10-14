import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { QldbDriver, TransactionExecutor } from 'amazon-qldb-driver-nodejs';
import Ad from './model/ESObject';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';

const dynamoTableName = process.env.tableName;
const dynamodb = new DynamoDB.DocumentClient();

console.log(`DynamoDB Table Name: ${dynamoTableName}`);

const tableName = "Ads";
const indexes = ["adId"];

const adLedger = process.env.ledgerName;

const serviceConfigurationOptions = {
  region: process.env.AWS_REGION
};

const driver: QldbDriver = new QldbDriver(adLedger, serviceConfigurationOptions);

let tableExists = false;

export const handler: APIGatewayProxyHandler = async (event, _context) => {

  if (event.httpMethod == "GET") {
    const publisher = event.pathParameters["publisher"];
    const adId = event.pathParameters["adId"];


    if (adId != undefined) {
      console.log(`Got the followin AdId: ${adId}`);

      if (event.queryStringParameters != null && event.queryStringParameters["versions"] != undefined) {
        if (event.queryStringParameters["versions"] == "false") {

          try {
            const ad = await getDynamoAd(adId, publisher);

            return {
              statusCode: 200,
              body: JSON.stringify(ad)
            };
          }
          catch (e) {
            console.error(e);

            return {
              statusCode: 500,
              body: e
            };
          }

        }
        else { // RETURN ALL VERSIONS OF AD
          try {
            if (!tableExists) {
              await ensureTable();
            }

            const documentId = await getDynamoAdId(adId, publisher);
            console.log(`querying history for documentID: ${documentId}`);

            const query = "SELECT h.data.adId, h.data.publisherId, h.data.adTitle, h.data.category, h.data.adDescription, h.data.price, h.data.currency, h.data.tags, h.metadata.version, h.metadata.txTime FROM history(Ads) AS h WHERE h.metadata.id = ?";

            const adList = await getAdList(query, true, documentId);

            if (adList.length == 0) {
              return {
                statusCode: 200,
                body: "[]"
              };
            }
            else {
              return {
                statusCode: 200,
                body: JSON.stringify(adList)
              };
            }
          }
          catch (e) {
            console.error(e);
          }
        }
      }
      else { // RETURN LATEST VERSION OF AD
        try {
          const ad = await getDynamoAd(adId, publisher);

          return {
            statusCode: 200,
            body: JSON.stringify(ad)
          };
        }
        catch (e) {
          console.error(e);

          return {
            statusCode: 500,
            body: e
          };
        }
      }

    }
    else { // RETRIEVE ALL ADS FROM PUBLISHER
      console.log(`retrieving all ads from publisher ${publisher}`);

      try {
        const adList = await getDynamoAdList(publisher);

        if (adList.length == 0) {
          return {
            statusCode: 200,
            body: "[]"
          };
        }
        else {
          return {
            statusCode: 200,
            body: JSON.stringify(adList)
          };
        }
      }
      catch (e) {
        console.error(e);
      }
    }
  }
  else {
    return {
      statusCode: 400,
      body: `${event.httpMethod} is not a supported operation.`
    }
  }
}

async function getAdList(query: string, versions: boolean, ...args: any[]): Promise<Array<Ad>> {
  let adList: Array<Ad> = new Array<Ad>();

  await driver.executeLambda(async (txn) => {
    return txn.execute(query, ...args);
  }).then((result) => {
    let ad: Ad;
    const resultList = result.getResultList();

    resultList.forEach(element => {
      ad = new Ad();
      ad.adId = element.get("adId");
      ad.publisherId = element.get("publisherId");
      ad.adTitle = element.get("adTitle");
      ad.category = element.get("category");
      ad.adDescription = element.get("adDescription");
      ad.currency = element.get("currency");
      ad.price = element.get("price");
      ad.tags = element.get("tags");

      if (versions) {
        ad.version = element.get("version");
        ad.timestamp = element.get("txTime");
      }

      adList.push(ad);
    });
  });

  return adList;
}

async function getDynamoAd(adId: string, publisherId: string): Promise<Ad>{
  var params = {
    TableName: dynamoTableName,
    IndexName: 'publisherId-adId-index',
    KeyConditionExpression: 'publisherId = :publisherId and adId = :adId',
    ExpressionAttributeValues: {
      ':publisherId': publisherId,
      ':adId': adId
    }
  };

  let queryResult;

  await dynamodb.query(params, (err, data) => {
    const rs: Ad = new Ad();
    
    if (err) {
      console.error(err);
      return {
        statusCode: 500,
        body: err.message
      };
    }
    else {
      if (data.Items.length > 0) {
        const dataItem = data.Items[0];

        rs.adId = dataItem.adId;
        rs.publisherId = dataItem.publisherId;
        rs.adTitle = dataItem.adTitle;
        rs.adDescription = dataItem.adDescription;
        rs.category = dataItem.category;
        rs.currency = dataItem.currency;
        rs.price = dataItem.price;
        rs.tags = dataItem.tags;

        queryResult = rs;
      }
    }
  }).promise();

  console.log(`result: ${queryResult}`);
  return queryResult;
}

async function getDynamoAdId(adId: string, publisherId: string): Promise<string> {
  var params = {
    TableName: dynamoTableName,
    IndexName: 'publisherId-adId-index',
    KeyConditionExpression: 'publisherId = :publisherId and adId = :adId',
    ExpressionAttributeValues: {
      ':publisherId': publisherId,
      ':adId': adId
    }
  };

  let queryResult;

  await dynamodb.query(params, (err, data) => {
    if (err) {
      console.error(err);
      return {
        statusCode: 500,
        body: err.message
      };
    }
    else {
      if (data.Items.length > 0) {
        const dataItem = data.Items[0];

        queryResult = dataItem.id;
      }
    }
  }).promise();

  return queryResult;
}

async function getDynamoAdList(publisherId: string): Promise<Array<Ad>> {
  let adList: Array<Ad> = new Array<Ad>();
  
  var params = {
    TableName: dynamoTableName,
    IndexName: 'publisherId-adId-index',
    KeyConditionExpression: 'publisherId = :publisherId',
    ExpressionAttributeValues: {
      ':publisherId': publisherId
    }
  };

  await dynamodb.query(params, (err, data) => {
    if (err) {
      console.error(err);
      return {
        statusCode: 500,
        body: err.message
      };
    }
    else {
      let ad: Ad;

      data.Items.forEach(dataItem => {
        ad = new Ad();

        ad.adId = dataItem.adId;
        ad.publisherId = dataItem.publisherId;
        ad.adTitle = dataItem.adTitle;
        ad.adDescription = dataItem.adDescription;
        ad.category = dataItem.category;
        ad.currency = dataItem.currency;
        ad.price = dataItem.price;
        ad.tags = dataItem.tags;

        adList.push(ad);
      });
    }
  }).promise();

  return adList;
}

async function ensureTable() {
  try {
    const tables = await driver.getTableNames();

    let exists = false;
    tables.forEach(table => {
      if (table == tableName) {
        exists = true;
        tableExists = true;
      }
    });

    if (!exists) {
      await createTableandIndexes();
    }

  } catch (e) {
    console.error(e);

    await createTableandIndexes();
  }
}

async function createTableandIndexes() {
  console.log(`Table ${tableName} does not exist. Creating...`);

  await driver.executeLambda(async (txn: TransactionExecutor) => {
    await txn.execute(`CREATE TABLE ${tableName}`);

    console.log("Creating indexes...");
    indexes.forEach(async index => {
      await txn.execute(`CREATE INDEX on ${tableName}(${index})`);
    });
  });

  tableExists = true;
}

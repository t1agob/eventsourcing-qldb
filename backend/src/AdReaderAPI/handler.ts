import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { QldbDriver, TransactionExecutor } from 'amazon-qldb-driver-nodejs';
import Ad from './model/ESObject';

const tableName = "Ads";
const indexes = ["adId", "publisherId"];

const adLedger = process.env.ledgerName;

const serviceConfigurationOptions = {
  region: process.env.AWS_REGION
};

const driver: QldbDriver = new QldbDriver(adLedger, serviceConfigurationOptions);

let tableExists = false;

export const handler: APIGatewayProxyHandler = async (event, _context) => {

  if (event.httpMethod == "GET") {
    if(!tableExists){
      await ensureTable();
    }
    
    const publisher = event.pathParameters["publisher"];
    const adId = event.pathParameters["adId"];


    if (adId != undefined) {
      console.log(`Got the followin AdId: ${adId}`);

      if (event.queryStringParameters != null && event.queryStringParameters["versions"] != undefined) {
        if (event.queryStringParameters["versions"] == "false") {

          try {
            const query = "SELECT * FROM Ads WHERE publisherId = ? and adId = ?";

            const ad = await getAd(query, publisher, adId);

            return {
              statusCode: 200,
              body: JSON.stringify(ad)
            };

          }
          catch (e) {
            console.error(e);
          }

        }
        else { // RETURN ALL VERSIONS OF AD
          try {
            const query = "SELECT h.data.adId, h.data.publisherId, h.data.adTitle, h.data.category, h.data.adDescription, h.data.price, h.data.currency, h.data.tags, h.metadata.version, h.metadata.txTime FROM history(Ads) AS h WHERE h.data.adId = ? and h.data.publisherId = ?";

            const adList = await getAdList(query, true, adId, publisher);

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
          const query = "SELECT * FROM Ads WHERE publisherId = ? and adId = ?";

          const ad = await getAd(query, publisher, adId);

          return {
            statusCode: 200,
            body: JSON.stringify(ad)
          };

        }
        catch (e) {
          console.error(e);
        }
      }

    }
    else { // RETRIEVE ALL ADS FROM PUBLISHER
      console.log(`retrieving all ads from publisher ${publisher}`);

      try {
        const query = "SELECT * FROM Ads WHERE publisherId = ?";
        const adList = await getAdList(query, false, publisher);

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

async function getAd(query: string, ...args: any[]): Promise<Ad> {
  let ad: Ad = new Ad();

  await driver.executeLambda(async (txn) => {
    return txn.execute(query, ...args);
  }).then((result) => {

    const resultList = result.getResultList();

    resultList.forEach(element => {
      ad.adId = element.get("adId");
      ad.publisherId = element.get("publisherId");
      ad.adTitle = element.get("adTitle");
      ad.category = element.get("category");
      ad.adDescription = element.get("adDescription");
      ad.currency = element.get("currency");
      ad.price = element.get("price");
      ad.tags = element.get("tags");
    });
  });

  return ad;
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

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

  if (event.httpMethod == "POST") {
    try {
      if (!tableExists) {
        await ensureTable();
      }

      let adBody: Ad = JSON.parse(event.body);

      if (event.pathParameters["publisher"] == undefined) {
        return {
          statusCode: 400,
          body: "You need to specify publisherId"
        };
      }

      adBody.publisherId = event.pathParameters["publisher"];
      adBody.adId = generateUniqueAdId();

      await driver.executeLambda(async txn => {
        txn.execute(`INSERT INTO ${tableName} ?`, adBody);
      });

      return {
        statusCode: 200,
        body: `Ad with id ${adBody.adId} created successfuly.`
      };

    } catch (e) {
      console.error(e);

      return {
        statusCode: 500,
        body: `Unable to create Ad: ${e}`
      };
    }
  }
  else if (event.httpMethod == "PATCH") {
    try {
      if (!tableExists) {
        await ensureTable();
      }

      let adBody: Ad = JSON.parse(event.body);

      if (event.pathParameters["publisher"] == undefined) {
        return {
          statusCode: 400,
          body: "You need to specify publisherId"
        };
      }

      if (event.pathParameters["adId"] == undefined) {
        return {
          statusCode: 400,
          body: "You need to specify adId"
        };
      }

      adBody.publisherId = event.pathParameters["publisher"];
      adBody.adId = event.pathParameters["adId"];

      const [exists, owner] = await ensureOwner(adBody.publisherId, adBody.adId);

      if (owner && exists) {
        await driver.executeLambda(async txn => {
          await txn.execute("UPDATE Ads SET adTitle = ?, adDescription = ?, price = ?, category = ?, tags = ? WHERE adId = ?", adBody.adTitle, adBody.adDescription, adBody.price, adBody.category, adBody.tags, adBody.adId);
          console.log(`Ad ${adBody.adId} updated.`);
        });
      }

      if (!exists) {
        return {
          statusCode: 400,
          body: `Ad ${adBody.adId} does not exist`
        };
      }

      if (!owner) {
        return {
          statusCode: 400,
          body: `Publisher ${adBody.publisherId} is not the owner of Ad ${adBody.adId}`
        };
      }

      return {
        statusCode: 200,
        body: `Ad ${adBody.adId} updated successfuly.`
      };

    } catch (e) {
      console.error(`patching error: ${e}`);
      return {
        statusCode: 500,
        body: e
      };
    }
  }
  else if (event.httpMethod == "DELETE") {
    try {
      if (!tableExists) {
        await ensureTable();
      }

      if (event.pathParameters["publisher"] == undefined) {
        return {
          statusCode: 400,
          body: "You need to specify publisherId"
        };
      }

      if (event.pathParameters["adId"] == undefined) {
        return {
          statusCode: 400,
          body: "You need to specify adId"
        };
      }

      const publisherId = event.pathParameters["publisher"];
      const adId = event.pathParameters["adId"];

      const [exists, owner] = await ensureOwner(publisherId, adId);

      if (owner && exists) {
        await driver.executeLambda(async txn => {
          await txn.execute("DELETE FROM Ads WHERE adId = ?", adId);
          console.log(`Ad ${adId} updated.`);
        });
      }

      if (!exists) {
        return {
          statusCode: 400,
          body: `Ad ${adId} does not exist`
        };
      }

      if (!owner) {
        return {
          statusCode: 400,
          body: `Publisher ${publisherId} is not the owner of Ad ${adId}`
        };
      }

      return {
        statusCode: 200,
        body: `Ad ${adId} removed successfuly.`
      };

    } catch (e) {
      console.error(`delete error: ${e}`);
      return {
        statusCode: 500,
        body: e
      };
    }
  }
  else {
    console.log(`${event.httpMethod} operation is not supported.`);
    return {
      statusCode: 400,
      body: `${event.httpMethod} operation is not supported.`
    };
  }
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

async function ensureOwner(publisher: string, id: string) {

  let exists = false;
  let owner = false;

  await driver.executeLambda(async txn => {
    const result = await txn.execute("SELECT * FROM Ads WHERE adId = ?", id);

    result.getResultList().forEach(element => {
      exists = true;

      console.log(`Ad ${id} exists.`);

      if (element.get("publisherId").stringValue() == publisher) {
        console.log(`Valid owner. Ad ${id} belongs to publisher ${publisher}`);
        owner = true;
      }
    });
  });
  return [exists, owner];
}



function generateUniqueAdId(): string {
  return Math.random().toString(36).substr(2, 9);
}


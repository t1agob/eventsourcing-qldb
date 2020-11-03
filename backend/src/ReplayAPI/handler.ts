import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { QldbDriver } from 'amazon-qldb-driver-nodejs';
import Ad from "./model/Ad";
import { createOrUpdateAd } from './helper/dynamodbHelper';


const serviceConfigurationOptions = {
  region: process.env.AWS_REGION
};

const adLedger = "adLedger";// process.env.ledgerName;
const driver: QldbDriver = new QldbDriver(adLedger, serviceConfigurationOptions);

export const handler: APIGatewayProxyHandler = async (event, _context) => {

  try {
    if (event.httpMethod == "GET") {

      let startDateTime, endDateTime;

      const id = event.pathParameters["id"];
      if (id != null && id != undefined) { // replay for specific ID - use query history
        if (event.queryStringParameters != null) {
          startDateTime = event.queryStringParameters["startDateTime"];
          endDateTime = event.queryStringParameters["endDateTime"];
        }

        var baseQuery = `SELECT h.data, h.metadata.id, h.metadata.version FROM history(Ads) AS h WHERE h.metadata.id = '${id}'`;

        if (startDateTime != undefined) {
          baseQuery = `${baseQuery} and h.metadata.txTime >= \`${startDateTime}\``;
        }

        if (endDateTime != undefined) {
          baseQuery = `${baseQuery} and h.metadata.txTime <= \`${endDateTime}\``;
        }

        // await deleteAd(id);

        const adList: Array<Ad> = new Array<Ad>();
        await driver.executeLambda(async (txn) => {
          console.log(`running: ${baseQuery}`);

          return txn.execute(baseQuery);
        }).then((result) => {

          let ad: Ad;
          const resultList = result.getResultList();

          resultList.forEach(element => {
            ad = new Ad();
            ad.id = id;
            ad.adId = element.data.get("adId").stringValue();
            ad.publisherId = element.data.get("publisherId").stringValue();
            ad.adTitle = element.data.get("adTitle").stringValue();
            ad.category = element.data.get("category").stringValue();
            ad.adDescription = element.data.get("adDescription").stringValue();
            ad.currency = element.data.get("currency").stringValue();
            ad.price = element.data.get("price").numberValue();
            ad.tags = element.data.get("tags").toString();
            ad.version = element.version.numberValue();

            console.log(ad);

            adList.push(ad);
          });
        });

        for (const [idx, ad] of adList.entries()){
          await createOrUpdateAd(ad.id, ad.version, ad).then(() => {
            console.log(`replayed version ${ad.version} of ad '${ad.id}'`);
          });
        }


        return {
          statusCode: 200,
          body: JSON.stringify(adList),
        };
      }
      else { // replay for all ids - use streams
        if (event.queryStringParameters != null) {
          startDateTime = event.queryStringParameters["startDateTime"];
          endDateTime = event.queryStringParameters["endDateTime"];
        }
        else {

        }


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
  catch (err) {
    console.error(err.message);

    return {
      statusCode: 500,
      body: err.message
    }
  }
}


// @ts-nocheck
import * as deagg from 'aws-kinesis-agg';
import * as ion from 'ion-js';
import { deleteAd, createOrUpdateAd } from './helper/ElasticSearchHelper';

import 'source-map-support/register';
import ESAd from './model/ESAd';

const promiseDeaggregate = async (record) => new Promise((resolve, reject) => {
  deagg.deaggregateSync(record, true, (err, responseObject) => {
    if (err) {
      return reject(err);
    }

    return resolve(responseObject);
  })
});

const processIon = async (ionRecord) => {
  const version = ionRecord.payload.revision.metadata.version.numberValue();
  const id = ionRecord.payload.revision.metadata.id.stringValue();

  console.log(`Version ${version} and id ${id}`);

  if (ionRecord.payload.revision.data == null) {
    console.log("No data section, it will be handled as a delete.");

    await deleteAd(id, version);
  }
  else {
    const adId = ionRecord.payload.revision.data.adId.stringValue();
    const publisherId = ionRecord.payload.revision.data.publisherId.stringValue();
    const adTitle = ionRecord.payload.revision.data.adTitle.stringValue();
    const adDescription = ionRecord.payload.revision.data.adDescription.stringValue();
    const price = ionRecord.payload.revision.data.price.numberValue();
    const currency = ionRecord.payload.revision.data.currency.stringValue();
    const category = ionRecord.payload.revision.data.category.stringValue();
    const tags = ionRecord.payload.revision.data.tags.toString();

    console.log(
      `adId: ${adId}, publisherId: ${publisherId}, adTitle: ${adTitle}, adDescription: ${adDescription}, price: ${price}, currency: ${currency}, category: ${category}, tags: ${tags}`
    );

    const ad: ESAd = new ESAd();
    ad.adId = adId;
    ad.publisherId = publisherId;
    ad.adTitle = adTitle;
    ad.adDescription = adDescription;
    ad.price = price;
    ad.currency = currency;
    ad.category = category;
    ad.tags = tags;

    await createOrUpdateAd(id, version, ad);
  }
};

const processRecords = async (records) => {
  await Promise.all(
    records.map(async (record) => {
      const payload = Buffer.from(record.data, 'base64');

      const ionRecord = ion.load(payload);

      console.log(`ionRecord: ${ionRecord}`);

      // Only process records where the record type is REVISION_DETAILS
      if (ionRecord.recordType.stringValue() !== "REVISION_DETAILS") {
        console.log(`Skipping record of type ${ion.dumpPrettyText(ionRecord.recordType)}`);
      } else {
        console.log(`Ion Record: ${ion.dumpPrettyText(ionRecord.payload)}`);
        await processIon(ionRecord);
      }
    }),
  );
};


export const handler = async (event, context) => {

  console.log(`In ${context.functionName} processing ${event.Records.length} Kinesis Input Records`);

  await Promise.all(
    event.Records.map(async (element) => {
      console.log(element);
      const records = await promiseDeaggregate(element.kinesis);
      await processRecords(records);
    }));
}

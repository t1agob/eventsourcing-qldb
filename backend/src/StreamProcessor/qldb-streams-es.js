const deagg = require("aws-kinesis-agg");
const ion = require("ion-js");
const { sendRequest } = require("./es-output");

const computeChecksums = true;
const REVISION_DETAILS = "REVISION_DETAILS";

const promiseDeaggregate = (record) =>
  new Promise((resolve, reject) => {
    deagg.deaggregateSync(record, computeChecksums, (err, responseObject) => {
      if (err) {
        return reject(err);
      }

      return resolve(responseObject);
    });
  });

async function processIon(ionRecord) {
  const version = ionRecord.payload.revision.metadata.version.numberValue();
  const id = ionRecord.payload.revision.metadata.id.stringValue();
  let response;

  // Check to see if the data section exists.
  if (ionRecord.payload.revision.data == null) {
    console.log("No data section so handle as a delete");
    response = await sendRequest({
      httpMethod: "DELETE",
      requestPath: `/ad/_doc/${id}?version=${version}&version_type=external`,
    });
    console.log(`RESPONSE: ${JSON.stringify(response)}`);
  } else {
    const adId = ionRecord.payload.revision.data.adId.stringValue();
    const publisherId = ionRecord.payload.revision.data.publisherId.stringValue();
    const adTitle = ionRecord.payload.revision.data.adTitle.stringValue();
    const adDescription = ionRecord.payload.revision.data.adDescription.stringValue();
    const price = ionRecord.payload.revision.data.price.decimalValue();
    const currency = ionRecord.payload.revision.data.currency.stringValue();
    const category = ionRecord.payload.revision.data.category.stringValue();
    const tags = ionRecord.payload.revision.data.tags.toString();

    console.log(
      `adId: ${adId}, publisherId: ${publisherId}, adTitle: ${adTitle}, adDescription: ${adDescription}, price: ${price}, currency: ${currency}, category: ${category}, tags: ${tags}}`
    );

    const doc = {
      adId: adId,
      publisherId: publisherId,
      adTitle: adTitle,
      adDescription: adDescription,
      price: price,
      currency: currency,
      category: category,
      tags: tags 
    };

    response = await sendRequest({
      httpMethod: "PUT",
      requestPath: `/ad/_doc/${id}?version=${version}&version_type=external`,
      payload: doc,
    });
    console.log(`RESPONSE: ${JSON.stringify(response)}`);
  }
}

/**
 * Processes each deaggregated Kinesis record in order. The function
 * ignores all records apart from those of typee REVISION_DETAILS
 * @param records The deaggregated Kinesis records to be processed
 */
async function processRecords(records) {
  await Promise.all(
    records.map(async (record) => {
      // Kinesis data is base64 encoded so decode here
      const payload = Buffer.from(record.data, "base64");

      // payload is the actual ion binary record published by QLDB to the stream
      const ionRecord = ion.load(payload);
      console.log(`payload: ${ion.dumpPrettyText(ionRecord.payload)}`);

      // Only process records where the record type is REVISION_DETAILS
      if (ionRecord.recordType.stringValue() !== REVISION_DETAILS) {
        console.log(
          `Skipping record of type ${ion.dumpPrettyText(ionRecord.recordType)}`
        );
      } else {
        console.log(`Ion Record: ${ion.dumpPrettyText(ionRecord.payload)}`);
        await processIon(ionRecord);
      }
    })
  );
}

module.exports.handler = async (event, context) => {
  console.log(`** PRINT MSG: ${JSON.stringify(event, null, 2)}`);
  console.log(
    `In ${context.functionName} processing  ${event.records.length} Kinesis Input Records`
  );

  await Promise.all(
    event.records.map(async (kinesisRecord) => {
      const records = await promiseDeaggregate(kinesisRecord);
      await processRecords(records);
    })
  );

  console.log("Finished processing in qldb-stream handler");
};

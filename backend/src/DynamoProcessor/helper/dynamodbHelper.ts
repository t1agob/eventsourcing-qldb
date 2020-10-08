import DynamoAd from '../model/DynamoAd';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';

const tableName = process.env.tableName;
const dynamodb = new DynamoDB.DocumentClient();

const createOrUpdateAd = async (id: string, version: number, ad: DynamoAd) => {
    console.log(`In createOrUpdateAd function with id ${id} and version ${version}`);
    const params = {
        TableName: tableName,
        Key: { id: id },
        UpdateExpression: 'set adId=:adId, publisherId=:publisherId, version=:version, adTitle=:adTitle, adDescription=:adDescription, price=:price, currency=:currency, category=:category, tags=:tags',
        ExpressionAttributeValues: {
            ':adId': ad.adId,
            ':publisherId': ad.publisherId,
            ':adTitle': ad.adTitle,
            ':adDescription': ad.adDescription,
            ':price': ad.price,
            ':currency': ad.currency,
            ':category': ad.category,
            ':tags': ad.tags.toString(),
            ':version': version
        },
        ConditionExpression: 'attribute_not_exists(pk) OR version <= :version',
    };

    try {
        await dynamodb.update(params).promise();
        console.log(`Successful updated ad with id ${id}.`);
    } catch (err) {
        console.log(`Unable to update ad: ${id}. Error: ${err}`);
    }
};

const deleteAd = async (id: string, version: number) => {
    console.log(`In deleteAd function with id ${id} and version ${version}`);

    const params = {
        TableName: tableName,
        Key: { id: id },
    };

    try {
        await dynamodb.delete(params).promise();
        console.log(`Successful deleted id ${id} with version ${version}`);
    } catch (err) {
        console.log(`Unable to update ad: ${id}. Error: ${err}`);
    }
};


export { createOrUpdateAd, deleteAd };
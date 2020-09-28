import { APIGatewayProxyHandler } from 'aws-lambda';
import axios from 'axios';
import { plainToClass } from 'class-transformer';
import { Ad } from './model/ESObject';

import 'source-map-support/register';


const esUsername = process.env.masterUserName;
const esPassword = process.env.masterUserPassword;
const esUrl = process.env.esUrl;

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  
  const query = event.queryStringParameters["q"];

  console.log("received query: " + query);

  try {
    let list: Array<Ad> = new Array<Ad>();

    const response = await axios.get(`https://${esUrl}/ad/_search`, {
      auth: {
        username: esUsername,
        password: esPassword
      },
      data: `{"size": 25, "query": { "multi_match": { "query": "${query}","fields": ["adTitle","adDescription","category","tags"]}}}`,
      responseType: 'json'
    });
    response.data.hits.hits.forEach(element => {
      let ad: Ad = plainToClass(Ad, element._source);

      list.push(ad);
    });

    return {
      statusCode: 200,
      body: JSON.stringify(list)
    }
  }
  catch(err){
    console.error(err.message);

    return {
      statusCode: 500,
      body: err.message
    }
  }
}

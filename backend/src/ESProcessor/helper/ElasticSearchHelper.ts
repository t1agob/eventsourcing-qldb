import ESAd from '../model/ESAd';
import sendRequest from '../helper/HttpHelper';


const createOrUpdateAd = async (id: string, version: number, ad: ESAd) => {

    const doc = {
        adId: ad.adId,
        publisherId: ad.publisherId,
        adTitle: ad.adTitle,
        adDescription: ad.adDescription,
        price: ad.price,
        currency: ad.currency,
        category: ad.category,
        tags: ad.tags
    };

    const response = await sendRequest(
        "PUT",
        `/ad/_doc/${id}?version=${version}&version_type=external`,
        doc,
    );
    console.log(`RESPONSE: ${JSON.stringify(response)}`);
};

const deleteAd = async (id: string, version: number) => {
    console.log("No data section so handle as a delete");

    const response = await sendRequest(
        "DELETE",
        `/ad/_doc/${id}?version=${version}&version_type=external`,
    );
    console.log(`RESPONSE: ${JSON.stringify(response)}`);
};


export { createOrUpdateAd, deleteAd };
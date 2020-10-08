export default class DynamoAd {
    public id: string;
    public adId: string;
    public publisherId: string;
    public adTitle: string;
    public adDescription: string;
    public price: number;
    public currency: string;
    public category: string;
    public tags: Array<string>;
    public version: number;
}

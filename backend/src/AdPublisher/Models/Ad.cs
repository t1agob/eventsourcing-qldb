using System.Text.Json.Serialization;

namespace AdPublisher
{
    public class Ad
    {
        [JsonPropertyName("adId")]
        public string Id { get; set; }
        [JsonPropertyName("publisherId")]
        public string PublisherId { get; set; }
        [JsonPropertyName("adTitle")]
        public string Title { get; set; }
        [JsonPropertyName("adDescription")]
        public string Description { get; set; }
        [JsonPropertyName("price")]
        public double Price { get; set; }
        [JsonPropertyName("currency")]
        public string Currency { get; set; }
    }
    
}
using System.Collections.Generic;
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
        public decimal Price { get; set; }
        [JsonPropertyName("currency")]
        public string Currency { get; set; }
        [JsonPropertyName("category")]
        public string Category { get; set; }
        [JsonPropertyName("tags")]
        public List<string> Tags {get; set; }
    }
    
}
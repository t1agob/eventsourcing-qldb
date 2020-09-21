using System;
using System.Text.Json.Serialization;

namespace AdReader.Models
{
    public class AdHistory
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
        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; }
        [JsonPropertyName("version")]
        public int Version { get; set; }
    }
}

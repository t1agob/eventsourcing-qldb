using System;
namespace AdClient.Models
{
    public class ESObject
    {
        public string _index { get; set; }
        public string _type { get; set; }
        public string _id { get; set; }
        public decimal _score { get; set; }
        public Ad _source { get; set; }
    }
}

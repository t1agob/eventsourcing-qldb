
publisherId="912nd912"

## CREATE AD 

adid=$(curl -s --location --request POST "https://hnyxsjy9se.execute-api.eu-west-1.amazonaws.com/prod/publisher/$publisherId/ad" \
--header 'X-Amz-Content-Sha256: beaead3198f7da1e70d03ab969765e0821b24fc913697e929e726aeaebf0eba3' \
--header 'X-Amz-Date: 20201001T105254Z' \
--header 'Authorization: AWS4-HMAC-SHA256 Credential=AKIAWA5F7CSRRJ2PDEVG/20201001/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=ca3d441f18975853af8f8557d57a271accf95246046b3731d52a4a70ce65e4d5' \
--header 'Content-Type: application/json' \
--data-raw '{
  "adTitle": "amazing title",
  "adDescription": "amazing description",
  "price": 10,
  "currency": "€",
  "category": "amazing category",
  "tags": [
      "amazing",
      "category"
  ]
}' | cut -c12-20)

echo ""
echo ""

# PARSE OUTPUT TO GET AD ID

echo "adid = '"$adid"'"
echo ""

## UPDATE AD
curl --location --request PATCH "https://hnyxsjy9se.execute-api.eu-west-1.amazonaws.com/prod/publisher/$publisherId/ad/$adid" \
--header 'X-Amz-Content-Sha256: beaead3198f7da1e70d03ab969765e0821b24fc913697e929e726aeaebf0eba3' \
--header 'X-Amz-Date: 20201001T105747Z' \
--header 'Authorization: AWS4-HMAC-SHA256 Credential=AKIAWA5F7CSRRJ2PDEVG/20201001/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=fe9eb4394d6cce22306e80d7311d8f22d15f541e802562759c535a344ac8dea4' \
--header 'Content-Type: application/json' \
--data-raw '{
  "adTitle": "amazing title",
  "adDescription": "amazing description",
  "price": 50.99,
  "currency": "€",
  "category": "amazing category",
  "tags": [
      "amazing",
      "category"
  ]
}'

echo ""
echo ""

## GET ALL ADS FOR PUBLISHER
curl --location --request GET "https://hnyxsjy9se.execute-api.eu-west-1.amazonaws.com/prod/publisher/$publisherId/ad" \
--header 'X-Amz-Date: 20201001T105926Z' \
--header 'Authorization: AWS4-HMAC-SHA256 Credential=AKIAWA5F7CSRRJ2PDEVG/20201001/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=683e54bfd27bc87c7fa75bdc6d0105eff44793adf9e7a18792d0f377668a893b'

echo ""
echo ""

## GET SPECIFIC AD
curl --location --request GET "https://hnyxsjy9se.execute-api.eu-west-1.amazonaws.com/prod/publisher/$publisherId/ad/$adid" \
--header 'X-Amz-Date: 20201001T110007Z' \
--header 'Authorization: AWS4-HMAC-SHA256 Credential=AKIAWA5F7CSRRJ2PDEVG/20201001/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=b594b7ddcb04380f4227b055b50725c2cfc6859958da1108dac2013e23a5f67d'

echo ""
echo ""

## GET SPECIFIC AD WITH VERSIONS
curl --location --request GET "https://hnyxsjy9se.execute-api.eu-west-1.amazonaws.com/prod/publisher/$publisherId/ad/$adid?versions=true" \
--header 'X-Amz-Date: 20201001T110100Z' \
--header 'Authorization: AWS4-HMAC-SHA256 Credential=AKIAWA5F7CSRRJ2PDEVG/20201001/eu-west-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=cf7394c79b02419f8650a4104a4ca29d25283ffcf73e9c9e6194a992c9bcf63d'

echo ""
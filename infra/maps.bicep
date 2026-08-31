@description('Name of the Azure Maps account.')
param name string

// Gen2 is set explicitly rather than left to default. Gen1 retires on
// 2026-09-15, and the two tiers have different free grants — Gen2's is 5,000
// transactions a month, which for base map tiles is billed one transaction per
// 15 tile requests, so roughly 75,000 tile requests.
resource maps 'Microsoft.Maps/accounts@2023-06-01' = {
  name: name
  location: 'global'
  sku: {
    name: 'G2'
  }
  kind: 'Gen2'
  properties: {
    // Tiles are fetched by the browser, so the credential is visible to the
    // front end. A leaked subscription key can be used by anyone — first
    // exhausting the free grant, then billing us — so key auth is turned off at
    // the account, and the map component gets short-lived Entra tokens issued by
    // a Next.js route instead. Disabling it here makes the insecure path
    // impossible rather than merely discouraged.
    disableLocalAuth: true
  }
}

output accountName string = maps.name
output clientId string = maps.properties.uniqueId

// Traversee infrastructure.
//
// Deploy:
//   az deployment sub create \
//     --location eastasia \
//     --template-file infra/main.bicep \
//     --parameters infra/main.bicepparam

targetScope = 'subscription'

@description('Base name used for the resource group and the Static Web App.')
@minLength(2)
@maxLength(40)
param appName string = 'traversee'

@description('Region for the resource group. Metadata only; it does not constrain where the site is served from.')
param location string = 'eastasia'

@description('''
Region for the Static Web App. Static Web Apps is offered in only a handful of
regions — westus2, centralus, eastus2, westeurope, eastasia. eastasia is the
closest to the site's audience in northern Taiwan.
''')
@allowed([
  'westus2'
  'centralus'
  'eastus2'
  'westeurope'
  'eastasia'
])
param staticWebAppLocation string = 'eastasia'

@description('''
Region for the Cosmos DB account. Separate from `location` because Cosmos
capacity is not uniform: East Asia refused account creation with
ServiceUnavailable on 2026-08-28, citing regional demand. The account's write
region cannot be changed after creation, so this is a real decision rather than
a formality — every server-rendered query pays the round trip from the Static
Web Apps runtime, which is in eastasia.
''')
param cosmosLocation string = 'eastasia'

// Cosmos DB and Storage account names are part of a public DNS name, so they
// must be unique across all of Azure, not just this subscription. The suffix is
// derived from the subscription id, so it is stable across redeployments —
// a random suffix would orphan the previous account on every run.
var uniqueSuffix = uniqueString(subscription().subscriptionId, appName)

resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-${appName}'
  location: location
}

module staticWebApp 'static-web-app.bicep' = {
  name: 'staticWebApp'
  scope: resourceGroup
  params: {
    name: appName
    location: staticWebAppLocation
  }
}

module cosmos 'cosmos.bicep' = {
  name: 'cosmos'
  scope: resourceGroup
  params: {
    // take() bounds the name to 44 characters even if appName uses its full
    // allowance of 40, which Cosmos would otherwise reject at deploy time.
    name: toLower('cosmos-${take(appName, 20)}-${uniqueSuffix}')
    location: cosmosLocation
  }
}

module storage 'storage.bicep' = {
  name: 'storage'
  scope: resourceGroup
  params: {
    // Storage account names allow lowercase letters and digits only — no
    // hyphens — and cap at 24 characters, which the take() keeps us inside.
    name: toLower('st${take(appName, 9)}${uniqueSuffix}')
    location: location
  }
}

module maps 'maps.bicep' = {
  name: 'maps'
  scope: resourceGroup
  params: {
    name: 'map-${appName}'
  }
}

module monitoring 'monitoring.bicep' = {
  name: 'monitoring'
  scope: resourceGroup
  params: {
    name: appName
    location: location
  }
}

output resourceGroupName string = resourceGroup.name
output staticWebAppName string = staticWebApp.outputs.name
output siteUrl string = 'https://${staticWebApp.outputs.defaultHostname}'
output cosmosAccountName string = cosmos.outputs.accountName
output cosmosEndpoint string = cosmos.outputs.endpoint
output storageAccountName string = storage.outputs.accountName
output blobEndpoint string = storage.outputs.blobEndpoint
output mapsAccountName string = maps.outputs.accountName
output appInsightsName string = monitoring.outputs.insightsName

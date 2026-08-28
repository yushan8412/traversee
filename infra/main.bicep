// Traversee infrastructure — M0 scope.
//
// Deliberately covers only the Static Web App. Cosmos DB, Blob Storage, Azure
// Maps, and Application Insights arrive in M1, once this milestone has proved
// that hybrid Next.js actually runs here.
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

output resourceGroupName string = resourceGroup.name
output staticWebAppName string = staticWebApp.outputs.name
output siteUrl string = 'https://${staticWebApp.outputs.defaultHostname}'

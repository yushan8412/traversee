@description('Name of the Azure AI Translator account. Also becomes its custom subdomain, so it must be globally unique.')
param name string

@description('Region for the account. F0 is offered in eastasia, which is where the rest of this site runs.')
param location string

// Traditional Chinese is what gets written; the English half of a bilingual
// site should not depend on somebody having the patience to write everything
// twice. F0 covers 2 million characters a month at no cost and does not draw
// down the subscription's trial credit, which matters because that credit
// expires rather than being spent.
resource translator 'Microsoft.CognitiveServices/accounts@2026-07-01' = {
  name: name
  location: location
  kind: 'TextTranslation'
  sku: {
    name: 'F0'
  }
  properties: {
    // Microsoft Entra authentication only works against a custom subdomain —
    // the regional endpoint rejects bearer tokens — so this is not cosmetic. It
    // is also immutable, which is why it is set at creation rather than added.
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    // Same reasoning as the Maps account: with keys off, a leaked credential
    // cannot exist. Translation is called from the server rather than the
    // browser, so unlike Maps this costs nothing in convenience — the service
    // principal already holds a token for Azure, and needs only a scoped role.
    disableLocalAuth: true
  }
}

output accountName string = translator.name

// Not `properties.endpoint`, which returns the global
// api.cognitive.microsofttranslator.com regardless of the custom subdomain —
// and the global endpoint rejects bearer tokens, so a deployment that wired
// that value through would look correct and fail to authenticate.
output endpoint string = 'https://${translator.properties.customSubDomainName}.cognitiveservices.azure.com'

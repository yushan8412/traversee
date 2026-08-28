@description('Name of the Static Web App.')
param name string

@description('Region. Must be one of the regions Static Web Apps supports.')
param location string

resource site 'Microsoft.Web/staticSites@2024-04-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // 'Custom' stops Azure from generating and committing its own GitHub Actions
    // workflow into the repository. Deployment is driven by the workflow in
    // .github/workflows/deploy.yml, authenticated with a deployment token, so the
    // repo stays the single source of truth for how the site ships.
    provider: 'Custom'

    // Pull request preview environments — three of them on the Free plan. The
    // architecture spec relies on these for human acceptance before merge, so
    // this is load-bearing rather than a nicety.
    stagingEnvironmentPolicy: 'Enabled'

    // Lets staticwebapp.config.json in the repo take effect. Note that for hybrid
    // Next.js most routing must live in next.config.ts instead; this file only
    // covers what Static Web Apps handles ahead of the Next.js runtime.
    allowConfigFileUpdates: true

    // Public site. Preview environments inherit this, which is intended — the
    // point of a preview URL is being able to send it to someone.
    publicNetworkAccess: 'Enabled'
  }
}

output name string = site.name
output defaultHostname string = site.properties.defaultHostname

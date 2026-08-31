using 'main.bicep'

param appName = 'traversee'
param location = 'eastasia'
param staticWebAppLocation = 'eastasia'
// Not eastasia, unlike everything else. Cosmos account creation there returned
// ServiceUnavailable citing regional demand on both 2026-08-28 and 2026-08-31,
// so the region is not momentarily busy. Southeast Asia costs a cross-region hop
// from the Static Web Apps runtime; the alternative was waiting on a capacity
// request with no committed date.
param cosmosLocation = 'southeastasia'

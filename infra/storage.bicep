@description('Name of the storage account. Globally unique, lowercase alphanumeric only.')
@minLength(3)
@maxLength(24)
param name string

@description('Region for the account.')
param location string

resource storage 'Microsoft.Storage/storageAccounts@2026-04-01' = {
  name: name
  location: location
  sku: {
    // Locally redundant is the cheapest tier and the right one here: every blob
    // is either an unreviewed upload or a copy of something reproducible from
    // the submission. Nothing in this account is the only copy of anything.
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    // Azure defaults this to false, which would silently make the public
    // container's anonymous-read setting have no effect.
    allowBlobPublicAccess: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2026-04-01' = {
  parent: storage
  name: 'default'
}

// Unreviewed uploads. Private, so an inappropriate submission never has a
// reachable public URL between upload and moderation. This is why the layout
// uses two containers rather than one with hard-to-guess paths.
resource pending 'Microsoft.Storage/storageAccounts/blobServices/containers@2026-04-01' = {
  parent: blobService
  name: 'pending'
  properties: {
    publicAccess: 'None'
  }
}

// Approved files, served straight to browsers. 'Blob' permits anonymous read of
// a known blob but not listing the container, so the contents stay unenumerable.
resource published 'Microsoft.Storage/storageAccounts/blobServices/containers@2026-04-01' = {
  parent: blobService
  name: 'public'
  properties: {
    publicAccess: 'Blob'
  }
}

output accountName string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob

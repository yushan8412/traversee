@description('Name of the Cosmos DB account. Globally unique, lowercase.')
@minLength(3)
@maxLength(44)
param name string

@description('Region for the account.')
param location string

@description('Name of the SQL database that both containers live in.')
param databaseName string = 'traversee'

@description('''
Shared throughput for the database, in RU/s. The free tier covers exactly 1,000,
so raising this stops the account being free.
''')
param throughput int = 1000

// enableFreeTier is the single most consequential line in this repository. The
// free tier is one account per subscription, it can only be chosen at creation,
// and an account created without it cannot be upgraded — only deleted and
// rebuilt. Verified unclaimed on this subscription on 2026-08-28.
//
// Serverless mode is mutually exclusive with the free tier, which is why no
// EnableServerless capability appears here; serverless is otherwise the obvious
// thing to reach for when minimising cost on a low-traffic site.
resource account 'Microsoft.DocumentDB/databaseAccounts@2026-03-15' = {
  name: name
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    enableFreeTier: true
    databaseAccountOfferType: 'Standard'
    minimalTlsVersion: 'Tls12'
    publicNetworkAccess: 'Enabled'
    consistencyPolicy: {
      // Session is the default and the right fit: a submitter must see their own
      // write immediately, while one reader seeing another's new place a moment
      // late costs nothing. Stronger levels would double the RU cost of reads
      // against a budget that is fixed at 1,000 RU/s.
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
  }
}

// Throughput is provisioned on the database rather than per container, so both
// containers draw from one 1,000 RU/s pool. Per-container throughput would mean
// a 400 RU/s floor each, bill for both floors regardless of use, and still not
// fit the free grant as cleanly.
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2026-03-15' = {
  parent: account
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    options: {
      throughput: throughput
    }
  }
}

// Partition key is /city — three values across the whole geographic scope, evenly
// distributed, and the filter most likely to be added. Unlike almost everything
// else here, a partition key cannot be changed after creation.
resource places 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2026-03-15' = {
  parent: database
  name: 'places'
  properties: {
    resource: {
      id: 'places'
      partitionKey: {
        paths: [
          '/city'
        ]
        kind: 'Hash'
      }
    }
  }
}

// Every post-authentication lookup is "fetch one user by id", which /id makes a
// single-partition point read.
resource users 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2026-03-15' = {
  parent: database
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

output accountName string = account.name
output databaseName string = database.name
output endpoint string = account.properties.documentEndpoint

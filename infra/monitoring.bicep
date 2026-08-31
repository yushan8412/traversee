@description('Base name; the workspace and the Application Insights component are derived from it.')
param name string

@description('Region for both resources.')
param location string

@description('''
Daily ingestion ceiling in GB, as a string because Bicep has no fractional
number type. The free grant is 5 GB a month measured per billing account, so
0.15 a day works out at 4.65 over a 31-day month — just under, with margin.
''')
param dailyIngestionCapGb string = '0.15'

// The daily cap exists because the 5 GB grant is shared across every Log
// Analytics workspace in the subscription, not granted per resource. Without a
// cap, telemetry from anything added later can quietly push total ingestion past
// the grant and turn it into a bill. The cap makes the failure mode "telemetry
// stops" instead of "money is spent", which is the right way round here.
resource workspace 'Microsoft.OperationalInsights/workspaces@2025-07-01' = {
  name: 'log-${name}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    // 30 days is the retention included at no cost; beyond it storage is billed.
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: json(dailyIngestionCapGb)
    }
  }
}

// Workspace-based rather than classic. Classic Application Insights reached end
// of support and new classic components can no longer be created.
resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${name}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    IngestionMode: 'LogAnalytics'
  }
}

output workspaceName string = workspace.name
output insightsName string = insights.name

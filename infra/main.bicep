// infra/main.bicep
// Deploy a basic App Service Plan and Web App for the Node.js Express application.
// - Place files under infra/ per Azure best practices
// - Parameters allow customizing app name and SKU

@description('Name of the Web App to create')
param appName string

@description('Location for resources')
param location string = resourceGroup().location

@description('SKU for App Service Plan (e.g. F1, B1, P1V2)')
param skuName string = 'F1'

// App Service plan
resource appPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: skuName
    tier: toUpper(substring(skuName, 0, 1))
    capacity: 1
  }
  properties: {
    reserved: false
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appPlan.id
  }
  kind: 'app'
}

// Output the web app name and plan id for convenience
output webAppName string = webApp.name
output appServicePlanId string = appPlan.id

// Note: publishing profile cannot be directly emitted from Bicep outputs.
// Use the Azure CLI after deployment to retrieve the publish profile:
// az webapp deployment list-publishing-profiles -g <rg> -n <appName> --xml > publishProfile.xml

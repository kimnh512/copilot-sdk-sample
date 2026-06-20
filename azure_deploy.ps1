$rg = "copilot-sdk-sample-rg"
$plan = "copilot-sdk-sample-plan"
$app = "copilot-sdk-sample-appsvc-$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "Resource group: $rg"
Write-Host "App service plan: $plan"
Write-Host "Web app name: $app"

az group create --name $rg --location koreasouth | ConvertFrom-Json | Out-Null
az appservice plan create --name $plan --resource-group $rg --sku B1 | ConvertFrom-Json | Out-Null

$webappArgs = @(
    'webapp',
    'create',
    '--resource-group', $rg,
    '--plan', $plan,
    '--name', $app,
    '--runtime', 'NODE|18-lts'
)
Write-Host "Running: az $($webappArgs -join ' ')"
& az @webappArgs | ConvertFrom-Json | Out-Null

$zip = Join-Path (Get-Location) 'deploy-azure.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path * -DestinationPath $zip -Force

$deployArgs = @(
    'webapp',
    'deploy',
    '--resource-group', $rg,
    '--name', $app,
    '--src-path', $zip
)
Write-Host "Running: az $($deployArgs -join ' ')"
& az @deployArgs | ConvertFrom-Json | Out-Null

Write-Host "Deployed web app: https://$app.azurewebsites.net"

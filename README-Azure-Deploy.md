# Azure 배포 가이드

다음 단계로 이 레포지토리를 Azure Web App으로 배포할 수 있습니다. 자동화된 GitHub Actions 워크플로(`.github/workflows/azure-webapp.yml`)가 이미 포함되어 있으므로, App Service의 게시 프로필을 GitHub Secrets에 추가하면 push 시 자동 배포됩니다.

사전 요구사항
- `az` (Azure CLI) 설치 및 로그인 (`az login`)
- `gh` (GitHub CLI) 설치 (원하면) 또는 GitHub 리포지토리의 Settings > Secrets에서 수동 등록

빠른 배포 (권장: Bicep 사용)
1. 리소스 그룹 생성(예시):
```powershell
az group create -n my-rg -l eastus
```
2. Bicep으로 App Service 생성:
```powershell
az deployment group create -g my-rg -f infra/main.bicep --parameters appName=my-unique-app-name location=eastus
```
3. 게시 프로필 다운로드:
```powershell
az webapp deployment list-publishing-profiles -g my-rg -n my-unique-app-name --xml > publishProfile.xml
```
4. GitHub에 시크릿 추가:
 - `AZURE_WEBAPP_PUBLISH_PROFILE`: `publishProfile.xml` 파일 전체 내용
 - `AZURE_WEBAPP_NAME`: 웹앱 이름 (`my-unique-app-name`)
 - (선택) `COPILOT_GITHUB_TOKEN`: 실제 Copilot 연동에 필요한 토큰 — 안전하게 GitHub Secrets에 등록

GitHub Actions가 푸시를 감지해 자동으로 배포합니다. 배포 성공 후 리소스 URL을 확인하고 브라우저에서 열어보세요.

직접 배포(Zip deploy)
```powershell
az webapp deployment source config-zip -g my-rg -n my-unique-app-name --src deploy.zip
```

보안 권장사항
- 자격증명(토큰, 게시 프로필 등)은 절대 코드에 하드코딩하지 마세요.
- Key Vault, Managed Identity 사용 고려

문제가 발생하면 배포 로그 및 App Service의 `Log stream`을 확인하세요.

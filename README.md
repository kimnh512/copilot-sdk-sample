# Copilot SDK 생산성 웹앱

이 저장소는 GitHub Copilot SDK를 사용해 사용자의 자연어 작업을 AI가 우선순위와 순서로 정리하는 생산성 웹앱 샘플입니다.

## 주요 기능

- 자연어로 할 일을 입력하면 AI가 우선순위와 순서를 분석합니다.
- AI가 만든 작업 목록을 사용자가 수정할 수 있습니다.
- `수락 및 첫 작업 실행` 버튼으로 첫 작업을 로컬 실행기로 보냅니다.
- 오른쪽 상단에 접을 수 있는 작업 패널이 있고, 현재 작업과 다음 작업을 보여줍니다.
- `다음` 버튼으로 다음 작업을 순차 실행합니다.

## 빠른 시작

1. 의존성 설치

```bash
cd copilot-sdk-sample
npm install
```

2. 환경변수 설정

- `COPILOT_GITHUB_TOKEN`: Copilot SDK 인증 토큰
- `COPILOT_MODEL`: 사용할 모델 (예: `gpt-5`)

Windows PowerShell 예시:

```powershell
$env:COPILOT_GITHUB_TOKEN = "your_github_token"
$env:COPILOT_MODEL = "gpt-5"
```

3. 로컬 실행기 시작

```powershell
node local_launcher.js
```

4. 웹앱 실행

```bash
npm start
```

5. 브라우저에서 열기

`http://localhost:3000`

## 사용 방법

1. 텍스트 박스에 자연어로 해야 할 일을 입력합니다.
2. `AI로 분석` 버튼을 눌러 작업 목록을 생성합니다.
3. 생성된 작업 목록을 확인하고 필요한 내용을 수정합니다.
4. `수락 및 첫 작업 실행`을 눌러 첫 작업을 로컬에서 실행합니다.
5. 오른쪽 패널에서 현재 작업과 다음 작업을 확인하고, `다음` 버튼을 눌러 다음 작업을 실행합니다.

## Azure 배포

이 앱은 Azure App Service에 배포할 수 있습니다. `package.json`의 `start` 스크립트를 그대로 사용하면 App Service에서 실행됩니다.

- Azure에 Web App을 만들고 배포합니다.
- `COPILOT_GITHUB_TOKEN` 및 `COPILOT_MODEL`을 App Service 설정에 추가합니다.

## 로컬 실행기

- `local_launcher.js`는 로컬 Windows 환경에서 브라우저/앱 명령을 실행합니다.
- 웹앱은 `http://localhost:4321/launch-one`으로 단일 작업을 전송합니다.
- 로컬 실행기를 먼저 실행해야 브라우저에서 작업 실행이 가능합니다.

## 참고

현재 웹앱은 Copilot SDK를 통해 AI 작업 분석을 수행하며, 로컬 실행기는 실제 Windows 앱/브라우저 실행을 담당합니다.

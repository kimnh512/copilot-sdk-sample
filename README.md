# Copilot SDK 생산성 웹앱

이 저장소는 GitHub Copilot SDK를 사용해 사용자의 자연어 작업을 AI가 우선순위와 순서로 정리하는 생산성 앱 샘플입니다.

## 주요 기능

- 자연어로 할 일을 입력하면 AI가 우선순위와 순서를 분석합니다.
- AI가 만든 작업 목록을 사용자가 수정할 수 있습니다.
- **Electron 앱**: 항상 위(always-on-top) 플로팅 패널이 모든 창 위에 떠있어 게임처럼 작업을 해치울 수 있습니다.
- 플로팅 패널에서 XP와 레벨업 시스템으로 작업 완료 보상을 제공합니다.
- `✓ 완료!` 버튼으로 다음 작업으로 이동하고 앱/브라우저를 자동 실행합니다.

## 빠른 시작

### Electron 앱 (권장)

1. 의존성 설치

```bash
npm install
```

2. 환경변수 설정

- `COPILOT_GITHUB_TOKEN`: Copilot SDK 인증 토큰
- `COPILOT_MODEL`: 사용할 모델 (예: `gpt-4o`)

3. Electron 앱 실행

```bash
npm run start:electron
```

메인 창(작업 설정)과 항상-위 플로팅 패널이 함께 열립니다.

### 웹 서버만 실행 (로컬 개발)

```bash
npm start
```

`http://localhost:3000` 에서 브라우저로 접속합니다. 앱 실행을 위해 별도로 `node local_launcher.js`도 필요합니다.

## 사용 방법

1. 메인 창 텍스트 박스에 자연어로 해야 할 일을 입력합니다.
2. `AI로 분석` 버튼을 눌러 작업 목록을 생성합니다.
3. 생성된 작업 목록을 확인하고 필요한 내용을 수정합니다.
4. `수락 및 첫 작업 실행`을 눌러 첫 작업을 실행합니다.
5. 화면 오른쪽 상단의 **플로팅 패널**에서 현재/다음 작업을 확인하고 `✓ 완료!` 버튼으로 진행합니다.

## 플로팅 패널 (Electron 전용)

- 모든 앱과 브라우저 위에 항상 표시됩니다.
- 현재 작업과 다음 작업을 한눈에 볼 수 있습니다.
- 작업 완료 시 **XP +10** 획득, 레벨업 시 알림이 표시됩니다.
- 패널 헤더를 드래그해 위치를 이동할 수 있습니다.

## 환경변수

| 변수 | 설명 |
|---|---|
| `COPILOT_GITHUB_TOKEN` | GitHub Copilot SDK 인증 토큰 |
| `COPILOT_MODEL` | 사용할 모델 (기본: `gpt-4o`) |
| `COPILOT_MOCK` | `true`로 설정 시 AI 없이 Mock 응답 사용 |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI 엔드포인트 (설정 시 우선 사용) |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API 키 |

## AI 엔진 우선순위

```
COPILOT_MOCK=true → Mock 모드 (개발/테스트용)
AZURE_OPENAI_ENDPOINT 설정 → Azure OpenAI
그 외 → GitHub Copilot SDK (COPILOT_GITHUB_TOKEN 필요)
```

## Azure 배포

웹앱 모드(`npm start`)는 Azure App Service에 배포할 수 있습니다. `COPILOT_GITHUB_TOKEN` 및 `COPILOT_MODEL`을 App Service 환경변수에 추가하세요.


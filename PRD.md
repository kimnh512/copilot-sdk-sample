# PRD — AI 생산성 작업 관리자

## 1. 개요

### 제품명
AI 생산성 작업 관리자 (AI Productivity Task Manager)

### 배경 및 목적
사용자는 하루에 처리해야 할 업무가 많지만, 우선순위를 정하고 순서를 잡는 데 시간을 낭비한다. 이 제품은 자연어로 입력한 할 일 목록을 GitHub Copilot AI가 분석하여 우선순위와 실행 순서를 자동으로 제안하고, 작업을 즉시 실행할 수 있는 환경을 제공한다.

### 비전
"할 일을 쓰면 AI가 정리하고, 버튼 하나로 실행한다."

---

## 2. 대상 사용자

| 페르소나 | 설명 |
|----------|------|
| **지식 근로자** | 이메일, 문서 작성, 회의, 코드 리뷰 등 다양한 업무를 병행하는 직장인 |
| **개발자** | VS Code, 터미널, 브라우저를 오가며 작업하는 소프트웨어 엔지니어 |
| **원격 근무자** | 집에서 PC를 사용하며 하루 일정을 스스로 관리하는 사용자 |

---

## 3. 핵심 기능 요구사항

### 3.1 자연어 작업 입력 및 AI 분석 `[P0]`
- 사용자는 자연어(한국어/영어)로 할 일을 자유롭게 입력한다.
- GitHub Copilot SDK를 통해 AI가 입력을 분석하고 다음 필드를 포함한 작업 목록을 반환한다:
  - `name`: 작업 제목
  - `command`: 실행 가능한 URL 또는 앱 명령
  - `type`: `browser` 또는 `app`
  - `priority`: 1(최고) ~ N(고유값, 중복 없음)
  - `order`: 수행 순서
  - `description`: 작업 설명
- Copilot 토큰 미설정 시 규칙 기반 폴백(fallback) 제안을 제공한다.

### 3.2 우선순위 정규화 `[P0]`
- AI 또는 규칙 기반 응답에서 중복된 priority 값이 발생할 경우, 서버 반환 전 및 클라이언트 수신 후 자동으로 1부터 N까지 중복 없이 재부여한다.
- 사용자가 priority를 편집할 때도 즉시 재정규화한다.

### 3.3 작업 목록 편집 `[P0]`
- 사용자는 AI가 제안한 작업의 이름, 명령, 종류, 우선순위, 설명을 직접 편집할 수 있다.
- 이름/설명에 "중요", "긴급", "important" 등 키워드 입력 시 해당 작업을 우선순위 1로 자동 승격한다.
- 드래그 앤 드롭으로 작업 순서를 변경할 수 있다.

### 3.4 작업 실행 `[P0]`
- **browser 타입**: 로컬 실행기 없이 `window.open()`으로 브라우저에서 직접 URL을 열어 클라우드·로컬 모두 동작한다.
- **app 타입**: 로컬 실행기(`local_launcher.js`, 포트 4321)를 통해 Windows 앱(outlook, code, msteams 등)을 실행한다. 실행기 미실행 시 명확한 안내 메시지를 표시한다.
- 작업 실행 후 해당 작업이 목록 맨 앞으로 이동하며 "현재 작업"으로 표시된다.

### 3.5 작업 패널 `[P1]`
- 우측 고정 패널에 "지금 할 일"과 "다음 할 일"을 항상 표시한다.
- 패널은 열기/닫기 토글이 가능하다.
- Picture-in-Picture(PiP) 팝아웃 기능으로 패널을 플로팅 창으로 분리할 수 있다.

### 3.6 클라우드 배포 API `[P1]`
- Azure Static Web Apps + Azure Functions(v4)로 완전 동작하는 클라우드 배포를 지원한다.
- 프론트엔드는 `/api/plan`, `/api/copilot` 엔드포인트를 호출한다.
- GitHub Actions를 통해 `main` 브랜치 push 시 자동 배포된다.

---

## 4. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| **성능** | AI 분석 응답 시간 30초 이내 (Copilot SDK timeout 적용) |
| **가용성** | 클라우드 배포 시 Azure SLA 준수 |
| **보안** | `COPILOT_GITHUB_TOKEN`은 환경변수/GitHub Secrets로만 관리, 코드에 하드코딩 금지 |
| **호환성** | 최신 Chrome, Edge, Firefox 지원. 로컬 실행 기능은 Windows 전용 |
| **Node.js** | `>=20.19.0` (copilot-sdk 요구사항) |

---

## 5. 시스템 아키텍처

```
[사용자 브라우저]
      │
      ├─ GET / ──────────────────────► [Azure Static Web Apps]
      │                                  public/index.html
      │                                  public/app.js
      │
      ├─ POST /api/plan ────────────► [Azure Functions]
      │                                  api/src/functions/plan.js
      │                                       │
      │                                       └─► [GitHub Copilot SDK]
      │                                           (또는 규칙 기반 폴백)
      │
      └─ POST localhost:4321/launch-one ► [local_launcher.js]  ← 사용자 PC에서 실행
                                             Windows 앱/URL 실행
```

---

## 6. API 명세

### POST `/api/plan`

**Request**
```json
{ "text": "이메일 확인하고 VS Code 열고 회의 준비" }
```

**Response**
```json
{
  "tasks": [
    {
      "name": "메일 클라이언트 열기",
      "command": "outlook",
      "type": "app",
      "priority": 1,
      "order": 1,
      "description": "이메일을 확인합니다."
    }
  ],
  "warning": "(선택) 폴백 사용 시 안내 문구"
}
```

### POST `/api/copilot`

**Request**
```json
{ "prompt": "자유 형식 프롬프트" }
```

**Response**
```json
{ "result": "AI 응답 텍스트" }
```

---

## 7. 환경변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `COPILOT_GITHUB_TOKEN` | 권장 | GitHub Copilot API 인증 토큰 |
| `COPILOT_MOCK` | 선택 | `true` 설정 시 Mock 응답 반환 (개발·테스트용) |
| `COPILOT_MODEL` | 선택 | 사용할 모델명 (기본값: `gpt-5`) |
| `PORT` | 선택 | 로컬 서버 포트 (기본값: `3000`) |

---

## 8. 향후 로드맵

| 우선순위 | 기능 |
|----------|------|
| P1 | GitHub OAuth 로그인 — 사용자별 작업 기록 저장 |
| P1 | 작업 완료 체크 및 진행률 표시 |
| P2 | 반복 작업 템플릿 저장/불러오기 |
| P2 | macOS/Linux 로컬 실행기 지원 |
| P3 | 작업 공유 및 팀 협업 기능 |
| P3 | 캘린더 연동 (Google Calendar, Outlook) |

---

## 9. 알려진 제약사항

- 로컬 앱 실행(`app` 타입)은 사용자 PC에 `local_launcher.js` 가 실행 중이어야 하며 Windows 전용이다.
- 데이터 영속성 없음 — 페이지 새로고침 시 작업 목록 초기화된다.
- Picture-in-Picture는 브라우저 지원 여부에 따라 다를 수 있다.

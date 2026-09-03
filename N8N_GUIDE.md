# 🚀 법무법인 무제 프로보노 AX - n8n & Docker Compose 연동 가이드

본 문서는 **법무법인 무제**의 공익 법률 AX 파이프라인(FastAPI)과 **n8n 자동화 워크플로우**를 Docker Compose 환경에서 원클릭으로 구동하고 연동하는 가이드입니다.

---

## 1. 인프라 아키텍처 개요

```text
               [외부 사용자 / 스케줄러 / 웹훅 트리거]
                                  │
                                  ▼
           ┌──────────────────────────────────────────────┐
           │                  n8n 엔진                     │
           │           (http://localhost:5678)            │
           └──────────────────────┬───────────────────────┘
                                  │ 컨테이너 내부 통신
                                  ▼
           ┌──────────────────────────────────────────────┐
           │            FastAPI 백엔드 서비스             │
           │           (http://localhost:8000)            │
           │     GET /api/probono/summarize?query=&lang=  │
           └───────────┬───────────────────┬──────────────┘
                       │                   │
           ┌───────────▼───────────┐ ┌─────▼──────────────┐
           │ 국가법령정보센터 DRF  │ │  Gemini & gTTS     │
           │ (판례 XML 데이터)     │ │  (다국어 요약·음성)│
           └───────────────────────┘ └────────────────────┘
```

- **네트워크:** `mooje-network` (브리지 네트워크로 컨테이너 간 안전한 도메인명 통신)
- **로컬 DB:** MySQL 8.0 (`localhost:3307` 바인딩, 규정 준수)
- **볼륨:** 정적 음성 파일(`.mp3`) 및 n8n 데이터 영구 보존

---

## 2. 사전 준비 사항

프로젝트 루트의 `.env` 파일에 필요한 인증키가 설정되어 있는지 확인합니다:
```env
LAW_API_KEY=your_law_go_kr_api_key
LLM_API_KEY=your_google_gemini_api_key
```

---

## 3. 원클릭 실행 (Docker Compose)

프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다:

```bash
# 컨테이너 빌드 및 백그라운드 실행
docker compose up -d
```

### 컨테이너 상태 확인
```bash
docker compose ps
```

| 서비스명 | 컨테이너명 | 호스트 포트 | 설명 |
| :--- | :--- | :--- | :--- |
| **fastapi-app** | `mooje-fastapi` | `8000` | 프로보노 요약 및 TTS API (Swagger: `/docs`) |
| **n8n** | `mooje-n8n` | `5678` | 워크플로우 자동화 대시보드 |
| **db** | `mooje-mysql` | `3307` | 로컬 영구 데이터베이스 (포트 3307) |

---

## 4. n8n 워크플로우 임포트 및 연동

1. 웹 브라우저에서 `http://localhost:5678`에 접속합니다. (최초 접속 시 계정 생성)
2. 좌측 상단 메뉴에서 **Workflows** ➔ **Import from File**을 클릭합니다.
3. 프로젝트 내 `n8n/workflows/probono_workflow.json` 파일을 선택하여 임포트합니다.
4. 워크플로우가 로드되면 우측 상단의 **Save** 및 **Active** 스위치를 켭니다.

### 워크플로우 구성 노드:
1. **Webhook Trigger**: 외부 요청(`POST /webhook/probono-trigger`) 수신
2. **Schedule Trigger**: 매주 월요일 오전 9시 정기 자동 실행
3. **HTTP Request**: `http://fastapi-app:8000/api/probono/summarize` 호출
4. **Code Node**: 슬랙/이메일/노션 전송용 마크다운 및 음성 링크 포맷팅
5. **Respond to Webhook**: 최종 결과 응답

---

## 5. 웹훅 트리거 테스트

터미널에서 n8n 웹훅 엔드포인트로 테스트 요청을 보낼 수 있습니다:

```bash
# 베트남어 요약 및 음성 요청 테스트
curl -X POST http://localhost:5678/webhook/probono-trigger \
  -H "Content-Type: application/json" \
  -d '{"query": "임금체불", "lang": "vi"}'

# 태국어 요약 및 음성 요청 테스트
curl -X POST http://localhost:5678/webhook/probono-trigger \
  -H "Content-Type: application/json" \
  -d '{"query": "손해배상", "lang": "th"}'
```

---

## 6. 서비스 중지 및 정리

```bash
# 서비스 중지
docker compose down

# 볼륨(데이터)까지 완전 초기화할 경우
docker compose down -v
```

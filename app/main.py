import warnings
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import STATIC_DIR
from app.api.endpoints import router as probono_router

# 라이브러리 경고 메시지 필터링
warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI(
    title="법무법인 (미지정) - 마케팅 AX 자동화 파이프라인 API",
    description=(
        "로펌 홍보팀을 위한 판결문 마케팅 AX 파이프라인 API입니다. "
        "국가법령정보센터 공식 판례 데이터를 수집하고, 개인정보를 비식별화한 후, "
        "Gemini 모델을 통해 후킹 제목, 카드뉴스, 30초 숏츠 음성 및 블로그 원고를 자동 생성합니다."
    ),
    version="1.0.0"
)

# 1. CORS 미들웨어 설정 (Next.js 프론트엔드 및 n8n 워크플로우 연동 대비)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 정적 음성 파일 서빙 마운트 (/static/audio/...)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# 3. 라우터 등록
app.include_router(probono_router, prefix="/api/probono", tags=["Pro Bono AX"])

# 4. 헬스체크 엔드포인트
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "Legal Marketing AX Pipeline",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

FROM python:3.12-slim

# 시스템 필수 유틸리티 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY app/ ./app/
COPY static/ ./static/

# 포트 8000 노출
EXPOSE 8000

# FastAPI 서버 구동
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

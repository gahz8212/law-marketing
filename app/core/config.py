import os
from pathlib import Path
from dotenv import load_dotenv

# .env 로드
load_dotenv(override=True)

# 기본 디렉토리 경로
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_DIR = BASE_DIR / "static"
AUDIO_DIR = STATIC_DIR / "audio"

# 정적 오디오 디렉토리 자동 생성
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# API 키 및 환경 변수
LAW_API_KEY = os.getenv("LAW_API_KEY", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")

# 지원 언어 설정 (언어 코드: gTTS 언어 코드)
SUPPORTED_LANGUAGES = {
    "ko": {"name": "한국어", "gtts_lang": "ko"},
    "en": {"name": "English", "gtts_lang": "en"},
    "vi": {"name": "Tiếng Việt", "gtts_lang": "vi"},
    "zh": {"name": "中文 (Chinese)", "gtts_lang": "zh-CN"},
    "th": {"name": "ไทย (Thai)", "gtts_lang": "th"},
    "km": {"name": "ភាសាខ្មែរ (Khmer)", "gtts_lang": "km"},
    "ur": {"name": "اردو (Urdu/Pakistan)", "gtts_lang": "ur"},
    "uz": {"name": "O'zbek tili (Uzbek)", "gtts_lang": None},  # gTTS 공식 미지원 -> 텍스트 리포트 전용
}

DEFAULT_LANGUAGE = "ko"
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"

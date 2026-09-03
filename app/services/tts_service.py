import asyncio
import uuid
from pathlib import Path
from typing import Optional, Dict, Any
import edge_tts
from app.core.config import AUDIO_DIR

class TTSService:
    """
    유튜브 숏츠(Shorts) 및 인스타그램 릴스(Reels) 제작용 고품질 AI 성우 나레이션 엔진
    Microsoft Neural TTS 기반:
    - 👩 선희 (ko-KR-SunHiNeural): 2030 여성 숏츠/릴스 크리에이터 톤 (속도 +15%)
    - 👨 인준 (ko-KR-InJoonNeural): 3040 남성 변호사 / 뉴스 앵커 신뢰감 톤 (속도 +8%, 피치 -5Hz)
    - 🧑 현수 (ko-KR-HyunsuMultilingualNeural): 2030 남성 트렌디 크리에이터 톤 (속도 +12%)
    """

    VOICE_PRESETS = {
        "female_2030": {
            "name": "ko-KR-SunHiNeural",
            "rate": "+15%",
            "pitch": "+0Hz",
            "label": "👩 2030 여성 선희 (쇼츠 톤)",
        },
        "male_3040": {
            "name": "ko-KR-InJoonNeural",
            "rate": "+8%",
            "pitch": "-5Hz",
            "label": "👨 3040 남성 인준 (변호사 톤)",
        },
        "male_2030": {
            "name": "ko-KR-HyunsuMultilingualNeural",
            "rate": "+12%",
            "pitch": "+0Hz",
            "label": "🧑 2030 남성 현수 (크리에이터 톤)",
        },
    }

    @classmethod
    async def _synthesize_async(cls, text: str, output_path: str, voice: str, rate: str, pitch: str):
        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
        await communicate.save(output_path)

    @classmethod
    def generate_shorts_audio(
        cls,
        text: str,
        prec_id: str = "shorts",
        voice_type: str = "female_2030"
    ) -> Optional[Dict[str, Any]]:
        """
        쇼츠 대본을 지정된 성우 보이스로 합성하여 MP3로 저장하고 메타데이터를 반환합니다.
        """
        if not text.strip():
            return None

        AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        unique_token = uuid.uuid4().hex[:8]
        clean_id = "".join(filter(str.isalnum, str(prec_id))) or "shorts"
        clean_voice_key = "".join(filter(str.isalnum, str(voice_type))) or "v"
        filename = f"shorts_{clean_id}_{clean_voice_key}_{unique_token}.mp3"
        file_path = AUDIO_DIR / filename

        preset = cls.VOICE_PRESETS.get(voice_type, cls.VOICE_PRESETS["female_2030"])
        chosen_voice = preset["name"]
        chosen_rate = preset["rate"]
        chosen_pitch = preset["pitch"]

        try:
            # 독립된 새 스레드 풀에서 asyncio.run을 실행하여 이벤트 루프 충돌 100% 방지
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(
                    asyncio.run,
                    cls._synthesize_async(text, str(file_path), chosen_voice, chosen_rate, chosen_pitch)
                )
                future.result(timeout=10)

            return {
                "filename": filename,
                "file_path": str(file_path),
                "audio_url": f"/static/audio/{filename}",
                "lang": "ko",
                "voice": chosen_voice,
                "voice_type": voice_type,
                "file_size": file_path.stat().st_size
            }
        except Exception as e:
            print(f"TTS Synthesis error: {e}")
            return None

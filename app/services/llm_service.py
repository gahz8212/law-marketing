import re
from typing import Dict, Any, List, Optional
from google import genai
from app.core.config import LLM_API_KEY, DEFAULT_GEMINI_MODEL

class LLMService:
    """
    [Core Principle 4] 법률 도메인 마케팅 콘텐츠 및 숏츠 대본 생성 모듈
    Gemini LLM을 활용하여 승소 판결문에서 후킹 제목 3선, 인스타 카드뉴스,
    유튜브 숏츠 30초 대본, 완성형 블로그 원고를 일괄 생성합니다.
    """

    LANGUAGE_NAMES = {
        "ko": "한국어 (Korean)",
        "en": "영어 (English)",
        "vi": "베트남어 (Vietnamese)",
        "zh": "중국어 (Chinese)",
        "th": "태국어 (Thai)",
        "km": "캄보디아어 (Khmer)",
        "ur": "우르두어 (Urdu)",
        "uz": "우즈벡어 (Uzbek)",
    }

    @classmethod
    def generate_probono_summary(
        cls, 
        precedent_data: Dict[str, Any], 
        lang: str = "ko"
    ) -> Dict[str, Any]:
        """
        비식별화된 판례 데이터를 지정된 언어로 마케팅 및 숏츠 맞춤 요약합니다.
        """
        if not LLM_API_KEY:
            raise ValueError("LLM_API_KEY가 설정되지 않았습니다.")

        lang_name = cls.LANGUAGE_NAMES.get(lang, "한국어 (Korean)")
        client = genai.Client(api_key=LLM_API_KEY)

        system_instruction = (
            "너는 대한민국 탑티어 로펌 '법무법인 (미지정)' 홍보팀의 수석 카피라이터야. "
            "변호사님이 전달한 승소 판결문이나 소장 메모를 일반 대중과 잠재 의뢰인이 1초 만에 혹할 수 있는 "
            "가장 흥미진진하고 매력적인 스토리텔링과 후킹 카피, 유튜브 숏츠 30초 대본으로 재가공해야 해. "
            f"반드시 모든 출력 내용을 '{lang_name}'로 작성해."
        )

        user_query_context = ""
        if precedent_data.get("원본검색어"):
            user_query_context = f"- 사건 키워드: '{precedent_data.get('원본검색어')}'\n"

        user_prompt = f"""다음 비식별화된 법률 판례 및 승소 자료를 분석하여, '{lang_name}'로 바이럴 마케팅 콘텐츠를 작성해 줘.

[판례/승소 원문 정보 (개인정보 보호 조치 완료)]
{user_query_context}- 사건명: {precedent_data.get('사건명')}
- 사건번호: {precedent_data.get('사건번호')}
- 선고일자 / 법원: {precedent_data.get('선고일자')} ({precedent_data.get('법원명')} {precedent_data.get('판결유형', '')})
- 판시사항 / 사실관계:
{precedent_data.get('판시사항')}

- 판결요지 / 승소내용:
{precedent_data.get('판결요지')}

반드시 아래 섹션 헤더를 유지하여 마크다운 포맷으로 작성해:

📌 사건 요약 (3줄)
- (1행: 누가 누구에게 왜 분쟁을 제기했는지)
- (2행: 사건에서 문제가 된 핵심 쟁점과 사실관계)
- (3행: 법원이 최종적으로 누구의 손을 들어주었고 왜 그렇게 판단했는지)

🎬 유튜브 숏츠 / 릴스 30초 나레이션 대본
- [00~03초] (시선 강탈 후킹 한마디, 예: "사장님이 퇴직금 못 준다고요? 절대 속지 마세요!")
- [03~12초] (억울한 피해자의 상황과 상대방의 뻔뻔한 핑계)
- [12~22초] (대법원의 결정적인 반전 참교육 판결 논리)
- [22~30초] (법무법인 (미지정) 무료 상담 안내 및 마무리)

💡 대중 소통 및 블로그 제목 3선
1. (공감 및 호기심 유발형 제목)
2. (경각심 및 반전형 제목)
3. (해결 및 상담 유도형 제목)

🤝 법무법인 (미지정) 한마디
(비슷한 피해로 고통받는 의뢰인들에게 용기를 주고, 법무법인 (미지정)의 풍부한 승소 경험을 신뢰할 수 있게 전달하는 따뜻하고 든든한 맺음말)
"""

        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=user_prompt,
            config=dict(
                system_instruction=system_instruction,
                temperature=0.3,
            )
        )

        raw_text = response.text or ""

        # 3줄 요약 라인 추출
        summary_lines: List[str] = []
        is_extracting_summary = False

        for line in raw_text.splitlines():
            line_str = line.strip()
            if "📌 사건 요약" in line_str:
                is_extracting_summary = True
                continue
            if is_extracting_summary and (line_str.startswith("🎬") or line_str.startswith("💡") or line_str.startswith("🤝") or line_str.startswith("#")):
                is_extracting_summary = False
            if is_extracting_summary and line_str.startswith("-"):
                clean_bullet = line_str.lstrip("-").strip()
                if clean_bullet:
                    summary_lines.append(clean_bullet)

        if len(summary_lines) < 3:
            fallback_matches = re.findall(r"^-\s*(.+)$", raw_text, re.MULTILINE)
            summary_lines = fallback_matches[:3]

        return {
            "lang": lang,
            "raw_markdown": raw_text,
            "summary_lines": summary_lines,
        }

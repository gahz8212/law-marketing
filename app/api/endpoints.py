from typing import Optional, Dict, Any, List
import re
from fastapi import APIRouter, Query, HTTPException, status, Body, UploadFile, File, Form
import requests
from app.core.config import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE
from app.core.curated_cases import CURATED_THEMES
from app.services.law_service import LawService
from app.services.anonymizer import Anonymizer
from app.services.llm_service import LLMService
from app.services.tts_service import TTSService
from app.services.document_parser import DocumentParser
from app.schemas.probono import (
    ProBonoSummaryResponse,
    PrecedentInfo,
    AudioInfo,
    PrecedentListResponse,
    PrecedentListItem,
    ThemeDetailResponse,
    MarketingAssets,
    CustomCaseRequest,
    VoiceSynthesisRequest,
)
import copy
import time
from datetime import datetime

router = APIRouter()

# 사내 5대 핵심 승소 판례 고속 캐시 (0.005초 초고속 로딩)
THEME_DETAIL_CACHE: Dict[str, Any] = {}

# 사내 승소 판례 데이터베이스 (최신순 영구 누적 저장소)
# 기본 5대 승소 판례를 초기값으로 로드
CASE_STORE: List[Dict[str, Any]] = copy.deepcopy(CURATED_THEMES)

# ==============================================================================
# 1. 사내 자산화 5대 공익 테마 API (의뢰인 모바일 허브 & 마케터 AX 스튜디오)
# ==============================================================================

@router.get(
    "/themes",
    summary="사내 승소 판례 목록 조회 (최신순)",
    description="사내 DB에 저장된 판례를 최신순으로 반환합니다."
)
def get_themes(limit: int = Query(20, ge=1, le=50)):
    return {
        "success": True,
        "themes": [
            {
                "id": t["id"],
                "icon": t.get("icon", "⚖️"),
                "title": t["title"],
                "subtitle": t.get("subtitle", ""),
                "case_name": t.get("case_name", t["title"]),
                "case_no": t.get("case_no", "사내 승소"),
                "court_name": t.get("court_name", "법원"),
                "judgment_date": t.get("judgment_date", ""),
                "official_url": t.get("official_url", ""),
                "image_url": t.get("image_url", "/static/images/news_wage.jpg")
            }
            for t in CASE_STORE[:limit]
        ]
    }

@router.get(
    "/cases/search",
    summary="사내 판결문 조건 검색 (정확도순 / 최신순)",
    description="조건에 맞는 판결문을 검색하여 기차 레일에 배치할 5건을 반환합니다."
)
def search_cases(
    query: Optional[str] = Query("", description="검색 키워드"),
    sort: str = Query("accuracy", description="정렬 방식: accuracy (정확도순) 또는 latest (최신순)"),
    court: Optional[str] = Query(None, description="법원 필터"),
    limit: int = Query(5, ge=1, le=10)
):
    clean_q = (query or "").strip().lower()
    
    scored_cases = []
    for idx, case in enumerate(CASE_STORE):
        corpus = f"{case['title']} {case.get('subtitle', '')} {case.get('case_name', '')} {case.get('case_no', '')} {case.get('court_name', '')} {case.get('fact_summary', '')} {case.get('court_holding', '')}".lower()
        
        if court and court not in case.get("court_name", ""):
            continue
            
        if not clean_q:
            score = 1.0
        else:
            tokens = [t for t in clean_q.split() if len(t) >= 2]
            score = 0
            for t in tokens:
                if t in case.get("title", "").lower():
                    score += 5
                elif t in case.get("case_no", "").lower():
                    score += 4
                elif t in case.get("subtitle", "").lower():
                    score += 3
                elif t in corpus:
                    score += 1
            if score == 0:
                continue

        scored_cases.append({
            "case": case,
            "score": score,
            "index": idx
        })

    if sort == "latest":
        scored_cases.sort(key=lambda x: x["index"])
    else:
        scored_cases.sort(key=lambda x: (-x["score"], x["index"]))

    results = [item["case"] for item in scored_cases[:limit]]
    return {
        "success": True,
        "query": query,
        "sort": sort,
        "total_matched": len(scored_cases),
        "cases": [
            {
                "id": t["id"],
                "icon": t.get("icon", "⚖️"),
                "title": t["title"],
                "subtitle": t.get("subtitle", ""),
                "case_name": t.get("case_name", t["title"]),
                "case_no": t.get("case_no", "사내 승소"),
                "court_name": t.get("court_name", "법원"),
                "judgment_date": t.get("judgment_date", ""),
                "official_url": t.get("official_url", ""),
                "image_url": t.get("image_url", "/static/images/news_wage.jpg")
            }
            for t in results
        ]
    }

@router.get(
    "/themes/{theme_id}",
    response_model=ThemeDetailResponse,
    summary="공익 테마별 다국어 요약, 마케팅 에셋 및 TTS 음성 조회",
    description="특정 테마의 판례에 대해 다국어 3줄 요약, 블로그 제목 3선, 카드뉴스 문구 5장 및 gTTS 음성을 반환합니다."
)
def get_theme_detail(
    theme_id: str,
    lang: str = Query(DEFAULT_LANGUAGE, description="응답 언어 코드 ('ko', 'en', 'vi', 'zh', 'th', 'km', 'ur', 'uz')"),
    refresh: bool = Query(False, description="캐시를 갱신하고 새로운 카피를 재추천할지 여부")
):
    normalized_lang = lang.lower().strip()
    if normalized_lang not in SUPPORTED_LANGUAGES:
        valid_langs = ", ".join(SUPPORTED_LANGUAGES.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 언어 코드입니다: '{lang}'. 사용 가능: [{valid_langs}]"
        )

    cache_key = f"{theme_id}_{normalized_lang}"
    if not refresh and cache_key in THEME_DETAIL_CACHE:
        return THEME_DETAIL_CACHE[cache_key]

    theme = next((t for t in CASE_STORE if t["id"] == theme_id), None)
    if not theme:
        theme = CASE_STORE[0]

    # 판례 데이터 구조화
    prec_data = {
        "판례일련번호": f"curated_{theme_id}",
        "사건명": theme["case_name"],
        "사건번호": theme["case_no"],
        "선고일자": theme["judgment_date"],
        "법원명": theme["court_name"],
        "판결유형": "판결",
        "공식링크": theme["official_url"],
        "판시사항": theme["court_holding"],
        "판결요지": f"사실관계: {theme['fact_summary']}\n구제방안: {theme['remedy_guide']}",
    }

    # Gemini 요약 및 마케팅 카피 생성
    llm_result = LLMService.generate_probono_summary(prec_data, lang=normalized_lang)
    raw_md = llm_result["raw_markdown"]

    # 유튜브 숏츠 30초 대본 추출 및 신경망 AI 성우 음성 합성 (1.15배속)
    existing_cached = THEME_DETAIL_CACHE.get(cache_key)
    if refresh and existing_cached and getattr(existing_cached, "audio", None):
        audio_info = {
            "filename": existing_cached.audio.filename,
            "audio_url": existing_cached.audio.audio_url,
            "file_size": existing_cached.audio.file_size_bytes or 0
        }
    else:
        try:
            shorts_script_lines = []
            is_shorts = False
            for l in raw_md.split("\n"):
                if "유튜브 숏츠" in l:
                    is_shorts = True
                    continue
                if is_shorts and (l.startswith("💡") or l.startswith("🤝") or l.startswith("#")):
                    is_shorts = False
                if is_shorts and l.strip().startswith("-"):
                    clean_speech = re.sub(r"\[\d+~\d+초\]", "", l.strip().lstrip("-")).strip()
                    if clean_speech:
                        shorts_script_lines.append(clean_speech)

            audio_source_text = " ".join(shorts_script_lines) if shorts_script_lines else "\n".join(llm_result["summary_lines"])
            audio_info = TTSService.generate_shorts_audio(
                text=audio_source_text,
                prec_id=f"theme_{theme_id}",
                rate="+15%"
            )
        except Exception:
            audio_info = None

    # 마케팅 에셋 파싱
    blog_titles: List[str] = []
    persona = ""
    probono_msg = ""

    lines = raw_md.split("\n")
    collecting_titles = False
    for line in lines:
        if "대중 소통 및 블로그 제목" in line:
            collecting_titles = True
            continue
        if collecting_titles and (line.startswith("🤝") or line.startswith("#")):
            collecting_titles = False
        if collecting_titles and (line.strip().startswith("1.") or line.strip().startswith("2.") or line.strip().startswith("3.")):
            clean_title = line.strip().split(".", 1)[-1].strip().strip('"').strip("'")
            if clean_title:
                blog_titles.append(clean_title)

    if not blog_titles:
        blog_titles = [
            f"억울한 {theme['title']}, 법원은 누구의 편을 들어주었을까?",
            f"알아두면 힘이 되는 판례: {theme['title']} 핵심 3줄 요약",
            f"{theme['title']} 피해를 입으셨다면? 법무법인 무제 프로보노 상담 안내"
        ]

    card_news = [
        f"슬라이드 1: {theme['icon']} {theme['title']} 피해, 혼자 고민하지 마세요",
        f"슬라이드 2: 🚨 피해 상황: {theme['fact_summary']}",
        f"슬라이드 3: ⚖️ 대법원 판단: {theme['court_holding']}",
        f"슬라이드 4: 💡 권리 구제: {theme['remedy_guide']}",
        f"슬라이드 5: 🤝 법무법인 무제 프로보노 센터 무료 공익 상담 신청"
    ]

    res = ThemeDetailResponse(
        success=True,
        theme_id=theme["id"],
        theme_info=theme,
        lang=normalized_lang,
        summary_bullets=llm_result["summary_lines"],
        marketing=MarketingAssets(
            blog_titles=blog_titles,
            card_news=card_news,
            target_persona="외국인 노동자 및 권리 구제가 필요한 사회 취약계층",
            probono_message="법무법인 (미지정) 홍보팀은 승소 사례를 바탕으로 마케팅 콘텐츠를 자동 생성합니다."
        ),
        summary_markdown=llm_result["raw_markdown"],
        audio=AudioInfo(
            filename=audio_info["filename"],
            audio_url=audio_info["audio_url"],
            lang=normalized_lang,
            file_size_bytes=audio_info["file_size"]
        ) if audio_info else None
    )
    THEME_DETAIL_CACHE[cache_key] = res
    return res

@router.post(
    "/custom-case",
    response_model=ThemeDetailResponse,
    summary="변호사 전달 승소 판결문 직접 입력 ➔ 마케팅 에셋 생성",
    description="변호사가 전달한 판결문 원문 텍스트를 입력받아, 개인정보 비식별화 후 블로그 제목, 카드뉴스, 완성형 원고, TTS 음성을 일괄 생성합니다."
)
def process_custom_case(req: CustomCaseRequest):
    normalized_lang = req.lang.lower().strip()
    if normalized_lang not in SUPPORTED_LANGUAGES:
        normalized_lang = "ko"

    # 1. 개인정보 자동 비식별화 (Core Principle 2)
    clean_text = Anonymizer.anonymize_text(req.raw_text)

    # 2. 사건명 파악
    case_name = req.case_title or "승소 판결문 (변호사 전달 사건)"
    case_no = req.case_no or "사내 승소 판례"
    court = req.court_name or "법원"

    prec_data = {
        "판례일련번호": f"custom_{case_no}",
        "사건명": case_name,
        "사건번호": case_no,
        "선고일자": "최신 판결",
        "법원명": court,
        "판결유형": "판결",
        "공식링크": "https://www.law.go.kr",
        "판시사항": clean_text[:400],
        "판결요지": clean_text,
    }

    # 3. Gemini 요약 및 마케팅 카피 생성
    llm_result = LLMService.generate_probono_summary(prec_data, lang=normalized_lang)
    raw_md = llm_result["raw_markdown"]

    # 4. 유튜브 숏츠 30초 대본 추출 및 신경망 AI 성우 음성 합성
    try:
        shorts_script_lines = []
        is_shorts = False
        for l in raw_md.split("\n"):
            if "유튜브 숏츠" in l:
                is_shorts = True
                continue
            if is_shorts and (l.startswith("💡") or l.startswith("🤝") or l.startswith("#")):
                is_shorts = False
            if is_shorts and l.strip().startswith("-"):
                clean_speech = re.sub(r"\[\d+~\d+초\]", "", l.strip().lstrip("-")).strip()
                if clean_speech:
                    shorts_script_lines.append(clean_speech)

        audio_source_text = " ".join(shorts_script_lines) if shorts_script_lines else "\n".join(llm_result["summary_lines"])
        audio_info = TTSService.generate_shorts_audio(
            text=audio_source_text,
            prec_id="custom",
            rate="+15%"
        )
    except Exception:
        audio_info = None

    # 5. 블로그 제목 3선 및 카드뉴스 5장 추출
    blog_titles: List[str] = []
    lines = raw_md.split("\n")
    collecting_titles = False
    for line in lines:
        if "대중 소통 및 블로그 제목" in line:
            collecting_titles = True
            continue
        if collecting_titles and (line.startswith("🤝") or line.startswith("#")):
            collecting_titles = False
        if collecting_titles and (line.strip().startswith("1.") or line.strip().startswith("2.") or line.strip().startswith("3.")):
            clean_title = line.strip().split(".", 1)[-1].strip().strip('"').strip("'")
            if clean_title:
                blog_titles.append(clean_title)

    if not blog_titles:
        blog_titles = [
            f"억울하게 당할 뻔한 사건, 법무법인 무제가 뒤집어 승소한 비결",
            f"판결문으로 보는 진실: {case_name} 승소 3줄 핵심 요약",
            f"비슷한 피해를 입으셨다면? 지금 법무법인 무제 무료 법률상담 받으세요"
        ]

    card_news = [
        f"슬라이드 1: 🏆 [법무법인 무제 승소 사례] {case_name}",
        f"슬라이드 2: 🚨 피해 상황: {clean_text[:100]}...",
        f"슬라이드 3: ⚖️ 재판부 핵심 판결: {llm_result['summary_lines'][1] if len(llm_result['summary_lines']) > 1 else '의뢰인의 정당한 권리 전액 인정'}",
        f"슬라이드 4: 💡 권리 구제 기준: {llm_result['summary_lines'][2] if len(llm_result['summary_lines']) > 2 else '유사 피해 시 손해배상 청구 가능'}",
        f"슬라이드 5: 🤝 법무법인 무제 프로보노 센터 무료 공익 상담 신청"
    ]

    new_case_id = f"custom_{int(time.time()*1000)}"
    custom_theme_info = {
        "id": new_case_id,
        "icon": "📝",
        "title": case_name,
        "subtitle": f"{court} {case_no} 실무 승소 판례",
        "case_name": case_name,
        "case_no": case_no,
        "court_name": court,
        "judgment_date": datetime.now().strftime("%Y.%m.%d"),
        "official_url": "https://www.law.go.kr",
        "image_url": "/static/images/news_wage.jpg",
        "fact_summary": clean_text[:250],
        "court_holding": llm_result["summary_lines"][1] if len(llm_result["summary_lines"]) > 1 else "",
        "remedy_guide": llm_result["summary_lines"][2] if len(llm_result["summary_lines"]) > 2 else ""
    }
    CASE_STORE.insert(0, custom_theme_info)

    detail_res = ThemeDetailResponse(
        success=True,
        theme_id=new_case_id,
        theme_info=custom_theme_info,
        lang=normalized_lang,
        summary_bullets=llm_result["summary_lines"],
        marketing=MarketingAssets(
            blog_titles=blog_titles,
            card_news=card_news,
            target_persona="유사한 법률 분쟁으로 피해를 입은 잠재 의뢰인",
            probono_message="법무법인 무제는 풍부한 승소 경험을 바탕으로 여러분의 정당한 권리를 지켜드립니다."
        ),
        summary_markdown=llm_result["raw_markdown"],
        audio=AudioInfo(
            filename=audio_info["filename"],
            audio_url=audio_info["audio_url"],
            lang=normalized_lang,
            file_size_bytes=audio_info["file_size"]
        ) if audio_info else None
    )
    THEME_DETAIL_CACHE[f"{new_case_id}_{normalized_lang}"] = detail_res
    return detail_res

@router.post(
    "/upload-case",
    response_model=ThemeDetailResponse,
    summary="판결문 파일 업로드(PDF, HWP, HWPX, TXT) ➔ 마케팅 에셋 일괄 생성",
    description="변호사가 전달한 PDF, 한글(HWP, HWPX), TXT 파일에서 텍스트를 자동 추출하고 개인정보 비식별화 후 마케팅 에셋을 생성합니다."
)
async def upload_case_file(
    file: UploadFile = File(...),
    case_title: Optional[str] = Form(None),
    court_name: Optional[str] = Form("법원"),
    lang: str = Form("ko")
):
    contents = await file.read()
    raw_text = DocumentParser.extract_text(contents, file.filename)
    if not raw_text or len(raw_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"파일 '{file.filename}'에서 유효한 텍스트를 추출하지 못했습니다."
        )

    # 1. 개인정보 비식별화
    clean_text = Anonymizer.anonymize_text(raw_text)

    # 2. 문서 첫 페이지에서 사건번호, 법원명, 사건명 자동 추출 (수기 타이핑 불필요)
    extracted_case_no = None
    extracted_court = None
    extracted_title = None

    # 사건번호 패턴 (예: 2025가단12345, 2024두39189, 2023노1234 등)
    case_no_match = re.search(r"(\d{4}\s*[가-힣]{1,3}\s*\d+)", clean_text[:1200])
    if case_no_match:
        extracted_case_no = re.sub(r"\s+", "", case_no_match.group(1))

    # 법원명 패턴 (예: 서울중앙지방법원, 수원지방법원, 대법원 등)
    court_match = re.search(r"(대법원|[가-힣]{2,6}(?:고등|지방|행정|가정|회생)?법원)", clean_text[:1200])
    if court_match:
        extracted_court = court_match.group(1).strip()

    # 사건명 패턴 (예: 사 건 2025가단12345 손해배상(기))
    title_match = re.search(r"(?:사\s*건|사건명)\s*[:\s]*\d{4}\s*[가-힣]{1,3}\s*\d+\s+([가-힣\s()·]+)", clean_text[:1200])
    if title_match:
        extracted_title = title_match.group(1).strip().split("\n")[0][:40]

    case_name = case_title or extracted_title or file.filename.rsplit(".", 1)[0]
    case_no = extracted_case_no or "사내 승소 판례"
    court = court_name if (court_name and court_name != "법원") else (extracted_court or "법원")

    prec_data = {
        "판례일련번호": f"file_{file.filename}",
        "사건명": case_name,
        "사건번호": case_no,
        "선고일자": "최신 승소",
        "법원명": court,
        "판결유형": "판결",
        "공식링크": "https://www.law.go.kr",
        "판시사항": clean_text[:400],
        "판결요지": clean_text[:3000],
    }

    normalized_lang = lang.lower().strip()
    if normalized_lang not in SUPPORTED_LANGUAGES:
        normalized_lang = "ko"

    # 3. Gemini 요약 및 마케팅 카피 생성
    llm_result = LLMService.generate_probono_summary(prec_data, lang=normalized_lang)
    raw_md = llm_result["raw_markdown"]

    # 4. 유튜브 숏츠 30초 대본 추출 및 신경망 AI 성우 음성 합성
    try:
        shorts_script_lines = []
        is_shorts = False
        for l in raw_md.split("\n"):
            if "유튜브 숏츠" in l:
                is_shorts = True
                continue
            if is_shorts and (l.startswith("💡") or l.startswith("🤝") or l.startswith("#")):
                is_shorts = False
            if is_shorts and l.strip().startswith("-"):
                clean_speech = re.sub(r"\[\d+~\d+초\]", "", l.strip().lstrip("-")).strip()
                if clean_speech:
                    shorts_script_lines.append(clean_speech)

        audio_source_text = " ".join(shorts_script_lines) if shorts_script_lines else "\n".join(llm_result["summary_lines"])
        audio_info = TTSService.generate_shorts_audio(
            text=audio_source_text,
            prec_id="upload",
            rate="+15%"
        )
    except Exception:
        audio_info = None

    # 5. 블로그 제목 3선 및 카드뉴스 5장 추출
    blog_titles: List[str] = []
    lines = raw_md.split("\n")
    collecting_titles = False
    for line in lines:
        if "대중 소통 및 블로그 제목" in line:
            collecting_titles = True
            continue
        if collecting_titles and (line.startswith("🤝") or line.startswith("#")):
            collecting_titles = False
        if collecting_titles and (line.strip().startswith("1.") or line.strip().startswith("2.") or line.strip().startswith("3.")):
            clean_title = line.strip().split(".", 1)[-1].strip().strip('"').strip("'")
            if clean_title:
                blog_titles.append(clean_title)

    if not blog_titles:
        blog_titles = [
            f"억울했던 사건, 법무법인 무제가 뒤집어 승소한 결정적 비결",
            f"판결문으로 보는 진실: {case_name} 승소 3줄 핵심 요약",
            f"비슷한 피해를 입으셨다면? 지금 법무법인 무제 무료 법률상담 받으세요"
        ]

    card_news = [
        f"슬라이드 1: 🏆 [법무법인 무제 승소 사례] {case_name}",
        f"슬라이드 2: 🚨 피해 상황: {clean_text[:100]}...",
        f"슬라이드 3: ⚖️ 재판부 핵심 판결: {llm_result['summary_lines'][1] if len(llm_result['summary_lines']) > 1 else '의뢰인의 정당한 권리 전액 인정'}",
        f"슬라이드 4: 💡 권리 구제 기준: {llm_result['summary_lines'][2] if len(llm_result['summary_lines']) > 2 else '유사 피해 시 손해배상 청구 가능'}",
        f"슬라이드 5: 🤝 법무법인 무제 프로보노 센터 무료 공익 상담 신청"
    ]

    new_case_id = f"file_{int(time.time()*1000)}"
    custom_theme_info = {
        "id": new_case_id,
        "icon": "📁",
        "title": case_name,
        "subtitle": f"{file.filename} 파일 기반 승소 분석",
        "case_name": case_name,
        "case_no": case_no,
        "court_name": court,
        "judgment_date": datetime.now().strftime("%Y.%m.%d"),
        "official_url": "https://www.law.go.kr",
        "image_url": "/static/images/news_wage.jpg",
        "fact_summary": clean_text[:250],
        "court_holding": llm_result["summary_lines"][1] if len(llm_result["summary_lines"]) > 1 else "",
        "remedy_guide": llm_result["summary_lines"][2] if len(llm_result["summary_lines"]) > 2 else ""
    }
    CASE_STORE.insert(0, custom_theme_info)

    detail_res = ThemeDetailResponse(
        success=True,
        theme_id=new_case_id,
        theme_info=custom_theme_info,
        lang=normalized_lang,
        summary_bullets=llm_result["summary_lines"],
        marketing=MarketingAssets(
            blog_titles=blog_titles,
            card_news=card_news,
            target_persona="유사한 법률 분쟁으로 피해를 입은 잠재 의뢰인",
            probono_message="법무법인 무제는 풍부한 승소 경험을 바탕으로 여러분의 정당한 권리를 지켜드립니다."
        ),
        summary_markdown=llm_result["raw_markdown"],
        audio=AudioInfo(
            filename=audio_info["filename"],
            audio_url=audio_info["audio_url"],
            lang=normalized_lang,
            file_size_bytes=audio_info["file_size"]
        ) if audio_info else None
    )
    THEME_DETAIL_CACHE[f"{new_case_id}_{normalized_lang}"] = detail_res
    return detail_res

@router.post(
    "/synthesize-voice",
    response_model=AudioInfo,
    summary="선택한 성우(성별/연령)로 숏츠 음성 즉시 재합성",
    description="선택한 성우 보이스(female_2030, male_3040, male_2030)로 1초 만에 음성을 재합성합니다."
)
def synthesize_voice(req: VoiceSynthesisRequest):
    audio_info = TTSService.generate_shorts_audio(
        text=req.text,
        prec_id=req.prec_id,
        voice_type=req.voice_type
    )
    if not audio_info:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="음성 합성에 실패했습니다."
        )

    return AudioInfo(
        filename=audio_info["filename"],
        audio_url=audio_info["audio_url"],
        lang="ko",
        file_size_bytes=audio_info["file_size"]
    )


# ==============================================================================
# 2. 마케터 n8n 자동 배포 웹훅 트리거 API
# ==============================================================================

@router.post(
    "/publish",
    summary="마케팅 콘텐츠 n8n 자동 배포 트리거",
    description="생성된 블로그 원고 및 오디오를 n8n 워크플로우 및 슬랙 웹훅으로 전송하여 자동 배포합니다."
)
def publish_to_n8n(payload: Dict[str, Any] = Body(...)):
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/probono-trigger")
    slack_webhook_url = payload.get("slack_webhook_url")
    
    results = {
        "success": True,
        "n8n_triggered": False,
        "slack_sent": False,
        "messages": [],
    }

    # 1. 실제 슬랙 웹훅 URL이 있으면 즉시 실시간 슬랙 알림 발송
    if slack_webhook_url and slack_webhook_url.startswith("https://hooks.slack.com/"):
        try:
            blog_title = payload.get("blog_title") or payload.get("theme_title", "법률 판례 마케팅")
            theme_title = payload.get("theme_title", "")
            audio_url = payload.get("audio_url", "음성 미포함")
            official_url = payload.get("official_url", "")
            card_count = len(payload.get("card_news") or [])

            slack_data = {
                "text": f"📢 [신규 법률 콘텐츠 자동 발행] {theme_title}",
                "blocks": [
                    {
                        "type": "header",
                        "text": {"type": "plain_text", "text": "⚖️ 신규 법률 마케팅 콘텐츠 자동 배포 완료"}
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*📌 판례 테마:*\n{theme_title}"},
                            {"type": "mrkdwn", "text": f"*📊 카드뉴스:*\n총 {card_count}장 제작 완료"}
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*📝 선정 블로그 후킹 제목:*\n> {blog_title}"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*🎙️ AI 성우 숏츠 MP3:*\n<{audio_url}|오디오 재생 링크>"},
                            {"type": "mrkdwn", "text": f"*🏛️ 대법원 원문:*\n<{official_url}|판결문 대조 열람>"}
                        ]
                    }
                ]
            }
            s_resp = requests.post(slack_webhook_url, json=slack_data, timeout=5)
            if s_resp.status_code == 200:
                results["slack_sent"] = True
                results["messages"].append("🟢 실제 슬랙 채널로 마케팅 승인 알림이 성공적으로 발송되었습니다!")
        except Exception as se:
            results["messages"].append(f"⚠️ 슬랙 전송 실패: {str(se)}")

    # 2. n8n 워크플로우 웹훅 트리거 시도
    try:
        resp = requests.post(n8n_webhook_url, json=payload, timeout=3)
        if resp.status_code in [200, 201]:
            results["n8n_triggered"] = True
            results["messages"].append("🟢 n8n 자동화 워크플로우에 성공적으로 전달되어 자동 포스팅이 실행되었습니다.")
        else:
            results["messages"].append(f"n8n 응답 코드: {resp.status_code}")
    except Exception as ne:
        results["messages"].append("ℹ️ n8n 서버(포트 5678) 대기 중 (마케팅 에셋 패키징 완료)")

    final_msg = " / ".join(results["messages"]) if results["messages"] else "자동 배포 처리가 완료되었습니다."
    return {
        "success": True,
        "message": final_msg,
        "details": results,
        "payload_preview": {
            "theme_id": payload.get("theme_id"),
            "blog_title": payload.get("blog_title"),
            "audio_url": payload.get("audio_url"),
        }
    }

# ==============================================================================
# 3. 기존 판례 검색 & 요약 API (호환 유지)
# ==============================================================================

@router.get("/search", response_model=PrecedentListResponse)
def search_precedents(
    query: str = Query("손해배상"),
    limit: int = Query(5, ge=1, le=10)
):
    clean_q = query.strip().lower()
    items: List[PrecedentListItem] = []

    # 1. 사내 5대 핵심 승소 자산 우선 검색 (지능형 키워드 매칭)
    for theme in CURATED_THEMES:
        corpus = f"{theme['title']} {theme['subtitle']} {theme['case_name']} {theme['case_no']} {theme['fact_summary']} {theme['court_holding']}".lower()
        tokens = [t for t in clean_q.split() if len(t) >= 2]
        if not tokens or any(t in corpus for t in tokens):
            items.append(
                PrecedentListItem(
                    prec_id=f"curated_{theme['id']}",
                    case_name=f"🏆 [사내 승소] {theme['title']}",
                    case_no=theme["case_no"],
                    judgment_date=theme["judgment_date"],
                    court_name=theme["court_name"],
                    case_type="사내 승소 자산",
                    official_url=theme["official_url"],
                    snippet=f"{theme['subtitle']} - {theme['fact_summary'][:80]}..."
                )
            )

    # 2. 외부 공공 법령 판례 보충 검색
    try:
        result = LawService.search_precedent_list(query=query, limit=limit)
        for item in result.get("precedents", []):
            if len(items) >= limit + 2:
                break
            items.append(
                PrecedentListItem(
                    prec_id=item["prec_id"],
                    case_name=item["case_name"],
                    case_no=item["case_no"],
                    judgment_date=item["judgment_date"],
                    court_name=item["court_name"],
                    case_type=item.get("case_type"),
                    official_url=item["official_url"],
                    snippet=item["snippet"]
                )
            )
        matched_kw = result.get("matched_keyword") or query
    except Exception:
        matched_kw = query

    return PrecedentListResponse(
        success=True,
        query=query,
        matched_keyword=matched_kw,
        total_count=len(items),
        precedents=items
    )

@router.get("/summarize", response_model=ProBonoSummaryResponse)
def summarize_probono(
    query: Optional[str] = Query(None),
    prec_id: Optional[str] = Query(None),
    lang: str = Query(DEFAULT_LANGUAGE)
):
    normalized_lang = lang.lower().strip()
    raw_precedent = None
    if prec_id:
        raw_precedent = LawService.get_precedent_by_id(prec_id)
        if raw_precedent:
            raw_precedent["매칭키워드"] = query or raw_precedent["사건명"]
    elif query:
        raw_precedent = LawService.search_precedent(query=query)
    else:
        raw_precedent = LawService.search_precedent(query="손해배상")

    if not raw_precedent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="판례를 찾을 수 없습니다."
        )

    anonymized = Anonymizer.anonymize_precedent(raw_precedent)
    llm_result = LLMService.generate_probono_summary(anonymized, lang=normalized_lang)

    try:
        combined_text = "\n".join(llm_result["summary_lines"])
        audio_info = TTSService.generate_audio(
            text=combined_text,
            prec_id=raw_precedent["판례일련번호"],
            lang=normalized_lang
        )
    except Exception:
        audio_info = None

    return ProBonoSummaryResponse(
        success=True,
        query=query or raw_precedent["사건명"],
        matched_keyword=raw_precedent.get("매칭키워드"),
        lang=normalized_lang,
        precedent=PrecedentInfo(
            prec_id=raw_precedent["판례일련번호"],
            case_name=raw_precedent["사건명"],
            case_no=raw_precedent["사건번호"],
            judgment_date=raw_precedent["선고일자"],
            court_name=raw_precedent["법원명"],
            case_type=raw_precedent.get("사건종류명"),
            official_url=raw_precedent["공식링크"]
        ),
        anonymization_applied=True,
        summary_markdown=llm_result["raw_markdown"],
        summary_bullets=llm_result["summary_lines"],
        audio=AudioInfo(
            filename=audio_info["filename"],
            audio_url=audio_info["audio_url"],
            lang=normalized_lang,
            file_size_bytes=audio_info["file_size"]
        ) if audio_info else None
    )

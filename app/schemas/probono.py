from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PrecedentInfo(BaseModel):
    prec_id: str = Field(..., description="국가법령정보센터 판례일련번호")
    case_name: str = Field(..., description="사건명")
    case_no: str = Field(..., description="사건번호")
    judgment_date: str = Field(..., description="선고일자")
    court_name: str = Field(..., description="법원명")
    case_type: Optional[str] = Field(None, description="사건종류명 (민사, 형사 등)")
    official_url: str = Field(..., description="국가법령정보센터 공식 웹 조회 URL")

class PrecedentListItem(PrecedentInfo):
    snippet: str = Field("", description="판례 본문(판시사항/판결요지) 핵심 요약 스니펫")

class AudioInfo(BaseModel):
    filename: str = Field(..., description="생성된 오디오 파일명")
    audio_url: str = Field(..., description="오디오 파일 접근 상대 URL")
    lang: str = Field(..., description="음성 언어 코드")
    file_size_bytes: int = Field(..., description="오디오 파일 크기(바이트)")

class MarketingAssets(BaseModel):
    blog_titles: List[str] = Field(default_factory=list, description="후킹한 블로그/SNS 제목 3선")
    card_news: List[str] = Field(default_factory=list, description="인스타그램 카드뉴스 5장 문구")
    target_persona: str = Field("", description="타겟 잠재 의뢰인 페르소나")
    probono_message: str = Field("", description="법무법인 무제 공익지원센터 안내 문구")

class PrecedentListResponse(BaseModel):
    success: bool = Field(True, description="성공 여부")
    query: str = Field(..., description="원본 검색어")
    matched_keyword: Optional[str] = Field(None, description="실제 매칭된 검색 키워드")
    total_count: int = Field(0, description="전체 검색된 판례 수")
    precedents: List[PrecedentListItem] = Field(default_factory=list, description="상위 판례 목록")

class CustomCaseRequest(BaseModel):
    case_title: Optional[str] = Field(None, description="사건명 (미입력 시 AI가 자동 추출)")
    case_no: Optional[str] = Field(None, description="사건번호")
    court_name: Optional[str] = Field("대법원", description="법원명")
    raw_text: Optional[str] = Field(None, description="변호사가 전달한 판결문 본문 텍스트 (사건번호 입력 시 자동 조회 가능)")
    lang: str = Field("ko", description="응답 언어 코드")

class VoiceSynthesisRequest(BaseModel):
    text: str = Field(..., min_length=5, description="합성할 숏츠 나레이션 텍스트")
    prec_id: str = Field("custom", description="판례 식별자")
    voice_type: str = Field("female_2030", description="선택 성우 키: female_2030, male_3040, male_2030")

class ThemeDetailResponse(BaseModel):
    success: bool = True
    theme_id: str
    theme_info: Dict[str, Any]
    lang: str
    summary_bullets: List[str]
    marketing: MarketingAssets
    summary_markdown: str
    audio: Optional[AudioInfo] = None

class ProBonoSummaryResponse(BaseModel):
    success: bool = Field(True, description="요청 처리 성공 여부")
    query: str = Field(..., description="검색 키워드")
    matched_keyword: Optional[str] = Field(None, description="실제 판례 매칭에 사용된 키워드 (지능형 키워드 확장 시)")
    lang: str = Field(..., description="응답 언어 코드")
    precedent: PrecedentInfo = Field(..., description="공식 판례 출처 및 메타데이터")
    anonymization_applied: bool = Field(True, description="개인정보 비식별화 적용 여부")
    summary_markdown: str = Field(..., description="Gemini 프로보노 다국어 요약 전문")
    summary_bullets: List[str] = Field(default_factory=list, description="사건 요약 3줄 리스트")
    audio: Optional[AudioInfo] = Field(None, description="TTS 생성 음성 파일 메타데이터 (미지원 언어의 경우 None)")

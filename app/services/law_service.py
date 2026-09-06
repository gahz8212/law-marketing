import re
from typing import Optional, Dict, Any, List
import requests
import xmltodict
from app.core.config import LAW_API_KEY, LLM_API_KEY, DEFAULT_GEMINI_MODEL
from google import genai

import urllib.parse

class LawService:
    """
    [Core Principle 1] 출처의 신빙성 보장 모듈
    국가법령정보센터 공식 OpenAPI(DRF)를 직접 호출하여 판례 데이터를 수집하고,
    검증 가능한 공식 웹 조회 URL을 생성합니다.
    의도 기반 정밀 키워드 도출(Intent Rewriting) 및 노이즈(마약, 방화, 살인 등 엉뚱한 범죄) 자동 필터링 기능 탑재.
    """

    SEARCH_URL = "https://www.law.go.kr/DRF/lawSearch.do"
    SERVICE_URL = "https://www.law.go.kr/DRF/lawService.do"
    OFFICIAL_VIEW_BASE = "https://www.law.go.kr/LSW/precInfoP.do?precSeq="
    OFFICIAL_WEB_BASE = "https://www.law.go.kr/precSc.do?menuId=7&query="

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.law.go.kr"
    }

    # 사용자가 직접 묻지 않았는데 검색될 수 있는 노이즈 범죄 키워드 목록
    NOISE_CRIMES = ["마약", "향정", "메트암페타민", "필로폰", "방화", "현주건조물방화", "살인", "강도", "성폭력", "강제추행"]

    @staticmethod
    def clean_text(text: Optional[str]) -> str:
        """HTML 태그 및 연속 공백 정제"""
        if not text:
            return ""
        text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @classmethod
    def get_official_url(cls, prec_id: str) -> str:
        """국가법령정보센터 공식 판례 웹페이지 판결문 뷰어 직접 조회 링크 생성"""
        if prec_id and str(prec_id).isdigit():
            return f"{cls.OFFICIAL_VIEW_BASE}{prec_id}"
        return f"{cls.OFFICIAL_WEB_BASE}{urllib.parse.quote(str(prec_id))}"

    @classmethod
    def get_intent_keywords(cls, user_query: str) -> List[str]:
        """
        사용자의 일상 검색어(예: '아파트 담배연기 피해')에서 실제 법률 분쟁 의도를 파악하여
        국가법령정보센터 본문 검색에서 정확히 적중할 정밀 법률 키워드를 도출합니다.
        """
        candidates: List[str] = []

        if LLM_API_KEY:
            try:
                client = genai.Client(api_key=LLM_API_KEY)
                prompt = (
                    f"사용자가 법률 판례를 찾기 위해 다음 검색어를 입력했습니다: '{user_query}'\n"
                    "이 검색어를 법령정보센터에 그대로 넣으면 단어 조합으로 인해 '마약 투약 연기', '방화 연기' 같은 엉뚱한 형사 판례가 나옵니다.\n"
                    "사용자가 실제로 겪는 분쟁 유형(예: 간접흡연, 층간소음, 누수 손해배상 등)을 충족할 수 있는 "
                    "대한민국 법원 판례 본문 검색용 핵심 키워드 1~4개를 쉼표로만 출력하세요.\n"
                    "예: '아파트 담배연기 피해' -> 간접흡연 손해배상, 흡연 손해배상, 간접흡연\n"
                    "예: '상사가 욕설 폭언해요' -> 직장 내 괴롭힘 손해배상, 모욕죄\n"
                    "반드시 쉼표로만 구분해 출력할 것."
                )
                resp = client.models.generate_content(
                    model=DEFAULT_GEMINI_MODEL,
                    contents=prompt
                )
                text = resp.text.strip()
                for token in text.split(","):
                    clean_token = token.strip().replace("'", "").replace('"', '')
                    if clean_token and clean_token not in candidates and clean_token != user_query:
                        candidates.append(clean_token)
            except Exception:
                pass

        return candidates

    @classmethod
    def get_precedent_by_id(cls, prec_id: str) -> Optional[Dict[str, Any]]:
        """판례일련번호(ID)로 단건 상세 정보를 조회합니다."""
        if not LAW_API_KEY:
            raise ValueError("LAW_API_KEY가 설정되지 않았습니다.")

        detail_params = {
            "OC": LAW_API_KEY,
            "target": "prec",
            "ID": prec_id,
            "type": "XML"
        }

        try:
            resp = requests.get(cls.SERVICE_URL, params=detail_params, headers=cls.HEADERS, timeout=8)
            resp.raise_for_status()
            detail_dict = xmltodict.parse(resp.text)
        except Exception:
            return None

        prec_detail = detail_dict.get("PrecService")
        if not prec_detail:
            return None

        case_name = prec_detail.get("사건명")
        issues = prec_detail.get("판시사항")
        summary = prec_detail.get("판결요지")

        if case_name and (issues or summary):
            return {
                "판례일련번호": str(prec_id),
                "사건명": cls.clean_text(case_name),
                "사건번호": cls.clean_text(prec_detail.get("사건번호")),
                "선고일자": cls.clean_text(prec_detail.get("선고일자")),
                "법원명": cls.clean_text(prec_detail.get("법원명")),
                "사건종류명": cls.clean_text(prec_detail.get("사건종류명")),
                "판결유형": cls.clean_text(prec_detail.get("판결유형")),
                "공식링크": cls.get_official_url(str(prec_id)),
                "판시사항": cls.clean_text(issues),
                "판결요지": cls.clean_text(summary),
            }
        return None

    @classmethod
    def get_precedent_by_case_no(cls, case_no: str) -> Optional[Dict[str, Any]]:
        """사건번호(예: 2021도1833, 2024다208261)로 국가법령정보센터 판례를 직접 검색하여 상세 정보를 반환합니다."""
        if not LAW_API_KEY:
            return None

        clean_no = case_no.strip()
        search_params = {
            "OC": LAW_API_KEY,
            "target": "prec",
            "type": "XML",
            "query": clean_no,
        }

        try:
            resp = requests.get(cls.SEARCH_URL, params=search_params, headers=cls.HEADERS, timeout=8)
            resp.raise_for_status()
            search_dict = xmltodict.parse(resp.text)
            prec_search = search_dict.get("PrecSearch", {})
            prec_items = prec_search.get("prec", [])
            if isinstance(prec_items, dict):
                prec_items = [prec_items]

            for item in prec_items:
                prec_id = item.get("판례일련번호")
                if not prec_id:
                    continue
                detail = cls.get_precedent_by_id(str(prec_id))
                if detail:
                    c_no = detail.get("사건번호", "").replace(" ", "")
                    q_no = clean_no.replace(" ", "")
                    if q_no in c_no or c_no in q_no:
                        return detail
            if prec_items:
                first_id = prec_items[0].get("판례일련번호")
                if first_id:
                    return cls.get_precedent_by_id(str(first_id))
        except Exception as e:
            print(f"[LawService] get_precedent_by_case_no error: {e}")
            return None
        return None

    @classmethod
    def is_irrelevant_noise(cls, user_query: str, case_name: str, snippet: str) -> bool:
        """사용자가 직접 묻지 않은 흉악 범죄/마약 사건 등 오매칭 판례 필터링"""
        combined = (case_name + " " + snippet).lower()
        query_lower = user_query.lower()

        for crime in cls.NOISE_CRIMES:
            if crime not in query_lower and crime in combined:
                return True
        return False

    @classmethod
    def search_precedent_list(cls, query: str, limit: int = 5) -> Dict[str, Any]:
        """
        판례 본문 전체(search=2)를 검색하여 사용자의 의도에 부합하는 상위 판례 목록을 반환합니다.
        유효한 판례가 나올 때까지 의도 기반 정밀 키워드들을 순차 탐색합니다.
        """
        if not LAW_API_KEY:
            raise ValueError("LAW_API_KEY가 설정되지 않았습니다.")

        clean_query = query.strip()
        words = clean_query.split()

        # 검색 쿼리 후보군 구성
        search_terms: List[str] = []
        if len(words) >= 2:
            intent_keywords = cls.get_intent_keywords(clean_query)
            search_terms.extend(intent_keywords)
        search_terms.append(clean_query)

        def _fetch_list_for_term(term: str):
            search_params = {
                "OC": LAW_API_KEY,
                "target": "prec",
                "type": "XML",
                "search": "2",
                "query": term,
            }
            try:
                resp = requests.get(cls.SEARCH_URL, params=search_params, headers=cls.HEADERS, timeout=8)
                resp.raise_for_status()
                search_dict = xmltodict.parse(resp.text)
                prec_search = search_dict.get("PrecSearch", {})
                total_cnt = int(prec_search.get("totalCnt", 0))
                prec_items = prec_search.get("prec", [])
                if isinstance(prec_items, dict):
                    prec_items = [prec_items]
                return total_cnt, prec_items
            except Exception:
                return 0, []

        final_total_count = 0
        final_matched_term = clean_query
        final_items: List[Dict[str, Any]] = []

        # 각 검색어 후보를 검토하여 실제 본문이 있고 노이즈가 아닌 판례가 수집될 때까지 탐색
        for term in search_terms:
            t_cnt, r_items = _fetch_list_for_term(term)
            if t_cnt == 0 or not r_items:
                continue

            current_term_items = []
            for raw in r_items[:limit + 10]:
                if len(current_term_items) >= limit:
                    break

                prec_id = raw.get("판례일련번호")
                if not prec_id:
                    continue

                detail = cls.get_precedent_by_id(str(prec_id))
                if not detail:
                    continue

                full_text = detail.get("판결요지") or detail.get("판시사항") or ""
                snippet_clean = re.sub(r"\s+", " ", full_text).strip()
                snippet = snippet_clean[:120] + "..." if len(snippet_clean) > 120 else snippet_clean

                # 마약/방화 등 엉뚱한 범죄 노이즈 필터링
                if cls.is_irrelevant_noise(clean_query, detail["사건명"], snippet):
                    continue

                current_term_items.append({
                    "prec_id": detail["판례일련번호"],
                    "case_name": detail["사건명"],
                    "case_no": detail["사건번호"],
                    "judgment_date": detail["선고일자"],
                    "court_name": detail["법원명"],
                    "case_type": detail.get("사건종류명"),
                    "official_url": detail["공식링크"],
                    "snippet": snippet,
                })

            if len(current_term_items) > 0:
                final_total_count = t_cnt
                final_matched_term = term
                final_items = current_term_items
                break

        return {
            "query": clean_query,
            "matched_keyword": final_matched_term,
            "total_count": final_total_count,
            "precedents": final_items
        }

    @classmethod
    def search_precedent(cls, query: str = "손해배상") -> Optional[Dict[str, Any]]:
        """기존 단건 검색 호환용 메서드"""
        list_res = cls.search_precedent_list(query, limit=1)
        items = list_res.get("precedents", [])
        if not items:
            return None

        first_id = items[0]["prec_id"]
        detail = cls.get_precedent_by_id(first_id)
        if detail:
            detail["매칭키워드"] = list_res.get("matched_keyword")
            if list_res.get("matched_keyword") != query:
                detail["원본검색어"] = query
        return detail

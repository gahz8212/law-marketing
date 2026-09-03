import os
import re
import sys
import requests
import xmltodict
from dotenv import load_dotenv

# 텍스트 내 HTML 태그 및 중복 공백 정리 유틸리티
def clean_text(text: str) -> str:
    if not text:
        return ""
    # <br/>, <br> 태그를 줄바꿈으로 변경
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    # 기타 HTML 태그 제거
    text = re.sub(r"<[^>]+>", "", text)
    # 연속 줄바꿈 정리
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def fetch_latest_precedent(query: str = "손해배상"):
    load_dotenv()
    law_api_key = os.getenv("LAW_API_KEY")
    if not law_api_key:
        print("[ERROR] .env 파일에 LAW_API_KEY가 설정되어 있지 않습니다.")
        sys.exit(1)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.law.go.kr"
    }

    print("=" * 70)
    print(f"[Phase 1 - 3단계] 국가법령정보센터 OpenAPI 판례 데이터 수집 및 파싱")
    print(f"검색 키워드: '{query}'")
    print("=" * 70)

    # 1. 판례 목록 검색 (lawSearch.do)
    search_url = "https://www.law.go.kr/DRF/lawSearch.do"
    search_params = {
        "OC": law_api_key,
        "target": "prec",
        "type": "XML",
        "query": query,
    }

    print("\n[1] 판례 목록 검색 요청 중...")
    try:
        search_res = requests.get(search_url, params=search_params, headers=headers, timeout=10)
        search_res.raise_for_status()
    except Exception as e:
        print(f"[ERROR] API 목록 요청 실패: {e}")
        sys.exit(1)

    try:
        search_dict = xmltodict.parse(search_res.text)
    except Exception as e:
        print(f"[ERROR] XML 파싱 실패: {e}")
        sys.exit(1)

    prec_search = search_dict.get("PrecSearch")
    if not prec_search:
        # 혹시 에러 응답인지 확인
        resp_tag = search_dict.get("Response", {})
        if resp_tag:
            print(f"[API 응답 오류] {resp_tag.get('result')}: {resp_tag.get('msg')}")
        else:
            print(f"[ERROR] 예상치 못한 응답 구조: {search_res.text[:300]}")
        sys.exit(1)

    total_cnt = prec_search.get("totalCnt", 0)
    print(f"  - 검색 성공: 총 {total_cnt}건 검색됨.")

    prec_list = prec_search.get("prec", [])
    if not prec_list:
        print("[INFO] 검색된 판례가 없습니다.")
        return None

    if isinstance(prec_list, dict):
        prec_list = [prec_list]

    # 2. 본문 상세 정보(판결요지, 판시사항)가 존재하는 최신 판례 탐색 (lawService.do)
    print("\n[2] 최신 판례 상세 본문 조회 중...")
    service_url = "https://www.law.go.kr/DRF/lawService.do"

    selected_prec = None
    for item in prec_list:
        prec_id = item.get("판례일련번호")
        if not prec_id:
            continue

        detail_params = {
            "OC": law_api_key,
            "target": "prec",
            "ID": prec_id,
            "type": "XML"
        }

        try:
            detail_res = requests.get(service_url, params=detail_params, headers=headers, timeout=10)
            detail_res.raise_for_status()
            detail_dict = xmltodict.parse(detail_res.text)
        except Exception:
            continue

        prec_detail = detail_dict.get("PrecService")
        if not prec_detail:
            continue

        case_name = prec_detail.get("사건명")
        case_no = prec_detail.get("사건번호")
        issues = prec_detail.get("판시사항")
        summary = prec_detail.get("판결요지")

        # 판시사항이나 판결요지가 존재하는 경우 선정
        if case_name and (issues or summary):
            selected_prec = {
                "판례일련번호": prec_id,
                "사건명": clean_text(case_name),
                "사건번호": clean_text(case_no),
                "선고일자": clean_text(prec_detail.get("선고일자")),
                "법원명": clean_text(prec_detail.get("법원명")),
                "사건종류명": clean_text(prec_detail.get("사건종류명")),
                "판결유형": clean_text(prec_detail.get("판결유형")),
                "판시사항": clean_text(issues),
                "판결요지": clean_text(summary),
            }
            break

    if not selected_prec:
        print("[ERROR] 유효한 상세 본문(판결요지/판시사항)을 가진 판례를 찾을 수 없습니다.")
        sys.exit(1)

    # 3. 추출 데이터 출력
    print("\n" + "=" * 70)
    print("[3] 판례 핵심 필드 추출 결과")
    print("=" * 70)
    print(f"■ 판례일련번호 : {selected_prec['판례일련번호']}")
    print(f"■ 사건명       : {selected_prec['사건명']}")
    print(f"■ 사건번호     : {selected_prec['사건번호']}")
    print(f"■ 선고일자     : {selected_prec['선고일자']} ({selected_prec['법원명']} {selected_prec['판결유형']})")
    print(f"■ 사건종류     : {selected_prec['사건종류명']}")
    print("-" * 70)

    print("■ [판시사항]:")
    if selected_prec['판시사항']:
        # 가독성을 위해 일부 들여쓰기 출력
        for line in selected_prec['판시사항'].split("\n"):
            print(f"  {line}")
    else:
        print("  (판시사항 없음)")

    print("-" * 70)
    print("■ [판결요지]:")
    if selected_prec['판결요지']:
        for line in selected_prec['판결요지'].split("\n"):
            print(f"  {line}")
    else:
        print("  (판결요지 없음)")
    print("=" * 70)

    return selected_prec

if __name__ == "__main__":
    fetch_latest_precedent(query="손해배상")

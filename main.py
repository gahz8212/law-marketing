import os
import re
import sys
import warnings
import requests
import xmltodict
from dotenv import load_dotenv

# SDK 내부 AFC 권고 경고 메시지 억제
warnings.filterwarnings("ignore", category=UserWarning)

from google import genai
from google.genai import types
from google.genai.errors import ClientError

def clean_text(text: str) -> str:
    """HTML 태그 및 불필요한 공백을 정제합니다."""
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def fetch_latest_precedent(law_api_key: str, query: str = "손해배상") -> dict:
    """국가법령정보센터 오픈 API에서 판례를 수집하고 상세 본문을 파싱합니다."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.law.go.kr"
    }

    # 1. 목록 검색
    search_url = "https://www.law.go.kr/DRF/lawSearch.do"
    search_params = {
        "OC": law_api_key,
        "target": "prec",
        "type": "XML",
        "query": query,
    }

    search_res = requests.get(search_url, params=search_params, headers=headers, timeout=10)
    search_res.raise_for_status()
    search_dict = xmltodict.parse(search_res.text)

    prec_search = search_dict.get("PrecSearch")
    if not prec_search:
        resp_tag = search_dict.get("Response", {})
        err_msg = resp_tag.get("msg") or resp_tag.get("result") or search_res.text[:200]
        raise RuntimeError(f"국가법령정보센터 목록 조회 실패: {err_msg}")

    prec_list = prec_search.get("prec", [])
    if isinstance(prec_list, dict):
        prec_list = [prec_list]

    # 2. 본문 상세 정보(판결요지 또는 판시사항)가 존재하는 최신 판례 추출
    service_url = "https://www.law.go.kr/DRF/lawService.do"
    selected = None

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

        if case_name and (issues or summary):
            selected = {
                "판례일련번호": prec_id,
                "사건명": clean_text(case_name),
                "사건번호": clean_text(case_no),
                "선고일자": clean_text(prec_detail.get("선고일자")),
                "법원명": clean_text(prec_detail.get("법원명")),
                "판시사항": clean_text(issues),
                "판결요지": clean_text(summary),
            }
            break

    if not selected:
        raise RuntimeError("상세 본문(판시사항/판결요지)이 포함된 판례를 찾지 못했습니다.")

    return selected

def generate_marketing_summary(llm_api_key: str, precedent_data: dict) -> str:
    """Gemini LLM을 호출하여 마케팅 소구점 기반 콘텐츠를 생성합니다."""
    client = genai.Client(api_key=llm_api_key)

    system_instruction = (
        "너는 법률 도메인 전문 카피라이터이자 마케터야. "
        "딱딱한 판례를 일반 대중이 직관적으로 이해하고 공감할 수 있는 마케팅 콘텐츠로 가공해야 해."
    )

    user_prompt = f"""다음 판례 데이터를 분석하여, 일반 대중에게 어필할 수 있는 마케팅 콘텐츠를 작성해 줘.

[판례 원문 데이터]
- 사건명: {precedent_data['사건명']}
- 사건번호: {precedent_data['사건번호']}
- 선고일자 / 법원: {precedent_data['선고일자']} ({precedent_data['법원명']})
- 판시사항:
{precedent_data['판시사항']}

- 판결요지:
{precedent_data['판결요지']}

반드시 아래의 3가지 마크다운 형식으로만 작성하고, 다른 불필요한 설명은 제외해:

📌 사건 요약 (3줄)
- 
- 
- 
(일반인의 용어로 누가 누구에게 왜 소송을 걸었으며, 법원은 누구의 손을 들어주었는지 핵심만 3줄 글머리 기호로 요약)

🎯 타겟 잠재 고객
(이 판례를 읽고 법률 사무소에 상담을 신청할 만한 사람의 페르소나를 1~2문장으로 도출)

💡 클릭 유도 블로그 제목 3선
1. (후킹한 제목)
2. (궁금증 유발 제목)
3. (정보성/해결책 제시 제목)
"""

    candidate_models = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"]
    last_error = None

    for model in candidate_models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
            )
            return response.text.strip()
        except ClientError as ce:
            last_error = ce
            if "depleted" in str(ce):
                raise ce
            continue
        except Exception as e:
            last_error = e
            continue

    raise last_error if last_error else RuntimeError("모든 Gemini 모델 호출에 실패했습니다.")

def main():
    load_dotenv()
    law_api_key = os.getenv("LAW_API_KEY")
    llm_api_key = os.getenv("LLM_API_KEY")

    if not law_api_key or not llm_api_key:
        print("[ERROR] .env 파일에 LAW_API_KEY 또는 LLM_API_KEY가 설정되어 있지 않습니다.")
        sys.exit(1)

    # 1. 최신 판례 수집
    try:
        prec_data = fetch_latest_precedent(law_api_key, query="손해배상")
    except Exception as e:
        print(f"[ERROR] 판례 데이터 수집 중 오류: {e}")
        sys.exit(1)

    # 2. LLM 마케팅 요약 생성
    try:
        summary_result = generate_marketing_summary(llm_api_key, prec_data)
        # 요구사항: LLM이 최종적으로 가공한 마케팅 요약본만 CLI 터미널에 가독성 좋게 출력
        print(summary_result)
    except ClientError as ce:
        if "depleted" in str(ce):
            print("\n" + "!" * 70)
            print("[Google AI Studio 크레딧 고갈 안내 (HTTP 429 RESOURCE_EXHAUSTED)]")
            print("현재 .env의 LLM_API_KEY에 연결된 Google AI Studio 프로젝트의 선불 크레딧(Prepay Credits)이 소진된 상태입니다.")
            print("해결 방법: https://ai.studio/projects 에서 크레딧을 충전하시거나,")
            print("무료 티어(Free Tier)의 신규 API 키를 발급받아 .env의 LLM_API_KEY로 교체해 주십시오.")
            print("!" * 70)
        else:
            print(f"[ERROR] LLM API 호출 실패: {ce}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] 예상치 못한 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

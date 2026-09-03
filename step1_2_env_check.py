import os
import sys
from dotenv import load_dotenv

def mask_key(key: str) -> str:
    """API 키의 앞 4자리와 뒤 4자리만 표시하고 나머지는 마스킹합니다."""
    if not key:
        return "None"
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]} (Length: {len(key)})"

def main():
    print("=" * 60)
    print("[Phase 1] 1단계 및 2단계: 환경 설정 및 의존성 검증")
    print("=" * 60)

    # 1. 라이브러리 임포트 검증
    print("\n1. 의존성 패키지 임포트 검증:")
    packages = {
        "requests": None,
        "dotenv (python-dotenv)": None,
        "google.genai": None,
        "xmltodict": None,
    }

    try:
        import requests
        packages["requests"] = f"OK (v{requests.__version__})"
    except Exception as e:
        packages["requests"] = f"FAIL: {e}"

    try:
        import dotenv
        packages["dotenv (python-dotenv)"] = "OK"
    except Exception as e:
        packages["dotenv (python-dotenv)"] = f"FAIL: {e}"

    try:
        from google import genai
        packages["google.genai"] = "OK"
    except Exception as e:
        packages["google.genai"] = f"FAIL: {e}"

    try:
        import xmltodict
        packages["xmltodict"] = "OK"
    except Exception as e:
        packages["xmltodict"] = f"FAIL: {e}"

    all_imported = True
    for pkg, status in packages.items():
        print(f"  - {pkg:<25}: {status}")
        if not status.startswith("OK"):
            all_imported = False

    if not all_imported:
        print("\n[ERROR] 필수 패키지 중 일부가 로드되지 않았습니다.")
        sys.exit(1)

    # 2. .env 환경변수 로드 및 검증
    print("\n2. .env 환경 변수 로드 및 유효성 검증:")
    env_loaded = load_dotenv(override=True)
    print(f"  - .env 파일 탐색 및 로드: {'성공' if env_loaded else '실패 (.env 파일 확인 필요)'}")

    law_api_key = os.getenv("LAW_API_KEY")
    llm_api_key = os.getenv("LLM_API_KEY")

    has_error = False

    if not law_api_key:
        print("  - LAW_API_KEY            : [누락] .env에 LAW_API_KEY가 정의되지 않았습니다.")
        has_error = True
    else:
        print(f"  - LAW_API_KEY            : [정상] {mask_key(law_api_key)}")

    if not llm_api_key:
        print("  - LLM_API_KEY            : [누락] .env에 LLM_API_KEY가 정의되지 않았습니다.")
        has_error = True
    else:
        print(f"  - LLM_API_KEY            : [정상] {mask_key(llm_api_key)}")

    if has_error:
        print("\n[ERROR] 필수 환경 변수가 누락되었습니다.")
        sys.exit(1)

    # 3. Google GenAI 클라이언트 초기화 테스트
    print("\n3. Google GenAI 클라이언트 초기화 테스트:")
    try:
        client = genai.Client(api_key=llm_api_key)
        print("  - genai.Client 초기화   : 성공 (Client 객체 정상 생성)")
    except Exception as e:
        print(f"  - genai.Client 초기화   : 실패 ({e})")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("[SUCCESS] 1단계(패키지 설치) 및 2단계(.env 로드 및 검증)가 모두 완료되었습니다.")
    print("=" * 60)

if __name__ == "__main__":
    main()

import re
from typing import Dict, Any

class Anonymizer:
    """
    [Core Principle 2] 강력한 개인정보 보호 모듈
    LLM에 텍스트를 전송하기 전, 민감 개인정보(주민번호, 연락처, 이메일, 실명, 상세주소 등)를 
    자동으로 탐지하여 안전한 토큰으로 비식별화(마스킹)합니다.
    """

    # 정규식 패턴 정의
    RRN_PATTERN = re.compile(r"\b\d{6}[-\s]?[1-4]\d{6}\b")
    PHONE_PATTERN = re.compile(r"\b(?:01[016789]|02|0[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}\b")
    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
    BUSINESS_NO_PATTERN = re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{5}\b")
    
    # 한국 도로명 및 지번 상세주소 패턴
    ADDRESS_PATTERN = re.compile(
        r"([가-힣]+(?:시|도)\s+[가-힣]+(?:시|군|구)\s+[가-힣\d]+(?:읍|면|동|로|길)\s*[\d-]+(?:번지)?(?:\s*[\d]+호)?)"
    )

    # 법률 문서 실명 표기 패턴 (예: 원고 홍길동 -> 원고 [비식별화-성명])
    NAME_TAG_PATTERN = re.compile(
        r"\b(원고|피고|소외|참가인|피의자|피고인|신청인|피신청인|고소인|고발인)\s+([가-힣]{2,4})\b"
    )

    @classmethod
    def anonymize_text(cls, text: str) -> str:
        """단일 텍스트에서 민감 개인정보를 마스킹합니다."""
        if not text:
            return ""

        # 1. 주민등록번호 마스킹
        text = cls.RRN_PATTERN.sub("[비식별화-주민등록번호]", text)
        
        # 2. 전화번호 및 휴대전화번호 마스킹
        text = cls.PHONE_PATTERN.sub("[비식별화-연락처]", text)
        
        # 3. 이메일 마스킹
        text = cls.EMAIL_PATTERN.sub("[비식별화-이메일]", text)
        
        # 4. 사업자등록번호 마스킹
        text = cls.BUSINESS_NO_PATTERN.sub("[비식별화-사업자번호]", text)
        
        # 5. 상세 주소 마스킹
        text = cls.ADDRESS_PATTERN.sub("[비식별화-상세주소]", text)

        # 6. 소송 당사자 실명 마스킹 (甲, 乙 등 한 글자 가명 제외)
        def mask_name(match):
            role = match.group(1)
            name = match.group(2)
            if name in ["대한민국", "주식회사", "합자회사", "유한회사"]:
                return f"{role} {name}"
            return f"{role} [비식별화-성명]"

        text = cls.NAME_TAG_PATTERN.sub(mask_name, text)

        return text

    @classmethod
    def anonymize_precedent(cls, precedent_data: Dict[str, Any]) -> Dict[str, Any]:
        """판례 데이터 딕셔너리의 민감 텍스트 필드를 비식별화하여 복사본을 반환합니다."""
        anonymized = precedent_data.copy()
        target_fields = ["사건명", "판시사항", "판결요지"]
        
        for field in target_fields:
            if field in anonymized and isinstance(anonymized[field], str):
                anonymized[field] = cls.anonymize_text(anonymized[field])

        return anonymized

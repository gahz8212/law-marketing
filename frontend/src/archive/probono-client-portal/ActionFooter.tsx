"use client";

import React, { useState } from "react";
import { ExternalLink, PhoneCall, CheckCircle, X, ShieldAlert } from "lucide-react";

interface ActionFooterProps {
  officialUrl?: string;
}

export default function ActionFooter({ officialUrl }: ActionFooterProps) {
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConsultSubmitted(true);
    setTimeout(() => {
      setShowConsultModal(false);
      setConsultSubmitted(false);
    }, 2000);
  };

  return (
    <>
      {/* 1. 모바일 전용: 화면 하단 고정 플로팅 바 (lg:hidden) */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="w-full max-w-md mx-auto px-4 py-2.5 flex items-center space-x-2">
          <a
            href={officialUrl || "https://www.law.go.kr"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors active:scale-98 shadow-sm"
          >
            <span>공식 판례 원문</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </a>

          <button
            type="button"
            onClick={() => setShowConsultModal(true)}
            className="flex-[1.5] flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-98"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>무료 공익상담 신청</span>
          </button>
        </div>
      </footer>

      {/* 2. 데스크톱 전용: 사이드바 임베디드 배너 카드 (hidden lg:block) */}
      <div className="hidden lg:block bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold tracking-wider">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>PRO BONO LEGAL SERVICE</span>
        </div>

        <div>
          <h4 className="text-base font-bold leading-snug">
            비슷한 법률 피해를 겪고 계신가요?
          </h4>
          <p className="text-xs text-blue-200/90 mt-1 leading-relaxed">
            법무법인 무제 프로보노 센터는 사회 취약계층과 외국인 노동자를 위한 무료 법률 상담을 전담 지원합니다.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setShowConsultModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>무료 공익상담 신청하기</span>
          </button>

          {officialUrl && (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 border border-white/20"
            >
              <span>국가법령정보센터 공식 판례 원문 조회</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* 상담 신청 팝업 모달 */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  법무법인 무제 프로보노 센터
                </h3>
                <p className="text-xs text-gray-500">
                  사회적 약자 및 이주 노동자를 위한 무료 법률 상담
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConsultModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {consultSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-gray-900 text-base">
                  상담 신청이 접수되었습니다
                </h4>
                <p className="text-xs text-gray-500">
                  담당 공익 변호사가 24시간 이내에 입력하신 연락처로 연락드립니다.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConsultSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    신청인 성함 또는 가명
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    연락처 (휴대전화 또는 메신저 ID)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="010-0000-0000 / 카카오톡 ID"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    상담 희망 언어
                  </label>
                  <select className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                    <option value="ko">한국어 (Korean)</option>
                    <option value="en">English (영어)</option>
                    <option value="vi">Tiếng Việt (베트남어)</option>
                    <option value="zh">中文 (중국어)</option>
                    <option value="th">ไทย (태국어)</option>
                    <option value="km">ភាសាខ្មែរ (캄보디아어)</option>
                    <option value="ur">اردو (우르두어)</option>
                    <option value="uz">O'zbek (우즈벡어)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/30 transition-all active:scale-98"
                  >
                    공익 법률지원 접수하기
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-2.5">
                    * 수집된 모든 정보는 비밀이 철저히 보장되며 공익 상담 외 목적으로 사용되지 않습니다.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

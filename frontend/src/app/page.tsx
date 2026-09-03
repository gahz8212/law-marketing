"use client";

import React, { useEffect } from "react";
import StudioHeader from "@/components/StudioHeader";
import MarketerStudio from "@/components/MarketerStudio";
import InteractiveTutorial from "@/components/InteractiveTutorial";
import ChannelConfigModal from "@/components/ChannelConfigModal";
import { useProBonoStore } from "@/lib/store";
import { Loader2, Sparkles } from "lucide-react";

export default function HomePage() {
  const {
    themeDetail,
    isLoading,
    errorMessage,
    loadInitialData,
    selectTheme,
    isTutorialOpen,
    closeTutorial,
  } = useProBonoStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/80">
      <main className="w-full max-w-7xl 2xl:max-w-[1680px] mx-auto p-4 lg:p-6 2xl:p-10 pb-20">
        {/* 법무법인 (미지정) 홍보팀 전용 헤더 */}
        <StudioHeader />

        {/* 메인 AX 콘텐츠 스튜디오 (하이브리드 입력: 사내 5대 판례 + 변호사 소장 메모 + 파일 D&D) */}
        {isLoading && !themeDetail ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center space-y-4 shadow-sm">
            <div className="relative w-14 h-14 mx-auto">
              <div className="w-14 h-14 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-purple-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">
                마케팅 에셋 생성 엔진 초기화 중...
              </h3>
              <p className="text-xs text-gray-500">
                법무법인 (미지정) 사내 판례 데이터베이스 및 Gemini LLM 파이프라인을 연결하고 있습니다.
              </p>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
            <p className="text-sm text-rose-700 font-semibold">{errorMessage}</p>
            <button
              type="button"
              onClick={() => selectTheme("wage")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              기본 승소 판례로 다시 불러오기
            </button>
          </div>
        ) : (
          <MarketerStudio />
        )}

        {/* 사내 내부 도구 푸터 */}
        <footer className="mt-12 text-center text-xs text-gray-400 border-t border-gray-200/80 pt-6">
          <p>© 2026 법무법인 (미지정). All rights reserved. | 사내 마케팅 AX 자동화 솔루션</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Powered by Python FastAPI · Next.js 16 · Google Gemini · n8n Automation Engine
          </p>
        </footer>
      </main>

      {/* 🎓 가상 마우스 오토 가이드 인터랙티브 튜토리얼 모달 */}
      <InteractiveTutorial isOpen={isTutorialOpen} onClose={closeTutorial} />

      {/* ⚙️ 멀티채널 자동 배포 주소 설정 모달 */}
      <ChannelConfigModal />
    </div>
  );
}

"use client";

import React from "react";
import { Sparkles, Shield, Cpu, Share2, Layers } from "lucide-react";
import { useProBonoStore } from "@/lib/store";

export default function StudioHeader() {
  const { openTutorial } = useProBonoStore();
  return (
    <header className="bg-white border border-gray-200/90 rounded-3xl p-6 2xl:p-8 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs 2xl:text-sm font-bold border border-blue-200 flex items-center shadow-2xs">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            법무법인 (미지정) 홍보팀
          </span>
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs 2xl:text-sm font-bold border border-purple-200 flex items-center shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Legal Marketing AX Studio
          </span>
        </div>

        <h1 className="text-2xl 2xl:text-3xl font-extrabold text-gray-900 tracking-tight">
          판결문 마케팅 콘텐츠 자동화 파이프라인
        </h1>
        <p className="text-xs 2xl:text-sm text-gray-600 leading-relaxed max-w-3xl">
          변호사 승소 판결문 및 소장 메모를 <span className="font-bold text-gray-800">A/B 후킹 제목 3선 · 인스타 카드뉴스 · 30초 숏츠 나레이션 · 네이버 블로그 원고</span>로 1초 만에 자동 가공하고 n8n으로 원클릭 배포합니다.
        </p>
      </div>

      {/* 우측 기술 스택 인디케이터 배지 (타임지 스타일 메타데이터 박스) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 2xl:p-3 rounded-2xl border border-gray-200/80">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-gray-200/60 text-xs 2xl:text-sm font-semibold text-gray-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>FastAPI</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-gray-200/60 text-xs 2xl:text-sm font-semibold text-purple-700">
          <Cpu className="w-4 h-4 text-purple-600" />
          <span>Gemini AI</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-gray-200/60 text-xs 2xl:text-sm font-semibold text-rose-700">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>신경망 쇼츠 보이스</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-gray-200/60 text-xs 2xl:text-sm font-semibold text-emerald-700">
          <Share2 className="w-4 h-4 text-emerald-600" />
          <span>n8n 워크플로우</span>
        </div>
        <button
          type="button"
          onClick={openTutorial}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs 2xl:text-sm font-extrabold shadow-sm transition-all active:scale-95"
          title="30초 만에 끝내는 가상 마우스 오토 가이드 투어"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>🎓 30초 퀵 튜토리얼</span>
        </button>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import { Scale, HeartHandshake, ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                PRO BONO
              </span>
              <span className="text-[11px] text-gray-500 flex items-center">
                <ShieldCheck className="w-3 h-3 mr-0.5 text-emerald-600" /> 공익법률지원
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              법무법인 무제 프로보노 센터
            </h1>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            무료 법률 지원
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        어려운 법률 용어와 판례를 외국인 노동자 및 사회 취약계층의 눈높이에 맞춰{" "}
        <strong className="text-blue-700 font-semibold">쉬운 3줄 요약과 모국어 음성(TTS)</strong>으로 제공합니다.
      </p>
    </header>
  );
}

"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, CheckCircle2 } from "lucide-react";

interface ThreeStepCardProps {
  bullets: string[];
  fullMarkdown: string;
  caseName: string;
  caseNo: string;
  courtName: string;
  judgmentDate: string;
}

export default function ThreeStepCard({
  bullets,
  fullMarkdown,
  caseName,
  caseNo,
  courtName,
  judgmentDate,
}: ThreeStepCardProps) {
  const [showFullDoc, setShowFullDoc] = useState(false);

  const step1 = bullets[0] || "사실관계 및 발생한 분쟁 사항을 확인 중입니다.";
  const step2 = bullets[1] || "법원의 판단 기준 및 법리적 쟁점을 검토 중입니다.";
  const step3 = bullets[2] || "피해자의 손해배상 청구 및 권리 구제 기준을 정리 중입니다.";

  return (
    <div className="space-y-4 my-3">
      {/* 사건 기본 메타 배지 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between text-gray-500 text-xs gap-2 mb-1.5">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
            {courtName} 판결
          </span>
          <span>선고일자: <strong>{judgmentDate}</strong></span>
          <span className="text-gray-400">사건번호: {caseNo}</span>
        </div>
        <h3 className="font-bold text-gray-900 text-base md:text-lg leading-snug">
          {caseName}
        </h3>
      </div>

      {/* 3단계 비주얼 카드: 모바일 1열 / 15인치·27인치 데스크톱 3열 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* 1단계: 위반 사항 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500" />
          <div>
            <div className="flex items-center space-x-2 mb-2.5 pt-1">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="text-xs font-bold text-rose-900">
                🚨 1단계 : 피해 및 위반 사실
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              {step1}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] text-rose-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
            피해 쟁점 분석 완료
          </div>
        </div>

        {/* 2단계: 권리 구제 기준 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
          <div>
            <div className="flex items-center space-x-2 mb-2.5 pt-1">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span className="text-xs font-bold text-blue-900">
                ⚖️ 2단계 : 법원 판단 및 보호 기준
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              {step2}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] text-blue-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-500" />
            대법원 법리 기준 정립
          </div>
        </div>

        {/* 3단계: 대처 방안 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
          <div>
            <div className="flex items-center space-x-2 mb-2.5 pt-1">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="text-xs font-bold text-emerald-900">
                💡 3단계 : 판결 결과 및 대처 방안
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              {step3}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-[11px] text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            공익 구제 솔루션 제시
          </div>
        </div>
      </div>

      {/* 전체 상세 마케팅 & 프로보노 리포트 접이식 보기 */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowFullDoc(!showFullDoc)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-xs md:text-sm font-semibold text-gray-800 transition-colors shadow-sm"
        >
          <span className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>AI 프로보노 분석 리포트 전문 확인하기</span>
          </span>
          {showFullDoc ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {showFullDoc && (
          <div className="mt-2.5 p-5 bg-white border border-gray-200 rounded-2xl text-xs md:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans shadow-sm">
            {fullMarkdown}
          </div>
        )}
      </div>
    </div>
  );
}

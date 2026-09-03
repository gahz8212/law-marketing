"use client";

import React from "react";
import { useProBonoStore, SUPPORTED_LANGUAGES } from "@/lib/store";
import { Globe } from "lucide-react";

export default function LanguageBar() {
  const { selectedLang, setLang, isLoading } = useProBonoStore();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <label className="text-xs font-bold text-gray-800 flex items-center">
          <Globe className="w-4 h-4 mr-1.5 text-blue-600" />
          다국어 선택 (Select Language)
        </label>
        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          8개 언어 지원
        </span>
      </div>

      {/* 모바일: 횡스크롤 / 태블릿·PC: 그리드 랩 */}
      <div className="flex sm:grid sm:grid-cols-4 gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-none">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selectedLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              disabled={isLoading}
              onClick={() => setLang(lang.code)}
              className={`flex-shrink-0 flex items-center justify-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-[1.02]"
                  : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 active:scale-95 border border-gray-200/70"
              } ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span className="text-sm">{lang.flag}</span>
              <span className="truncate">{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useProBonoStore } from "@/lib/store";
import { Layers } from "lucide-react";

export default function ThemeSelector() {
  const { themes, selectedThemeId, selectTheme, isLoading } = useProBonoStore();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-xs font-bold text-gray-800 flex items-center">
          <Layers className="w-4 h-4 mr-1.5 text-blue-600" />
          5대 공익 법률 지원 분야
        </label>
        <span className="text-[11px] text-gray-400 font-medium">
          필독 핵심 권리
        </span>
      </div>

      {/* 5대 테마 탭 (모바일 가로 스크롤 / 데스크톱 세로 리스트) */}
      <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-none">
        {themes.map((theme) => {
          const isSelected = selectedThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              disabled={isLoading && isSelected}
              onClick={() => selectTheme(theme.id)}
              className={`flex-shrink-0 w-[200px] lg:w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500 scale-[1.01]"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-slate-50/70 active:scale-98"
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{theme.icon}</span>
                <h4
                  className={`text-xs md:text-sm font-bold truncate ${
                    isSelected ? "text-blue-900" : "text-gray-900"
                  }`}
                >
                  {theme.title}
                </h4>
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-1">
                {theme.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

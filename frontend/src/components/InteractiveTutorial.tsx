"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Play, Pause, ChevronRight, ChevronLeft, X, MousePointer2 } from "lucide-react";

export interface TutorialStep {
  targetId: string;
  title: string;
  stepNumber: number;
  badge: string;
  actionText: string;
  description: string;
  tooltipPos: "below" | "above" | "left" | "right";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetId: "tutorial-step-config",
    title: "슬랙 · 노션 · 블로그 목적지 등록 (선택)",
    stepNumber: 1,
    badge: "STEP 1 · 채널 연동 (선택)",
    actionText: "👉 필요할 때 언제든 등록할 수 있습니다",
    description: "[⚙️ 연동 설정]에서 사내 슬랙이나 노션 주소를 등록할 수 있습니다. 💡 지금 당장 등록하지 않아도 모든 기능은 100% 정상 작동하니, 나중에 실제 자동 배포가 필요할 때 편하게 등록하세요!",
    tooltipPos: "left",
  },
  {
    targetId: "tutorial-step-cases",
    title: "마케팅 타깃 판례 선택 & [+] 등록",
    stepNumber: 2,
    badge: "STEP 2 · 판례 선택",
    actionText: "👉 상단 기차에서 원하는 판례를 클릭하세요",
    description: "사내 승소 판례 20건이 기차처럼 나열되어 있습니다. 원하는 사건을 클릭하면 AI가 즉시 콘텐츠를 생성합니다. 갓 선고된 사건은 오른쪽 [+] 버튼으로 사건번호나 PDF 판결문을 던져 넣으세요!",
    tooltipPos: "below",
  },
  {
    targetId: "tutorial-sub-thumbnail",
    title: "타임지 뉴스 인포그래픽 썸네일",
    stepNumber: 3,
    badge: "STEP 3 · 썸네일 확인",
    actionText: "👉 사건 쟁점을 시각화한 썸네일을 확인하세요",
    description: "판례를 선택하면 좌측 메인의 썸네일이 즉시 변경됩니다! 타임지 에디토리얼 스타일의 고화질 16:9 일러스트를 확인하고 [썸네일 다운로드]를 눌러 카드뉴스 표지로 활용하세요.",
    tooltipPos: "below",
  },
  {
    targetId: "tutorial-sub-official-url",
    title: "공식 대법원 판결문 원문 열람",
    stepNumber: 4,
    badge: "STEP 4 · 판결문 대조",
    actionText: "👉 [공식 판결문 열람 ↗] 버튼으로 팩트를 대조하세요",
    description: "국가법령정보센터 공식 판결문 원문 링크가 자동 연동되어 있습니다. 클릭 한 번으로 대법원/하급심 실제 판결문 전문을 열람하여 법적 사실관계를 즉시 교차 검증할 수 있습니다.",
    tooltipPos: "below",
  },
  {
    targetId: "tutorial-sub-editor",
    title: "2,000자 블로그 원고 검수 & 직접 다듬기",
    stepNumber: 5,
    badge: "STEP 5 · 원고 검수",
    actionText: "👉 [원고 직접 다듬기]를 눌러 사내 문체로 수정하세요",
    description: "법률 전문가 톤의 2,000자 완성형 마크다운 원고를 검수합니다. [원고 직접 다듬기]를 눌러 원하는 문구를 자유롭게 수정하고, [원고 전체 복사]로 네이버 블로그에 바로 붙여넣으세요.",
    tooltipPos: "below",
  },
  {
    targetId: "tutorial-step-headlines",
    title: "A/B 후킹 제목 3선 & 카드뉴스 5장",
    stepNumber: 6,
    badge: "STEP 6 · 카피 & 카드뉴스",
    actionText: "👉 의뢰인의 시선을 끄는 제목 3선을 확인하세요",
    description: "우측 상단에서 의뢰인의 클릭을 부르는 헤드라인 3선과 인스타그램 5장 카드뉴스 문구를 확인하세요. 클릭 한 번으로 복사하거나 [다른 카피 다시 뽑기]로 새로운 제목을 얻을 수 있습니다.",
    tooltipPos: "left",
  },
  {
    targetId: "tutorial-step-voice",
    title: "30초 AI 성우 숏츠 나레이션",
    stepNumber: 7,
    badge: "STEP 7 · 숏폼 성우",
    actionText: "👉 2030 남/여, 3040 남 성우 음성을 들어보세요",
    description: "귀에 쏙쏙 박히는 30초 숏츠 나레이션 대본과 신경망 AI 성우 음성(MP3)이 실시간 합성됩니다. 바로 들어보고 캡컷(CapCut) 영상 제작용 MP3를 다운로드하세요.",
    tooltipPos: "left",
  },
  {
    targetId: "tutorial-step-n8n",
    title: "n8n 원클릭 멀티채널 자동 배포",
    stepNumber: 8,
    badge: "STEP 8 · 원클릭 배포 피날레",
    actionText: "👉 초록색 [n8n 자동 발행 실행하기]를 누르세요",
    description: "모든 검수가 끝났다면 초록색 버튼 클릭! 사내 슬랙 단톡방 알림 + 노션 마케팅 캘린더 등록 + 네이버 블로그 초안 발행까지 동시에 1초 만에 자동 완료됩니다!",
    tooltipPos: "above",
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function InteractiveTutorial({ isOpen, onClose }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isClicking, setIsClicking] = useState(false);

  // 1. 튜토리얼이 열릴 때 무조건 STEP 1(index 0)부터 시작하도록 완벽 초기화!
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
      setIsClicking(false);
    }
  }, [isOpen]);

  const step = TUTORIAL_STEPS[currentStepIndex];

  // 2. 타겟 엘리먼트 위치 추적 및 가상 마우스 포인터 이동
  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // 타겟 요소가 화면 중앙에 시원하게 보이도록 스크롤
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

      // 마우스 포인터를 타겟 요소의 상단/버튼 부근으로 이동
      const targetX = rect.left + Math.min(rect.width * 0.45, 180);
      const targetY = rect.top + Math.min(rect.height * 0.35, 50);

      setCursorPos({ x: targetX, y: targetY });

      // 0.8초 후 클릭 콕! 시뮬레이션
      const timer = setTimeout(() => {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 450);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [isOpen, step.targetId]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  // 3. 자동 재생 타이머 (5.5초마다 다음 단계로 이동)
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < TUTORIAL_STEPS.length - 1) return prev + 1;
        setIsPlaying(false);
        return prev;
      });
    }, 5500);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStepIndex]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden">
      {/* 1. 타겟 요소 구멍(Hole Cutout) 스포트라이트
             - backdrop-blur 완전 제거! (뿌연 현상 0%)
             - box-shadow로 타겟 요소만 대낮처럼 100% 쨍하고 선명하게 뚫어줌! */}
      {targetRect && (
        <div
          onClick={onClose}
          className="fixed rounded-3xl pointer-events-none transition-all duration-700 ease-out border-4 border-purple-500 ring-4 ring-purple-400/80"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45), 0 0 40px rgba(168, 85, 247, 0.6)",
          }}
        />
      )}

      {/* 2. 움직이는 가상 마우스 커서 (Virtual Mouse Pointer) */}
      <div
        className={`fixed pointer-events-none z-[10001] transition-all duration-700 ease-out transform ${
          isClicking ? "scale-90" : "scale-100"
        }`}
        style={{
          top: cursorPos.y,
          left: cursorPos.x,
        }}
      >
        <div className="relative">
          {/* 선명한 보라색 마우스 커서 아이콘 */}
          <MousePointer2 className="w-9 h-9 text-purple-600 fill-purple-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />

          {/* 클릭 시 발생하는 파동 링 */}
          {isClicking && (
            <span className="absolute -top-3 -left-3 w-16 h-16 rounded-full border-4 border-purple-400 animate-ping opacity-90" />
          )}

          {/* 마우스 커서 라벨 */}
          <span className="absolute left-8 top-5 px-2.5 py-1 bg-purple-900 text-white text-[11px] font-black rounded-lg shadow-xl border border-purple-400 whitespace-nowrap">
            {isClicking ? "클릭 콕! ✨" : "가이드 봇 🖱️"}
          </span>
        </div>
      </div>

      {/* 3. 시인성 100% 순백색 안내 카드 (Tooltip Card) */}
      {targetRect && (
        <div
          className="fixed z-[10002] max-w-lg w-full transition-all duration-500 ease-out p-4 pointer-events-auto"
          style={{
            top:
              step.tooltipPos === "above"
                ? Math.max(20, targetRect.top - 240)
                : Math.min(targetRect.bottom + 20, window.innerHeight - 250),
            left:
              step.tooltipPos === "left"
                ? Math.max(20, targetRect.left - 480)
                : Math.min(Math.max(20, targetRect.left), window.innerWidth - 500),
          }}
        >
          <div className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-purple-500 space-y-3.5 ring-4 ring-purple-100">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                  {step.stepNumber}
                </span>
                <div>
                  <h4 className="font-black text-base text-gray-900 tracking-tight">
                    {step.title}
                  </h4>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    {step.actionText}
                  </span>
                </div>
              </div>
              <span className="text-xs font-black text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
              </span>
            </div>

            {/* 본문 설명 - 선명한 텍스트 */}
            <p className="text-xs 2xl:text-sm text-gray-800 leading-relaxed font-medium">
              {step.description}
            </p>

            {/* 프로그레스 바 */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100}%` }}
              />
            </div>

            {/* 컨트롤 바 */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center space-x-1.5 text-xs text-gray-600 hover:text-gray-900 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-100 border border-gray-200 transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "일시정지" : "자동재생"}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="이전 단계"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {currentStepIndex < TUTORIAL_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center space-x-1 active:scale-95"
                  >
                    <span>다음 스텝</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center space-x-1.5 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>튜토리얼 완료 & 시작!</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-slate-100"
                  title="튜토리얼 닫기 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

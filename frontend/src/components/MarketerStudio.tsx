"use client";

import React, { useState, useRef } from "react";
import { useProBonoStore } from "@/lib/store";
import {
  Send,
  Copy,
  Check,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Volume2,
  ExternalLink,
  Edit3,
  ShieldCheck,
  RotateCcw,
  Loader2,
  UploadCloud,
  Download,
  BookOpen,
  Share2,
  RefreshCw,
  Search,
  Save,
  X,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { getAudioStreamUrl, searchPrecedents, searchCases, fetchThemes, PrecedentSearchItem, ThemeItem, BACKEND_URL } from "@/lib/api";

const SAMPLE_CASE_TEXT = `원고 김철수(주민등록번호 850315-1122334, 경기 수원시 팔달구 거주, 연락처 010-9876-5432)는 피고 주식회사 대박물류에서 지입 화물차 기사로 3년간 근무하였다. 피고 회사는 원고가 개인사업자(지입차주)라는 이유로 퇴직금 4,500만 원 및 연장근로수당을 일절 지급하지 않았다.
재판부는 비록 형식상 도급·위탁 계약을 체결하였더라도 피고 회사의 구체적 지휘·감독을 받으며 전속적으로 노무를 제공한 실질적 근로기준법상 근로자에 해당한다고 판단하였다. 이에 따라 피고는 원고에게 미지급 퇴직금 4,500만 원 및 지연손해금을 전액 지급하라고 원고 전부 승소 판결을 선고하였다.`;

const SAMPLE_MEMO_TEXT = `[변호사 메모]
지입차주 퇴직금 청구 소송 전부 승소건.
상대방 회사는 개인사업자 계약서 들이밀면서 1원도 못 준다고 버텼음.
우리가 매일 아침 단톡방에서 배차 지시하고 휴무 통제한 카톡 캡처 500장 증거로 제출해서
법원에서 '실질적 근로자' 인정받고 퇴직금 4,500만원 + 연체이자까지 싹 다 받아냄.
지입차주나 프리랜서도 카톡 지시 받으면 퇴직금 받을 수 있다는 점 강조해서 사이다 승소 글로 홍보 바람.`;

export default function MarketerStudio() {
  const {
    themes,
    selectedThemeId,
    selectTheme,
    prefetchTheme,
    themeDetail,
    publishToN8N,
    publishStatus,
    isLoading,
    marketerInputMode,
    setMarketerInputMode,
    analyzeCustomCase,
    uploadCaseFileAction,
    selectedVoiceType,
    isVoiceSynthesizing,
    changeVoiceAction,
    setThemes,
    openChannelConfig,
    slackWebhookUrl,
    notionDatabaseId,
    blogWebhookUrl,
  } = useProBonoStore();

  const handlePublishClick = () => {
    const hasConfig =
      (slackWebhookUrl && slackWebhookUrl.trim().length > 0) ||
      (notionDatabaseId && notionDatabaseId.trim().length > 0) ||
      (blogWebhookUrl && blogWebhookUrl.trim().length > 0);

    if (!hasConfig) {
      // 주소값이 입력되지 않았으므로 연동 설정 모달을 자동으로 오픈!
      openChannelConfig();
      return;
    }

    publishToN8N();
  };

  // 하이브리드 서브 모드: 'text' (직접 입력/메모) vs 'file' (D&D 파일 첨부)
  const [subMode, setSubMode] = useState<"text" | "file">("text");

  // 1. 직접 텍스트/메모 입력 폼 상태
  const [customTitle, setCustomTitle] = useState("");
  const [customCaseNo, setCustomCaseNo] = useState("");
  const [customCourt, setCustomCourt] = useState("서울중앙지방법원");
  const [customRawText, setCustomRawText] = useState("");

  // 2. 파일 업로드 상태
  const [fileCaseTitle, setFileCaseTitle] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 3. 스케치 기반 활성 패널: 'none' | 'create' | 'search'
  const [activePanel, setActivePanel] = useState<"none" | "create" | "search">("none");

  // 조건 검색 상태
  const [conditionQuery, setConditionQuery] = useState("");
  const [conditionSort, setConditionSort] = useState<"accuracy" | "latest">("accuracy");
  const [conditionCourt, setConditionCourt] = useState<string>("");
  const [isConditionSearching, setIsConditionSearching] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState<{ query: string; sort: string } | null>(null);

  const handleExecuteConditionSearch = async () => {
    setIsConditionSearching(true);
    try {
      const results = await searchCases(conditionQuery, conditionSort, conditionCourt || undefined);
      setThemes(results);
      setActiveSearchFilter({ query: conditionQuery, sort: conditionSort });
      if (results.length > 0) {
        await selectTheme(results[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsConditionSearching(false);
    }
  };

  const handleResetToLatest = async () => {
    setConditionQuery("");
    setConditionSort("accuracy");
    setConditionCourt("");
    setActiveSearchFilter(null);
    setIsConditionSearching(true);
    try {
      const initialThemes = await fetchThemes();
      setThemes(initialThemes);
      if (initialThemes.length > 0) {
        await selectTheme(initialThemes[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsConditionSearching(false);
    }
  };

  // 가로 스크롤 레일 제어
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (direction: "left" | "right") => {
    if (!railRef.current) return;
    const scrollAmount = direction === "left" ? -380 : 380;
    railRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // 3. 사내 승소 판례 스마트 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PrecedentSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const results = await searchPrecedents(queryText.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (item: PrecedentSearchItem) => {
    setShowSearchResults(false);
    if (item.prec_id.startsWith("curated_")) {
      const themeId = item.prec_id.replace("curated_", "");
      setMarketerInputMode("preset");
      await selectTheme(themeId);
    } else {
      setMarketerInputMode("custom");
      await analyzeCustomCase({
        case_title: item.case_name,
        case_no: item.case_no,
        court_name: item.court_name,
        raw_text: `${item.case_name} (${item.case_no}, ${item.court_name})\n${item.snippet}`,
      });
    }
  };

  // 4. 유저 친화적 CRUD 상태: 인라인 수정 & 사내 보관함 서랍
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editedBody, setEditedBody] = useState<string | null>(null);

  const [editingTitleIdx, setEditingTitleIdx] = useState<number | null>(null);
  const [customTitles, setCustomTitles] = useState<string[] | null>(null);
  const [tempTitleText, setTempTitleText] = useState("");

  const startEditingTitle = (idx: number, currentText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleIdx(idx);
    setTempTitleText(currentText);
  };

  const saveEditedTitle = (idx: number, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempTitleText.trim() || !themeDetail) return;
    const baseTitles = customTitles ? [...customTitles] : [...themeDetail.marketing.blog_titles];
    baseTitles[idx] = tempTitleText.trim();
    setCustomTitles(baseTitles);
    setEditingTitleIdx(null);
  };

  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [copiedSlideIndex, setCopiedSlideIndex] = useState<number | null>(null);
  const [copiedBody, setCopiedBody] = useState(false);

  const handleCopyTitle = (title: string, index: number) => {
    navigator.clipboard.writeText(title);
    setCopiedTitleIndex(index);
    setTimeout(() => setCopiedTitleIndex(null), 2000);
  };

  const handleCopySlide = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSlideIndex(index);
    setTimeout(() => setCopiedSlideIndex(null), 2000);
  };

  const handleCopyBody = () => {
    if (!themeDetail) return;
    navigator.clipboard.writeText(themeDetail.summary_markdown);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleFillSampleJudgment = () => {
    setCustomTitle("지입 화물차 기사 퇴직금 4,500만 원 전부 승소");
    setCustomCaseNo("2024가단78910");
    setCustomCourt("수원지방법원");
    setCustomRawText(SAMPLE_CASE_TEXT);
  };

  const handleFillSampleMemo = () => {
    setCustomTitle("변호사 직송: 지입차주 퇴직금 카톡 승소 메모");
    setCustomCaseNo("2024가단78910");
    setCustomCourt("수원지방법원");
    setCustomRawText(SAMPLE_MEMO_TEXT);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRawText.trim()) return;

    await analyzeCustomCase({
      case_title: customTitle.trim() || undefined,
      case_no: customCaseNo.trim() || undefined,
      court_name: customCourt.trim() || "법원",
      raw_text: customRawText.trim(),
    });
    setActivePanel("none");
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadCaseFileAction(file, fileCaseTitle || file.name);
      setActivePanel("none");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await uploadCaseFileAction(file, fileCaseTitle || file.name);
      setActivePanel("none");
    }
  };

  const streamUrl = getAudioStreamUrl(themeDetail?.audio?.audio_url);

  return (
    <div className="space-y-6 2xl:space-y-8 animate-in fade-in duration-200">
      {/* =========================================================================
          [타일 1 - 상단 벤토 타일]: 기차 레일 판결문 (최신순 5건) + [+] 입력 버튼 + [🔍] 돋보기 버튼
          (CRUD.png 스케치 디자인 100% 반영)
          ========================================================================= */}
      <section className="bg-white border border-gray-200/90 rounded-3xl p-5 2xl:p-6 shadow-sm space-y-4">
        {/* 상단 라벨 & 상태 바 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="w-4 h-4 2xl:w-5 2xl:h-5" />
            </span>
            <div>
              <h2 className="text-sm 2xl:text-base font-extrabold text-gray-900">
                마케팅 타깃 판례 선택
              </h2>
              <p className="text-[11px] 2xl:text-xs text-gray-500">
                최신순 승소 판결문 5건이 기차처럼 나열됩니다. [+] 버튼으로 새 판결문 등록, [🔍] 버튼으로 조건 검색이 가능합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeSearchFilter && (
              <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-800 animate-in fade-in">
                <span>🎯 &apos;{activeSearchFilter.query}&apos; 조건 검색 중 ({activeSearchFilter.sort === "accuracy" ? "정확도순" : "최신순"})</span>
                <button
                  type="button"
                  onClick={handleResetToLatest}
                  className="text-indigo-600 hover:text-indigo-900 underline ml-1"
                >
                  최신순 복원
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🚂 [1단: 기차 레일] 좌우 가로 스크롤바 탑재 판례 레일 */}
        <div id="tutorial-step-cases" className="flex items-start gap-2.5 2xl:gap-3.5 pb-1">
            {/* 좌우 가로 스크롤바가 탑재된 판례 레일 (스크롤바 위치를 카드 아래로 충분히 이동) */}
            <div
              ref={railRef}
              className="flex items-center gap-3 overflow-x-auto pb-6 pt-1.5 px-1.5 flex-1 scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100/90 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-300/90 hover:[&::-webkit-scrollbar-thumb]:bg-purple-500 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {themes.slice(0, 10).map((theme, idx) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={isLoading && isSelected}
                    onClick={() => selectTheme(theme.id)}
                    onMouseEnter={() => prefetchTheme(theme.id)}
                    className={`flex flex-col justify-between p-3.5 2xl:p-4 rounded-2xl border text-left transition-all min-w-[220px] 2xl:min-w-[245px] max-w-[250px] min-h-[100px] 2xl:min-h-[110px] flex-shrink-0 group ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/95 shadow-[4px_4px_0px_0px_#9333ea] ring-1 ring-purple-600/30 -translate-x-0.5 -translate-y-0.5"
                        : "border-gray-200/90 bg-white shadow-[3px_3px_0px_0px_#e2e8f0] hover:border-purple-300 hover:shadow-[4px_4px_0px_0px_#c084fc] hover:-translate-x-0.5 hover:-translate-y-0.5 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] 2xl:text-xs font-bold">
                        {theme.court_name || "법원"}
                      </span>
                      {idx === 0 && !activeSearchFilter && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] 2xl:text-xs font-black">
                          최신
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className={`text-xs 2xl:text-sm font-black truncate group-hover:text-purple-700 ${isSelected ? "text-purple-900" : "text-gray-900"}`}>
                        {theme.title}
                      </div>
                      <div className="text-[10px] 2xl:text-[11px] text-gray-400 truncate mt-0.5 flex items-center space-x-1.5">
                        <span>{theme.case_no || "사내 승소"}</span>
                        {theme.judgment_date && (
                          <>
                            <span>•</span>
                            <span className="text-gray-500 font-medium">{theme.judgment_date}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

          {/* 큼지막한 [+] 버튼 */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "create" ? "none" : "create")}
            className={`w-14 h-[100px] 2xl:w-16 2xl:h-[110px] mt-1.5 rounded-2xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0 ${
              activePanel === "create"
                ? "bg-purple-600 border-purple-600 text-white shadow-purple-200 ring-4 ring-purple-400/30"
                : "bg-white border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-500"
            }`}
            title="새 판결문 등록 영역 열기"
          >
            <Plus className="w-7 h-7 2xl:w-8 2xl:h-8 stroke-[2.5]" />
          </button>

          {/* 돋보기 [🔍] 버튼 */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "search" ? "none" : "search")}
            className={`w-14 h-[100px] 2xl:w-16 2xl:h-[110px] mt-1.5 rounded-2xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0 ${
              activePanel === "search"
                ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-400/30"
                : "bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-500"
            }`}
            title="조건 검색 영역 열기"
          >
            <Search className="w-6 h-6 2xl:w-7 2xl:h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* ➕ [2단 A: 입력 영역 (Create Panel)] - [+] 클릭 시 아래에 아코디언처럼 오픈 */}
        {activePanel === "create" && (
          <div className="bg-slate-50/80 rounded-3xl p-5 2xl:p-7 border-2 border-purple-300 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200 shadow-inner">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-purple-600 text-white">
                  <Plus className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm 2xl:text-base font-extrabold text-gray-900">
                    새 승소 판결문 사내 DB 등록 (기차 맨 앞에 최신 추가)
                  </h3>
                  <p className="text-[11px] 2xl:text-xs text-gray-500">
                    판결문을 저장하면 사내 자산 DB에 영구 적재되며, 기차 가장 왼쪽(판결문 A)에 최신순 1등으로 즉시 나타납니다.
                  </p>
                </div>
              </div>

              {/* 스케치 탭: 판결문/소장 메모 직접 붙여넣기 vs 파일/사진 끌어다 놓기 */}
              <div className="flex items-center space-x-1.5 bg-white p-1 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setSubMode("text")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs 2xl:text-sm font-bold transition-all ${
                    subMode === "text"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  ✍️ 판결문/소장 메모 직접 붙여넣기
                </button>
                <button
                  type="button"
                  onClick={() => setSubMode("file")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs 2xl:text-sm font-bold transition-all ${
                    subMode === "file"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  📁 파일/사진 끌어다 놓기
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("none")}
                  className="p-1.5 text-gray-400 hover:text-gray-700"
                  title="입력 영역 닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 스케치: 그 아래 3개의 둥근 가로 인풋 필드 (사건명, 사건번호, 법원명) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] 2xl:text-xs font-bold text-gray-700">
                      🏷 사건명 / 쟁점 제목
                    </label>
                    {subMode === "file" && (
                      <span className="text-[10px] font-extrabold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-full">
                        AI 자동 채움
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={subMode === "file"}
                    readOnly={subMode === "file"}
                    placeholder={
                      subMode === "file"
                        ? "파일 업로드 시 자동 추출됩니다"
                        : "예: 지입차주 퇴직금 전부 승소"
                    }
                    value={subMode === "text" ? customTitle : (fileCaseTitle || "")}
                    onChange={(e) => {
                      if (subMode === "text") setCustomTitle(e.target.value);
                    }}
                    className={`w-full p-2.5 2xl:p-3 rounded-2xl text-xs 2xl:text-sm focus:outline-none transition-all ${
                      subMode === "file"
                        ? "bg-slate-100/80 border border-dashed border-purple-200 text-purple-900 cursor-not-allowed font-medium select-none"
                        : "bg-white border border-gray-300 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] 2xl:text-xs font-bold text-gray-700">
                      ⚖️ 사건번호
                    </label>
                    {subMode === "file" && (
                      <span className="text-[10px] font-extrabold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-full">
                        AI 자동 채움
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={subMode === "file"}
                    readOnly={subMode === "file"}
                    placeholder={
                      subMode === "file"
                        ? "문서 첫 장에서 자동 추출됩니다"
                        : "예: 2025다214123"
                    }
                    value={subMode === "text" ? customCaseNo : ""}
                    onChange={(e) => {
                      if (subMode === "text") setCustomCaseNo(e.target.value);
                    }}
                    className={`w-full p-2.5 2xl:p-3 rounded-2xl text-xs 2xl:text-sm focus:outline-none transition-all ${
                      subMode === "file"
                        ? "bg-slate-100/80 border border-dashed border-purple-200 text-purple-900 cursor-not-allowed font-medium select-none"
                        : "bg-white border border-gray-300 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] 2xl:text-xs font-bold text-gray-700">
                      🏛 법원명
                    </label>
                    {subMode === "file" && (
                      <span className="text-[10px] font-extrabold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-full">
                        AI 자동 채움
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={subMode === "file"}
                    readOnly={subMode === "file"}
                    placeholder={
                      subMode === "file"
                        ? "판결문 헤더에서 자동 추출됩니다"
                        : "예: 서울중앙지방법원 / 대법원"
                    }
                    value={subMode === "text" ? customCourt : ""}
                    onChange={(e) => {
                      if (subMode === "text") setCustomCourt(e.target.value);
                    }}
                    className={`w-full p-2.5 2xl:p-3 rounded-2xl text-xs 2xl:text-sm focus:outline-none transition-all ${
                      subMode === "file"
                        ? "bg-slate-100/80 border border-dashed border-purple-200 text-purple-900 cursor-not-allowed font-medium select-none"
                        : "bg-white border border-gray-300 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    }`}
                  />
                </div>
              </div>

            {/* 스케치: 그 아래 커다란 메인 입력 박스 */}
            {subMode === "text" ? (
              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={8}
                    placeholder="판결문 주문/이유 전문 또는 변호사의 거친 카톡 메모/소장 내용을 자유롭게 붙여넣으세요. Gemini가 개인정보를 비식별화하고 사내 DB에 등록합니다..."
                    value={customRawText}
                    onChange={(e) => setCustomRawText(e.target.value)}
                    className="w-full p-4 2xl:p-5 bg-white border border-gray-300 rounded-2xl text-xs 2xl:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  />
                  <div className="absolute right-3 bottom-4 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleFillSampleMemo}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg border border-gray-200 transition-colors"
                    >
                      💬 변호사 메모 예시 채우기
                    </button>
                    <button
                      type="button"
                      onClick={handleFillSampleJudgment}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg border border-gray-200 transition-colors"
                    >
                      📜 판결문 전문 예시 채우기
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] 2xl:text-xs text-gray-500">
                    💡 저장 즉시 개인정보 마스킹 ➔ 사내 자산 DB 저장 ➔ 마케팅 에셋이 자동 생성됩니다.
                  </span>
                  <button
                    type="submit"
                    disabled={isLoading || !customRawText.trim()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs 2xl:text-sm rounded-2xl shadow-md transition-all flex items-center space-x-2 active:scale-98"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>사내 DB 저장 및 마케팅 에셋 생성 중...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>사내 DB에 저장 및 마케팅 에셋 생성 (가장 왼쪽 1등 반영)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 2xl:p-10 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-purple-600 bg-purple-50/70 scale-[1.01]"
                      : "border-purple-300 hover:border-purple-500 bg-white"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.hwp,.hwpx,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                  />
                  <div className="w-14 h-14 2xl:w-16 2xl:h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-7 h-7 2xl:w-8 2xl:h-8" />
                  </div>
                  <h4 className="text-sm 2xl:text-base font-extrabold text-gray-900 mb-1">
                    판결문 파일(PDF/HWP)이나 판결문 사진을 여기에 끌어다 놓으세요 (D&D)
                  </h4>
                  <p className="text-xs 2xl:text-sm text-gray-500 mb-2">
                    지원 포맷: <span className="font-bold text-purple-700">PDF, HWP, HWPX, Word, TXT, 사진/스마트폰 캡처(PNG/JPG)</span>
                  </p>
                  <span className="inline-block px-4 py-1.5 bg-slate-100 border border-gray-300 rounded-xl text-xs 2xl:text-sm text-gray-700 font-bold shadow-2xs">
                    또는 클릭하여 파일 탐색기에서 선택
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔍 [2단 B: 조건 검색 영역 (Search Panel)] - [🔍] 클릭 시 아래에 아코디언처럼 오픈 */}
        {activePanel === "search" && (
          <div className="bg-indigo-50/70 rounded-3xl p-5 2xl:p-7 border-2 border-indigo-300 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200 shadow-inner">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Search className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm 2xl:text-base font-extrabold text-gray-900">
                    사내 판결문 지식 DB 조건 검색
                  </h3>
                  <p className="text-[11px] 2xl:text-xs text-gray-500">
                    조건을 입력하면 최신순으로 표시되었던 판결문 기차가 조건에 맞는 판결문으로 바뀌면서 정확도순이나 최신순으로 보여집니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="p-1.5 text-gray-400 hover:text-gray-700"
                title="검색 영역 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 조건 입력 폼: 키워드 + 정렬 방식 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <label className="block text-[11px] 2xl:text-xs font-bold text-gray-700 mb-1">
                  🔍 검색 키워드 / 사건 내용
                </label>
                <input
                  type="text"
                  value={conditionQuery}
                  onChange={(e) => setConditionQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExecuteConditionSearch()}
                  placeholder="예: 지입차주, 전세사기 빌라왕, 산재 추락, 부당해고, 음주운전..."
                  className="w-full pl-3.5 pr-4 py-3 bg-white border border-indigo-200 rounded-2xl text-xs 2xl:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] 2xl:text-xs font-bold text-gray-700 mb-1">
                  ⚡ 정렬 방식 선택
                </label>
                <div className="flex items-center bg-white p-1 rounded-2xl border border-indigo-200">
                  <button
                    type="button"
                    onClick={() => setConditionSort("accuracy")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      conditionSort === "accuracy"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    🎯 정확도순
                  </button>
                  <button
                    type="button"
                    onClick={() => setConditionSort("latest")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      conditionSort === "latest"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    ⏱ 최신순
                  </button>
                </div>
              </div>

              <div className="md:col-span-3 flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isConditionSearching}
                  onClick={handleExecuteConditionSearch}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs 2xl:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-98"
                >
                  {isConditionSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>조건 검색 실행</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToLatest}
                  className="px-3 py-3 bg-white hover:bg-slate-100 text-gray-700 font-bold text-xs 2xl:text-sm rounded-2xl border border-gray-300 transition-colors shadow-2xs"
                  title="전체 최신순으로 초기화 복원"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 빠른 추천 검색 키워드 칩 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] 2xl:text-xs text-gray-500">
              <span className="font-bold text-indigo-900 mr-1">🔥 인기 쟁점 태그:</span>
              {[
                { tag: "지입차주_퇴직금", q: "지입차주" },
                { tag: "빌라왕_전세사기", q: "전세사기" },
                { tag: "건설현장_추락산재", q: "산재" },
                { tag: "구두_부당해고", q: "부당해고" },
                { tag: "교통사고_과실비율", q: "교통사고" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setConditionQuery(item.q);
                    searchCases(item.q, conditionSort).then((results) => {
                      setThemes(results);
                      setActiveSearchFilter({ query: item.q, sort: conditionSort });
                      if (results.length > 0) selectTheme(results[0].id);
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/80 font-medium transition-colors shadow-2xs"
                >
                  #{item.tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          [타임지 스타일 비균일 벤토 그리드 (Editorial Bento Grid Layout)]
          좌측 7열 (메인 피처 원고) vs 우측 5열 (헤드라인, 카드뉴스, 숏츠, 배포)
          ========================================================================= */}
      {/* 판결문 교체 시 화면 스크롤과 무관하게 모니터 화면 정중앙 고정(Fixed) 원형 로딩바 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 rounded-3xl p-8 2xl:p-10 shadow-2xl border border-gray-100 flex flex-col items-center text-center max-w-md w-full scale-100 animate-in zoom-in-95 duration-200">
            <div className="relative w-20 h-20 2xl:w-24 2xl:h-24 mb-5">
              {/* 외곽 회전 원형 링 */}
              <div className="w-full h-full rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
              {/* 안쪽 펄스 스파클 아이콘 */}
              <Sparkles className="w-8 h-8 2xl:w-10 2xl:h-10 text-purple-600 absolute inset-0 m-auto animate-pulse" />
            </div>

            <h3 className="text-lg 2xl:text-xl font-extrabold text-gray-900 tracking-tight mb-2">
              새로운 판결문 분석 및 에셋 생성 중...
            </h3>
            <p className="text-xs 2xl:text-sm text-gray-600 leading-relaxed">
              Gemini AI가 A/B 후킹 제목 · 카드뉴스 · 숏츠 30초 대본과<br />
              신경망 AI 성우 음성을 새로 합성하고 있습니다.
            </p>
            <div className="mt-4 px-3.5 py-1 bg-purple-50 text-purple-700 text-[11px] 2xl:text-xs font-bold rounded-full border border-purple-200/60">
              약 2~3초 소요
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          [타임지 스타일 비균일 벤토 그리드 (Editorial Bento Grid Layout)]
          좌측 7열 (메인 피처 원고) vs 우측 5열 (헤드라인, 카드뉴스, 숏츠, 배포)
          ========================================================================= */}
      {themeDetail && (
        <div className="relative">

          <div
            className={`grid grid-cols-1 lg:grid-cols-12 gap-6 2xl:gap-8 items-start transition-opacity duration-200 ${
              isLoading ? "opacity-30 pointer-events-none" : "opacity-100"
            }`}
          >
          {/* =====================================================================
              [타일 2 - 좌측 7열 메인 피처 타일]: 네이버 블로그 완성형 원고 (Editorial Lead Story)
              ===================================================================== */}
          <div id="tutorial-step-article" className="lg:col-span-7 bg-white border border-gray-200/90 rounded-3xl p-6 2xl:p-8 shadow-sm space-y-4">
            {/* 상단 에디토리얼 헤더 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs 2xl:text-sm font-bold border border-emerald-200 flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Editorial Main Article
                  </span>
                  <span className="text-xs 2xl:text-sm text-gray-400">
                    {themeDetail.theme_info.court_name} {themeDetail.theme_info.case_no}
                  </span>
                </div>
                <h3 className="text-lg 2xl:text-2xl font-extrabold text-gray-900 tracking-tight">
                  {themeDetail.theme_info.title}
                </h3>
              </div>

              <div id="tutorial-sub-editor" className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingBody && editedBody === null) {
                      setEditedBody(themeDetail.summary_markdown);
                    }
                    setIsEditingBody(!isEditingBody);
                  }}
                  className={`flex items-center space-x-1.5 text-xs 2xl:text-sm font-bold px-3.5 py-2.5 rounded-xl border transition-all active:scale-98 ${
                    isEditingBody
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 hover:bg-purple-50 text-slate-700 border-gray-200"
                  }`}
                >
                  {isEditingBody ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>편집 저장</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 text-purple-600" />
                      <span>원고 직접 다듬기</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyBody}
                  className="flex items-center space-x-2 text-xs 2xl:text-sm font-bold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-98"
                >
                  {copiedBody ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>전체 복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>원고 전체 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 사건 쟁점 뉴스 인포그래픽 일러스트 (TIME Magazine Editorial Graphic) */}
            <div id="tutorial-sub-thumbnail" className="rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative group bg-slate-900">
              <img
                src={
                  themeDetail.theme_info.image_url
                    ? `${BACKEND_URL}${themeDetail.theme_info.image_url}?v=brandnew_wage_2026`
                    : `${BACKEND_URL}/static/images/news_wage.jpg?v=brandnew_wage_2026`
                }
                alt="사건 쟁점 뉴스 인포그래픽"
                className="w-full h-auto object-cover max-h-[340px] 2xl:max-h-[400px] transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white text-[11px] 2xl:text-xs font-bold flex items-center space-x-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Legal Editorial Infographic</span>
              </div>
              <div className="absolute bottom-3 right-3">
                <a
                  href={
                    themeDetail.theme_info.image_url
                      ? `${BACKEND_URL}${themeDetail.theme_info.image_url}?v=brandnew_wage_2026`
                      : `${BACKEND_URL}/static/images/news_wage.jpg?v=brandnew_wage_2026`
                  }
                  download={`news_editorial_${themeDetail.theme_id}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs 2xl:text-sm font-bold rounded-xl border border-white/20 flex items-center space-x-1.5 shadow-lg transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>블로그 / 카드뉴스 썸네일 다운로드</span>
                </a>
              </div>
            </div>

            {/* 사건 팩트 서머리 배너 */}
            <div className="bg-slate-50 p-4 2xl:p-5 rounded-2xl border border-slate-200/80 text-xs 2xl:text-sm text-slate-700 space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center justify-between">
                <span>🏛 사건 쟁점 및 법원 판결 요약</span>
                {themeDetail.theme_info.official_url && (
                  <a
                    id="tutorial-sub-official-url"
                    href={themeDetail.theme_info.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:text-purple-900 hover:underline flex items-center space-x-1 font-bold text-xs bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors shadow-2xs"
                    title="국가법령정보센터 공식 판결문 전문 열람"
                  >
                    <span>공식 판결문 열람</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="leading-relaxed">{themeDetail.theme_info.subtitle}</p>
            </div>

            {/* 타임지 본문처럼 읽기 편한 대형 원고 뷰어 vs 인라인 에디터 */}
            {isEditingBody ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-purple-700 font-bold px-1">
                  <span>✍️ 워드/노션처럼 자유롭게 원고 문구를 수정하세요</span>
                  <span className="text-gray-400 font-normal">수정 후 상단 [편집 저장] 클릭</span>
                </div>
                <textarea
                  rows={20}
                  value={editedBody ?? themeDetail.summary_markdown}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full p-6 2xl:p-8 bg-white rounded-2xl border-2 border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 text-slate-800 text-sm 2xl:text-base leading-relaxed font-mono shadow-inner"
                />
              </div>
            ) : (
              <div className="p-6 2xl:p-8 bg-[#FAF8F5] rounded-2xl border border-[#EBE6DF] text-slate-800 text-sm 2xl:text-base leading-relaxed 2xl:leading-loose max-h-[640px] 2xl:max-h-[760px] overflow-y-auto whitespace-pre-wrap font-sans selection:bg-purple-100">
                {editedBody ?? themeDetail.summary_markdown}
              </div>
            )}

            <div className="flex items-center justify-between text-xs 2xl:text-sm text-gray-400 pt-1">
              <span>네이버 스마트에디터 및 브런치에 바로 붙여넣을 수 있는 정돈된 마크다운 서식입니다.</span>
              <span className="font-semibold text-slate-600">글자수: 약 {themeDetail.summary_markdown.length.toLocaleString()}자</span>
            </div>
          </div>

          {/* =====================================================================
              [우측 5열 벤토 서브 타일군]: 헤드라인 3선 + 카드뉴스 + 숏츠 + n8n 배포
              ===================================================================== */}
          <div className="lg:col-span-5 space-y-5 2xl:space-y-6">
            {/* [타일 3 - 우상단]: A/B 테스트용 후킹 제목 3선 (Headline Picks) */}
            <div id="tutorial-step-headlines" className="bg-white border border-gray-200/90 rounded-3xl p-5 2xl:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm 2xl:text-base font-extrabold text-gray-900 flex items-center">
                  <FileText className="w-4 h-4 2xl:w-5 2xl:h-5 mr-2 text-blue-600" />
                  A/B 테스트용 후킹 제목 3선
                </h4>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => selectTheme(selectedThemeId, true)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs 2xl:text-sm font-bold rounded-xl border border-purple-200 flex items-center space-x-1.5 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                  title="다른 각도의 신선한 후킹 제목과 카피를 AI로 다시 뽑습니다"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>🎲 다른 카피 다시 뽑기</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {(customTitles || themeDetail.marketing.blog_titles).map((title, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (editingTitleIdx !== idx) handleCopyTitle(title, idx);
                    }}
                    className="p-3.5 2xl:p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-gray-200/80 cursor-pointer transition-all group"
                  >
                    {editingTitleIdx === idx ? (
                      <form
                        onSubmit={(e) => saveEditedTitle(idx, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={tempTitleText}
                          onChange={(e) => setTempTitleText(e.target.value)}
                          autoFocus
                          className="flex-1 p-2 bg-white border border-purple-500 rounded-xl text-xs 2xl:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex-shrink-0"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTitleIdx(null)}
                          className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold flex-shrink-0"
                        >
                          취소
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3 mr-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs 2xl:text-sm font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-xs 2xl:text-sm text-gray-800 font-bold leading-snug group-hover:text-blue-900">
                            {title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startEditingTitle(idx, title, e)}
                            className="text-gray-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-100/60 transition-colors"
                            title="제목 문구 직접 수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="text-gray-400 group-hover:text-blue-600 p-1"
                            title="클립보드에 복사"
                          >
                            {copiedTitleIndex === idx ? (
                              <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4 2xl:w-5 2xl:h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* [타일 4 - 우중단]: 인스타그램 카드뉴스 5장 슬라이드 문구 */}
            <div className="bg-white border border-gray-200/90 rounded-3xl p-5 2xl:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm 2xl:text-base font-extrabold text-gray-900 flex items-center">
                  <ImageIcon className="w-4 h-4 2xl:w-5 2xl:h-5 mr-2 text-pink-600" />
                  인스타그램 카드뉴스 5장 슬라이드
                </h4>
                <span className="text-xs 2xl:text-sm text-gray-400">슬라이드별 복사</span>
              </div>

              <div className="space-y-2">
                {themeDetail.marketing.card_news.map((slide, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCopySlide(slide, idx)}
                    className="flex items-start justify-between p-3 rounded-2xl bg-pink-50/40 hover:bg-pink-50 border border-pink-100/80 cursor-pointer transition-colors group"
                  >
                    <div className="space-y-1 mr-2">
                      <span className="text-[10px] 2xl:text-xs font-extrabold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-md">
                        SLIDE {idx + 1}
                      </span>
                      <p className="text-xs 2xl:text-sm text-gray-700 leading-snug">
                        {slide.replace(`슬라이드 ${idx + 1}: `, "")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 group-hover:text-pink-600 flex-shrink-0 p-1 mt-0.5"
                    >
                      {copiedSlideIndex === idx ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* [타일 5 - 우하단 A]: 🎬 숏츠 / 릴스 30초 AI 성우 나레이션 */}
            <div id="tutorial-step-voice" className="bg-white border border-gray-200/90 rounded-3xl p-5 2xl:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm 2xl:text-base font-extrabold text-gray-900 flex items-center">
                  <Volume2 className="w-4 h-4 2xl:w-5 2xl:h-5 mr-2 text-rose-600" />
                  🎬 숏츠 / 릴스 30초 AI 성우 나레이션
                </h4>
                <span className="text-[10px] 2xl:text-xs font-extrabold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  신경망 AI 보이스 스튜디오
                </span>
              </div>

              {/* 성우 성별 및 연령 선택 칩 버튼 바 */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs 2xl:text-sm text-gray-700 font-bold">
                  <span>나레이션 성우 선택</span>
                  {isVoiceSynthesizing && (
                    <span className="text-purple-600 font-bold flex items-center text-[11px] animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      음성 합성 중...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isVoiceSynthesizing}
                    onClick={() => changeVoiceAction("male_2030")}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all font-bold text-xs 2xl:text-sm ${
                      selectedVoiceType === "male_2030"
                        ? "bg-purple-600 border-purple-600 text-white shadow-sm ring-2 ring-purple-400/30"
                        : "bg-slate-50 border-gray-200 hover:bg-slate-100 text-gray-700"
                    }`}
                  >
                    2030 남
                  </button>

                  <button
                    type="button"
                    disabled={isVoiceSynthesizing}
                    onClick={() => changeVoiceAction("female_2030")}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all font-bold text-xs 2xl:text-sm ${
                      selectedVoiceType === "female_2030"
                        ? "bg-purple-600 border-purple-600 text-white shadow-sm ring-2 ring-purple-400/30"
                        : "bg-slate-50 border-gray-200 hover:bg-slate-100 text-gray-700"
                    }`}
                  >
                    2030 여
                  </button>

                  <button
                    type="button"
                    disabled={isVoiceSynthesizing}
                    onClick={() => changeVoiceAction("male_3040")}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all font-bold text-xs 2xl:text-sm ${
                      selectedVoiceType === "male_3040"
                        ? "bg-purple-600 border-purple-600 text-white shadow-sm ring-2 ring-purple-400/30"
                        : "bg-slate-50 border-gray-200 hover:bg-slate-100 text-gray-700"
                    }`}
                  >
                    3040 남
                  </button>
                </div>
              </div>

              {streamUrl && (
                <div className="pt-2 space-y-2.5 border-t border-gray-100">
                  <audio
                    key={streamUrl}
                    controls
                    src={streamUrl}
                    className="w-full h-9"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] 2xl:text-xs text-gray-400">
                      CapCut / Vrew / Premiere 영상 편집기에 바로 삽입
                    </span>
                    <a
                      href={streamUrl}
                      download={`shorts_narration_${themeDetail.theme_id}_${selectedVoiceType}.mp3`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs 2xl:text-sm font-bold rounded-xl border border-gray-300 flex items-center space-x-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>MP3 다운로드</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* [타일 6 - 우하단 B]: n8n 멀티채널 자동 배포 커맨드 센터 */}
            <div id="tutorial-step-n8n" className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 2xl:p-7 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4 text-purple-300" />
                  <span className="text-xs 2xl:text-sm font-bold text-purple-200">
                    n8n 멀티채널 자동 배포 파이프라인
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="tutorial-step-config"
                    onClick={openChannelConfig}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[11px] 2xl:text-xs text-white font-bold transition-all active:scale-95 shadow-2xs"
                    title="슬랙 Webhook, 노션 ID, 블로그 주소 설정"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>{slackWebhookUrl ? "🟢 슬랙 연결됨" : "⚙️ 연동 설정"}</span>
                  </button>
                  <span className="text-[10px] 2xl:text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-bold">
                    원클릭 배포 대기
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm 2xl:text-base font-extrabold text-white">
                  생성된 원고와 숏츠 음성을 사내 채널로 일괄 전송
                </h4>
                <p className="text-xs 2xl:text-sm text-purple-200/80 mt-1 leading-relaxed">
                  [사내 노션 캘린더 등록] + [홍보팀 슬랙 알림] + [네이버 블로그 초안 발행]을 한 번에 실행합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePublishClick}
                className="w-full py-3.5 2xl:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs 2xl:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4 2xl:w-5 2xl:h-5" />
                <span>n8n 자동 발행 실행하기 (원클릭)</span>
              </button>

              {!slackWebhookUrl && !notionDatabaseId && !blogWebhookUrl && (
                <p className="text-[11px] 2xl:text-xs text-amber-300 text-center font-medium bg-amber-400/10 py-1.5 px-2 rounded-lg border border-amber-400/20">
                  💡 연동 주소가 없으므로 클릭 시 [⚙️ 연동 설정] 창이 자동으로 열립니다.
                </p>
              )}

              {publishStatus && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-xs 2xl:text-sm text-emerald-200 animate-in fade-in font-medium">
                  ✓ {publishStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}

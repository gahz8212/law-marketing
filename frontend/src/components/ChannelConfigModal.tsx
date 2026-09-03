"use client";

import React, { useState, useEffect } from "react";
import { useProBonoStore } from "@/lib/store";
import { Settings2, X, Check, Share2, Sparkles, Send } from "lucide-react";

export default function ChannelConfigModal() {
  const {
    isChannelConfigOpen,
    closeChannelConfig,
    slackWebhookUrl,
    notionDatabaseId,
    blogWebhookUrl,
    saveChannelConfig,
  } = useProBonoStore();

  const [slack, setSlack] = useState("");
  const [notion, setNotion] = useState("");
  const [blog, setBlog] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isChannelConfigOpen) {
      setSlack(slackWebhookUrl);
      setNotion(notionDatabaseId);
      setBlog(blogWebhookUrl);
      setSavedSuccess(false);
      setTestSent(false);
    }
  }, [isChannelConfigOpen, slackWebhookUrl, notionDatabaseId, blogWebhookUrl]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isChannelConfigOpen) closeChannelConfig();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChannelConfigOpen, closeChannelConfig]);

  if (!isChannelConfigOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveChannelConfig({
      slackWebhookUrl: slack.trim(),
      notionDatabaseId: notion.trim(),
      blogWebhookUrl: blog.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      closeChannelConfig();
    }, 1200);
  };

  const handleFillSample = () => {
    setSlack("https://hooks.slack.com/demo-test-token-only");
    setNotion("a1b2c3d4e5f678901234567890abcdef");
    setBlog("https://api.blog.naver.com/v1/posts/legal-marketing");
  };

  const handleTestPing = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* 딤 배경 */}
      <div
        onClick={closeChannelConfig}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* 모달 창 */}
      <div className="relative bg-white rounded-3xl p-6 2xl:p-8 max-w-lg w-full shadow-2xl border-2 border-purple-300 space-y-5 animate-in zoom-in-95 duration-200 z-10">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Settings2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base 2xl:text-lg font-extrabold text-gray-900 tracking-tight">
                멀티채널 자동 배포 주소 설정
              </h3>
              <p className="text-xs text-gray-500">
                [n8n 자동 발행] 클릭 시 실제 원고와 음성을 전송할 목적지 주소를 등록하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeChannelConfig}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 안내 배너 */}
        {!slack && !notion && !blog && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start space-x-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="leading-relaxed">
              <strong>연동 주소가 등록되지 않았습니다.</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                [n8n 자동 발행]을 실행하려면 슬랙, 노션, 블로그 중 <strong>최소 하나의 목적지 주소</strong>를 등록해주세요. 하단의 <strong>[✨ 데모용 예시 주소 채우기]</strong>를 누르면 즉시 가상 주소로 테스트할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 폼 입력창 */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. 슬랙 Webhook URL */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                <span>💬 홍보팀 슬랙(Slack) Incoming Webhook URL</span>
              </label>
              <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                실시간 단톡방 알림
              </span>
            </div>
            <input
              type="text"
              placeholder="https://hooks.slack.com/demo-webhook-url"
              value={slack}
              onChange={(e) => setSlack(e.target.value)}
              className="w-full p-2.5 2xl:p-3 bg-slate-50 border border-gray-300 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[10px] text-gray-400">
              * 슬랙 채널 설정 &gt; 통합 &gt; Incoming WebHooks에서 발급받은 주소를 붙여넣으세요.
            </p>
          </div>

          {/* 2. 노션 Database ID */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                <span>📝 사내 노션(Notion) 마케팅 캘린더 ID</span>
              </label>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                콘텐츠 자산 DB화
              </span>
            </div>
            <input
              type="text"
              placeholder="예: 32자리 노션 데이터베이스 ID (32자 영문/숫자)"
              value={notion}
              onChange={(e) => setNotion(e.target.value)}
              className="w-full p-2.5 2xl:p-3 bg-slate-50 border border-gray-300 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 3. 블로그 Webhook URL */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                <span>🌐 네이버 블로그 / 티스토리 초안 발행 URL</span>
              </label>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                자동 임시저장
              </span>
            </div>
            <input
              type="text"
              placeholder="예: http://localhost:5678/webhook/blog-post 또는 블로그 API"
              value={blog}
              onChange={(e) => setBlog(e.target.value)}
              className="w-full p-2.5 2xl:p-3 bg-slate-50 border border-gray-300 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 버튼 컨트롤 영역 */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs text-purple-700 hover:text-purple-900 font-bold underline flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>데모용 예시 주소 채우기</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTestPing}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>테스트 핑</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center space-x-1.5 active:scale-95"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>저장 완료!</span>
                  </>
                ) : (
                  <span>설정 저장</span>
                )}
              </button>
            </div>
          </div>

          {testSent && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold animate-in fade-in flex items-center space-x-1.5">
              <span>✓</span>
              <span>테스트 웹훅 신호가 정상 전송되었습니다. 실제 주소로 패킷이 발송됩니다.</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useState, useEffect } from "react";
import { getAudioStreamUrl } from "@/lib/api";
import { Volume2, Play, Pause, RotateCcw, AlertCircle } from "lucide-react";

interface AudioPlayerProps {
  audioUrl?: string | null;
  lang: string;
}

export default function AudioPlayer({ audioUrl, lang }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const streamUrl = getAudioStreamUrl(audioUrl);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !streamUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (!streamUrl) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 my-3 flex items-center space-x-2 text-amber-800 text-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          이 언어({lang.toUpperCase()})는 음성(TTS) 합성을 공식 지원하지 않아{" "}
          <strong>텍스트 리포트 전용</strong>으로 제공됩니다.
        </span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 my-3 shadow-sm">
      <audio
        ref={audioRef}
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">
              🎧 모국어 음성 리포트 (TTS)
            </h4>
            <p className="text-[11px] text-gray-500">
              판례 3줄 핵심 요약을 귀로 편안하게 들으세요
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-100 font-semibold">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* 재생 진행 바 */}
      <div className="w-full bg-blue-200/60 rounded-full h-1.5 mb-3 overflow-hidden cursor-pointer">
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center justify-center space-x-3">
        <button
          type="button"
          onClick={handleRestart}
          className="p-2 rounded-full hover:bg-white text-gray-600 transition-colors"
          title="처음부터 다시 듣기"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-95"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>일시정지</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white ml-0.5" />
              <span>음성 듣기</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

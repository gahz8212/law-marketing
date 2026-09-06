export interface ThemeItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  case_name: string;
  case_no: string;
  court_name: string;
  judgment_date: string;
  official_url: string;
  image_url?: string;
}

export interface MarketingAssets {
  blog_titles: string[];
  card_news: string[];
  target_persona: string;
  probono_message: string;
}

export interface AudioInfo {
  filename: string;
  audio_url: string;
  lang: string;
  file_size_bytes: number;
}

export interface ThemeDetailResponse {
  success: boolean;
  theme_id: string;
  theme_info: ThemeItem;
  lang: string;
  summary_bullets: string[];
  marketing: MarketingAssets;
  summary_markdown: string;
  audio?: AudioInfo | null;
}

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : typeof window !== "undefined"
    ? ""
    : "http://127.0.0.1:8000";

export async function fetchThemes(): Promise<ThemeItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/probono/themes`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("테마 목록 조회 실패");
  const data = await res.json();
  return data.themes || [];
}

export async function fetchThemeDetail(
  themeId: string,
  lang: string = "ko",
  refresh: boolean = false
): Promise<ThemeDetailResponse> {
  const base = BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000");
  const url = new URL(`${base}/api/probono/themes/${themeId}`);
  url.searchParams.set("lang", lang);
  if (refresh) {
    url.searchParams.set("refresh", "true");
  }

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("테마 상세 조회 실패");
  return res.json();
}

export async function triggerN8nPublish(payload: any): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/api/probono/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function submitCustomCase(payload: {
  case_title?: string;
  case_no?: string;
  court_name?: string;
  raw_text?: string;
  lang?: string;
}): Promise<ThemeDetailResponse> {
  const res = await fetch(`${BACKEND_URL}/api/probono/custom-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "판결문 분석 및 에셋 생성 실패");
  }
  return res.json();
}

export async function deleteThemeApi(themeId: string): Promise<{
  success: boolean;
  deleted_id: string;
  deleted_title: string;
  next_theme_id: string | null;
  remaining_count: number;
}> {
  const res = await fetch(`${BACKEND_URL}/api/probono/themes/${themeId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "판례 삭제에 실패했습니다.");
  }
  return res.json();
}

export async function uploadCaseFile(
  file: File,
  caseTitle?: string,
  courtName?: string,
  lang: string = "ko"
): Promise<ThemeDetailResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseTitle) formData.append("case_title", caseTitle);
  if (courtName) formData.append("court_name", courtName);
  formData.append("lang", lang);

  const res = await fetch(`${BACKEND_URL}/api/probono/upload-case`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("파일 분석 및 에셋 생성 실패");
  return res.json();
}

export function getAudioStreamUrl(audioPath?: string | null): string | null {
  if (!audioPath) return null;
  if (audioPath.startsWith("http")) return audioPath;
  return `${BACKEND_URL}${audioPath}`;
}

export async function synthesizeVoice(
  text: string,
  precId: string,
  voiceType: string
): Promise<AudioInfo> {
  const res = await fetch(`${BACKEND_URL}/api/probono/synthesize-voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, prec_id: precId, voice_type: voiceType }),
  });
  if (!res.ok) throw new Error("성우 음성 합성에 실패했습니다.");
  return await res.json();
}

export interface PrecedentSearchItem {
  prec_id: string;
  case_name: string;
  case_no: string;
  judgment_date: string;
  court_name: string;
  case_type?: string;
  official_url: string;
  snippet: string;
}

export async function searchPrecedents(query: string): Promise<PrecedentSearchItem[]> {
  if (!query.trim()) return [];
  const base = BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000");
  const url = new URL(`${base}/api/probono/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "6");
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.precedents || [];
}

export async function searchCases(
  query: string = "",
  sort: "accuracy" | "latest" = "accuracy",
  court?: string
): Promise<ThemeItem[]> {
  const base = BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000");
  const url = new URL(`${base}/api/probono/cases/search`);
  if (query.trim()) url.searchParams.set("query", query.trim());
  url.searchParams.set("sort", sort);
  if (court) url.searchParams.set("court", court);
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.cases || [];
}

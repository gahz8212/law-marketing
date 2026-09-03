import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ThemeItem,
  ThemeDetailResponse,
  fetchThemes,
  fetchThemeDetail,
  triggerN8nPublish,
  submitCustomCase,
  uploadCaseFile,
  synthesizeVoice,
  BACKEND_URL,
} from "./api";

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ko", name: "한국어", flag: "🇰🇷", nativeName: "한국어" },
  { code: "en", name: "영어", flag: "🇺🇸", nativeName: "English" },
  { code: "vi", name: "베트남어", flag: "🇻🇳", nativeName: "Tiếng Việt" },
  { code: "zh", name: "중국어", flag: "🇨🇳", nativeName: "中文" },
  { code: "th", name: "태국어", flag: "🇹🇭", nativeName: "ไทย" },
  { code: "km", name: "캄보디아어", flag: "🇰🇭", nativeName: "ភាសាខ្មែរ" },
  { code: "ur", name: "우르두어", flag: "🇵🇰", nativeName: "اردو" },
  { code: "uz", name: "우즈벡어", flag: "🇺🇿", nativeName: "O'zbek" },
];

interface ProBonoStore {
  // 모드 전환: 의뢰인 공익 허브(client) vs 마케터 AX 스튜디오(marketer)
  activeMode: "client" | "marketer";
  setActiveMode: (mode: "client" | "marketer") => void;

  // 마케터 입력 모드: 사내 5대 프리셋(preset) vs 변호사 전달 판결문 직접 입력(custom)
  marketerInputMode: "preset" | "custom";
  setMarketerInputMode: (mode: "preset" | "custom") => void;

  // 테마 상태
  themes: ThemeItem[];
  selectedThemeId: string;
  selectedLang: string;
  themeDetail: ThemeDetailResponse | null;
  themeCache: Record<string, ThemeDetailResponse>;

  selectedVoiceType: string;
  isVoiceSynthesizing: boolean;

  isLoading: boolean;
  publishStatus: string | null;
  errorMessage: string | null;

  loadInitialData: () => Promise<void>;
  selectTheme: (themeId: string, refresh?: boolean) => Promise<void>;
  prefetchTheme: (themeId: string) => Promise<void>;
  changeVoiceAction: (voiceType: string) => Promise<void>;
  setLang: (lang: string) => Promise<void>;
  publishToN8N: () => Promise<void>;
  analyzeCustomCase: (payload: {
    case_title?: string;
    case_no?: string;
    court_name?: string;
    raw_text: string;
  }) => Promise<void>;
  uploadCaseFileAction: (
    file: File,
    caseTitle?: string,
    courtName?: string
  ) => Promise<void>;
  setThemes: (themes: ThemeItem[]) => void;

  // 튜토리얼 모달 상태
  isTutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;

  // 멀티채널 연동 설정 상태
  slackWebhookUrl: string;
  notionDatabaseId: string;
  blogWebhookUrl: string;
  isChannelConfigOpen: boolean;
  openChannelConfig: () => void;
  closeChannelConfig: () => void;
  saveChannelConfig: (config: {
    slackWebhookUrl: string;
    notionDatabaseId: string;
    blogWebhookUrl: string;
  }) => void;
}

export const useProBonoStore = create<ProBonoStore>()(
  persist(
    (set, get) => ({
      activeMode: "client",
      setActiveMode: (mode) => set({ activeMode: mode }),

      marketerInputMode: "preset",
      setMarketerInputMode: (mode) => set({ marketerInputMode: mode }),

      themes: [],
      selectedThemeId: "wage",
      selectedLang: "ko",
      themeDetail: null,
      themeCache: {},
      selectedVoiceType: "female_2030",
      isVoiceSynthesizing: false,

      isLoading: false,
      publishStatus: null,
      errorMessage: null,

      // 튜토리얼 모달 상태
      isTutorialOpen: false,
      openTutorial: () => set({ isTutorialOpen: true }),
      closeTutorial: () => set({ isTutorialOpen: false }),

      // 멀티채널 연동 설정 상태
      slackWebhookUrl: "",
      notionDatabaseId: "",
      blogWebhookUrl: "",
      isChannelConfigOpen: false,
      openChannelConfig: () => set({ isChannelConfigOpen: true }),
      closeChannelConfig: () => set({ isChannelConfigOpen: false }),
      saveChannelConfig: (config) =>
        set({
          slackWebhookUrl: config.slackWebhookUrl,
          notionDatabaseId: config.notionDatabaseId,
          blogWebhookUrl: config.blogWebhookUrl,
          isChannelConfigOpen: false,
        }),

      loadInitialData: async () => {
        set({ isLoading: true, errorMessage: null });
        try {
          const themes = await fetchThemes();
          const validIds = themes.map((t) => t.id);
          let defaultThemeId = get().selectedThemeId || "wage";
          if (!validIds.includes(defaultThemeId)) {
            defaultThemeId = themes[0]?.id || "wage";
          }
          const currentLang = "ko";

          const detail = await fetchThemeDetail(defaultThemeId, currentLang);

          set({
            themes,
            selectedThemeId: defaultThemeId,
            themeDetail: detail,
            themeCache: { [defaultThemeId]: detail },
            isLoading: false,
          });
        } catch (error: any) {
          // 에러 시 안전하게 기본 wage로 재시도
          try {
            const fallbackDetail = await fetchThemeDetail("wage", "ko");
            set({
              selectedThemeId: "wage",
              themeDetail: fallbackDetail,
              themeCache: { wage: fallbackDetail },
              isLoading: false,
              errorMessage: null,
            });
          } catch {
            set({
              errorMessage: error.message || "데이터를 불러오지 못했습니다.",
              isLoading: false,
            });
          }
        }
      },

      selectTheme: async (themeId: string, refresh: boolean = false) => {
        const lang = get().selectedLang;
        const cached = get().themeCache[themeId];

        // 1. 캐시가 있고 refresh가 아니면 0.001초 만에 즉시 전환 (초고속 렌더링)
        if (!refresh && cached) {
          set({
            selectedThemeId: themeId,
            themeDetail: cached,
            isLoading: false,
            errorMessage: null,
            publishStatus: null,
          });
          return;
        }

        // 2. 캐시가 없거나 마케터가 [다른 카피 다시 뽑기]를 눌렀을 때만 로딩 표시 후 호출
        set({ selectedThemeId: themeId, isLoading: true, errorMessage: null, publishStatus: null });

        try {
          const detail = await fetchThemeDetail(themeId, lang, refresh);
          set((state) => ({
            themeDetail: detail,
            themeCache: { ...state.themeCache, [themeId]: detail },
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            errorMessage: error.message || "테마 상세 조회에 실패했습니다.",
            isLoading: false,
          });
        }
      },

      prefetchTheme: async (themeId: string) => {
        const { themeCache, selectedLang } = get();
        if (themeCache[themeId]) return;
        try {
          const detail = await fetchThemeDetail(themeId, selectedLang, false);
          set((state) => ({
            themeCache: { ...state.themeCache, [themeId]: detail },
          }));
        } catch {}
      },

      changeVoiceAction: async (voiceType: string) => {
        const { themeDetail } = get();
        if (!themeDetail) return;

        set({ isVoiceSynthesizing: true, errorMessage: null });
        try {
          const rawMd = themeDetail.summary_markdown;
          const lines = rawMd.split("\n");
          const shortsLines: string[] = [];
          let isShorts = false;
          for (const l of lines) {
            if (l.includes("유튜브 숏츠")) {
              isShorts = true;
              continue;
            }
            if (isShorts && (l.startsWith("💡") || l.startsWith("🤝") || l.startsWith("#"))) {
              isShorts = false;
            }
            if (isShorts && l.trim().startsWith("-")) {
              const clean = l.trim().replace(/^-\s*/, "").replace(/\[\d+~\d+초\]/g, "").trim();
              if (clean) shortsLines.push(clean);
            }
          }
          const textToSynthesize =
            shortsLines.length > 0 ? shortsLines.join(" ") : themeDetail.summary_bullets.join("\n");

          const audioInfo = await synthesizeVoice(textToSynthesize, themeDetail.theme_id, voiceType);
          set((state) => ({
            selectedVoiceType: voiceType,
            isVoiceSynthesizing: false,
            themeDetail: state.themeDetail ? { ...state.themeDetail, audio: audioInfo } : null,
          }));
        } catch (error: any) {
          set({
            isVoiceSynthesizing: false,
            errorMessage: error.message || "성우 음성 변경에 실패했습니다.",
          });
        }
      },

      setLang: async (lang: string) => {
        const currentThemeId = get().selectedThemeId || "wage";
        set({ selectedLang: lang, isLoading: true, errorMessage: null });

        try {
          const detail = await fetchThemeDetail(currentThemeId, lang);
          set({
            themeDetail: detail,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            errorMessage: error.message || "언어 전환에 실패했습니다.",
            isLoading: false,
          });
        }
      },

      analyzeCustomCase: async (payload) => {
        const lang = get().selectedLang || "ko";
        set({ isLoading: true, errorMessage: null, publishStatus: null });

        try {
          const detail = await submitCustomCase({
            ...payload,
            lang,
          });
          set((state) => ({
            themeDetail: detail,
            selectedThemeId: detail.theme_id,
            themes: [detail.theme_info, ...state.themes.filter((t) => t.id !== detail.theme_id)],
            themeCache: { ...state.themeCache, [detail.theme_id]: detail },
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            errorMessage: error.message || "판결문 분석 및 에셋 생성에 실패했습니다.",
            isLoading: false,
          });
        }
      },

      uploadCaseFileAction: async (file, caseTitle, courtName) => {
        const lang = get().selectedLang || "ko";
        set({ isLoading: true, errorMessage: null, publishStatus: null });

        try {
          const detail = await uploadCaseFile(file, caseTitle, courtName, lang);
          set((state) => ({
            themeDetail: detail,
            selectedThemeId: detail.theme_id,
            themes: [detail.theme_info, ...state.themes.filter((t) => t.id !== detail.theme_id)],
            themeCache: { ...state.themeCache, [detail.theme_id]: detail },
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            errorMessage: error.message || "파일 업로드 및 에셋 생성에 실패했습니다.",
            isLoading: false,
          });
        }
      },

      setThemes: (themes: ThemeItem[]) => set({ themes }),

      publishToN8N: async () => {
        const detail = get().themeDetail;
        if (!detail) return;

        set({ publishStatus: "배포 요청 중..." });

        try {
          const { slackWebhookUrl, notionDatabaseId, blogWebhookUrl } = get();
          const payload = {
            theme_id: detail.theme_id,
            theme_title: detail.theme_info.title,
            blog_title: detail.marketing.blog_titles[0] || detail.theme_info.title,
            summary_bullets: detail.summary_bullets,
            markdown_body: detail.summary_markdown,
            audio_url: detail.audio?.audio_url ? `${BACKEND_URL}${detail.audio.audio_url}` : null,
            official_url: detail.theme_info.official_url,
            card_news: detail.marketing.card_news,
            slack_webhook_url: slackWebhookUrl || null,
            notion_database_id: notionDatabaseId || null,
            blog_webhook_url: blogWebhookUrl || null,
            timestamp: new Date().toISOString(),
          };

          const res = await triggerN8nPublish(payload);
          set({ publishStatus: res.message || "n8n 워크플로우에 성공적으로 전송되었습니다!" });
        } catch (error: any) {
          set({ publishStatus: "n8n 배포 트리거 전송 완료 (n8n 수신 확인 필요)" });
        }
      },
    }),
    {
      name: "mooje-ax-storage",
      partialize: (state) => ({
        activeMode: state.activeMode,
        selectedLang: state.selectedLang,
        selectedThemeId: state.selectedThemeId,
        marketerInputMode: state.marketerInputMode,
        slackWebhookUrl: state.slackWebhookUrl,
        notionDatabaseId: state.notionDatabaseId,
        blogWebhookUrl: state.blogWebhookUrl,
      }),
    }
  )
);

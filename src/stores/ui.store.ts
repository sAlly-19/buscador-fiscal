import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UiTheme = 'dark' | 'light';
export type FeedbackKind = 'success' | 'info' | 'warning' | 'error';

export interface FeedbackInput {
  kind: FeedbackKind;
  title: string;
  message: string;
  technicalDetails?: string;
  durationMs?: number;
}

export interface FeedbackItem extends Omit<FeedbackInput, 'durationMs'> {
  id: string;
  durationMs: number | null;
}

interface UiState {
  theme: UiTheme;
  feedbackQueue: FeedbackItem[];
  setTheme: (theme: UiTheme) => void;
  toggleTheme: () => void;
  pushFeedback: (input: FeedbackInput) => string;
  dismissFeedback: (id?: string) => void;
}

const STORAGE_KEY = 'buscador-fiscal-ui-v1';
let feedbackSequence = 0;

const fallbackStorage: Storage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

function isUiTheme(value: unknown): value is UiTheme {
  return value === 'dark' || value === 'light';
}

export function feedbackDuration(kind: FeedbackKind): number | null {
  if (kind === 'success') return 3000;
  if (kind === 'info' || kind === 'warning') return 5000;
  return null;
}

export function formatFeedbackForClipboard(item: FeedbackItem): string {
  const base = `${item.title}\n${item.message}`;
  return item.technicalDetails
    ? `${base}\n\nDetalhes técnicos:\n${item.technicalDetails}`
    : base;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      feedbackQueue: [],
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      pushFeedback: (input) => {
        const id = `feedback-${Date.now()}-${++feedbackSequence}`;
        const item: FeedbackItem = {
          ...input,
          id,
          durationMs: input.durationMs ?? feedbackDuration(input.kind),
        };
        set((state) => ({ feedbackQueue: [...state.feedbackQueue, item] }));
        return id;
      },
      dismissFeedback: (id) => set((state) => ({
        feedbackQueue: id
          ? state.feedbackQueue.filter((item) => item.id !== id)
          : state.feedbackQueue.slice(1),
      })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => typeof localStorage === 'undefined' ? fallbackStorage : localStorage),
      partialize: (state) => ({ theme: state.theme }) as UiState,
      merge: (persisted, current) => {
        const stored = persisted as Partial<UiState> | undefined;
        return {
          ...current,
          theme: isUiTheme(stored?.theme) ? stored.theme : 'dark',
        };
      },
    },
  ),
);

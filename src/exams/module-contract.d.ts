import type { MessageId } from '../i18n/message-ids.js';

export interface ExamMountContext {
  app: HTMLElement;
  announcer: HTMLElement;
  gamutChip: HTMLElement;
  locale: string;
  localeHref: (route?: string, targetLocale?: string) => string;
  m: (id: MessageId, values?: Record<string, string | number>) => string;
  t: (source: string, values?: Record<string, string | number>) => string;
  navigate: (name: string) => boolean;
  navigateHome: () => boolean;
}

export type ExamCleanup = () => void;

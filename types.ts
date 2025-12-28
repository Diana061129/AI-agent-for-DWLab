export type TimeRange = '1w' | '1m' | '6m' | '1y' | 'all';
export type Language = 'en' | 'zh';
export type ModelType = 'fast' | 'balanced' | 'deep-think';

export interface UserSettings {
  researchField: string;
  updateFrequency: 'daily' | 'weekly';
  experienceLevel: 'student' | 'researcher' | 'expert';
  timeRange: TimeRange;
  language: Language;
  selectedModel: ModelType;
}

export interface UserStats {
  points: number;
  papersRead: number;
  minutesStudied: number;
  quizzesTaken: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
  isError?: boolean;
}

export interface BulletinArticle {
  title: string;
  summary: string;
  significance: string;
  methodology: string;
  sourceUrl?: string;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT',
  LIT_REVIEW = 'LIT_REVIEW',
  GAME_CENTER = 'GAME_CENTER',
  SETTINGS = 'SETTINGS',
}

export interface Slide {
  slideTitle: string;
  bulletPoints: string[];
  speakerNotes: string;
}

export interface LitReviewResult {
  id?: string;
  date?: string;
  title: string;
  mainWork: string;
  significantProgress: string;
  principlesAndMethods: string;
  implications: string;
  criticalAnalysis?: string | {
    limitations?: string;
    biases?: string;
    missingValidation?: string;
  };
  pptDraft?: Slide[];
  groupMeetingSpeech?: string;
  imageAnalysis?: string;
}
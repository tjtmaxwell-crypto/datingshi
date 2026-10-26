export type GradeLevel = 7 | 8 | 9;
export type ScoreBand = "low" | "mid" | "high";
export type Tier = "A" | "B" | "C";
export type LanguageComplexity = "normal" | "simple";
export type ErrorTag = "概念" | "运算" | "审题" | "跳步";
export type SessionStatus = "answering" | "graded" | "chatting" | "wrapped";
export type SessionSource = "photo" | "system";
export type Verdict = "correct" | "wrong" | "unverified";

export type TeachingAction =
  | "restate"
  | "ask_next_step"
  | "half_hint"
  | "demonstrate_one_step"
  | "out_of_scope"
  | "acknowledge_step"
  | "correct_attempt";

export interface ErrorPattern {
  any: string[];
  tag: ErrorTag;
  reason: string;
  stuckLabel: string;
}

export interface Problem {
  id: string;
  topic: string;
  grade: GradeLevel;
  tier: Tier;
  focus: string;
  stem: string;
  restate: string;
  restateSimple: string;
  answer: string;
  accept: string[];
  /** 最后一项是最终答案，提示里永远不说。 */
  steps: string[];
  asks: string[];
  asksSimple: string[];
  halfHints: string[];
  halfHintsSimple: string[];
  checkpoints: string[];
  errors: ErrorPattern[];
}

export interface TeachingDecision {
  action: TeachingAction;
  actionLabel: string;
  languageComplexity: LanguageComplexity;
  /** 中性教学句。口气层只能包裹它，不能改数学内容。 */
  body: string;
  simpleBody: string;
  revealedStep: string | null;
  topic: string;
}

export interface Learner {
  id: string;
  name: string;
  grade: GradeLevel;
  scoreBand: ScoreBand;
  lastStuckPoint: string;
  languageComplexity: LanguageComplexity;
  createdAt: string;
}

export interface GradeLine {
  text: string;
  suspicious: boolean;
}

export interface GradeResult {
  verdict: Verdict;
  correct: boolean;
  errorTag: ErrorTag | null;
  reason: string;
  stuckLabel: string | null;
  suspiciousStep: string | null;
  suspiciousIndex: number | null;
  thinSteps: boolean;
  lines: GradeLine[];
  personaLine?: string;
}

export interface LearningArchive {
  sentences: [string, string, string];
  parentSummary: string;
}

export interface PublicProblem {
  id: string;
  topic: string;
  grade: GradeLevel;
  tier: Tier;
  focus: string;
  stem: string;
}

export interface PublicHint {
  content: string;
  neutral: string;
  action: TeachingAction;
  actionLabel: string;
  languageComplexity: LanguageComplexity;
  source: "template" | "llm";
}

export interface PublicMessage {
  id: string;
  role: "tutor" | "learner";
  content: string;
  decision: {
    action: TeachingAction;
    actionLabel: string;
    languageComplexity: LanguageComplexity;
    neutral: string;
    source: "template" | "llm";
  } | null;
  createdAt: string;
}

export interface LearnerView {
  id: string;
  name: string;
  grade: GradeLevel;
  scoreBand: ScoreBand;
  gradeLabel: string;
  bandLabel: string;
  lastStuckPoint: string;
  languageComplexity: LanguageComplexity;
  tier: Tier;
  tierLabel: string;
  todayGoal: string;
}

export interface BootstrapResponse {
  learner: LearnerView;
  latest: { id: string; status: SessionStatus; stem: string; resumePath: string } | null;
  bankCount: number;
  providers: { ocr: "stub" | "remote"; llm: "template" | "model" };
}

export interface PublicSession {
  id: string;
  source: SessionSource;
  status: SessionStatus;
  recognizedText: string;
  answerText: string;
  topic: string;
  tier: Tier | null;
  outOfScope: boolean;
  easierProblem: { id: string; stem: string; topic: string } | null;
  hintLevel: number;
  languageComplexity: LanguageComplexity;
  problem: PublicProblem | null;
  hints: PublicHint[];
  grade: GradeResult | null;
  archive: LearningArchive | null;
  messages: PublicMessage[];
  resumePath: string;
}

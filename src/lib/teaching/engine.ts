import { ACTION_LABEL } from "@/lib/labels";
import { answerMatches, hasFragment, normalize } from "@/lib/text";
import type { LanguageComplexity, Problem, TeachingAction, TeachingDecision } from "@/lib/types";

/**
 * 教学决定层。
 * 只决定下一步教什么，不负责孙悟空的口气。
 * 「听不懂」只把 languageComplexity 改成 simple，不降低难度，也不往后跳一层。
 */

export interface ScaffoldState {
  problem: Problem;
  displayStem: string;
  completedHints: number;
  revealedSteps: number;
  languageComplexity: LanguageComplexity;
  outOfScope: boolean;
  easierStem: string | null;
}

export interface ChatState extends ScaffoldState {
  utterance: string;
}

const CONFUSION = ["听不懂", "不明白", "看不懂", "说简单", "简单点", "太绕", "听不清"];
const HELP = ["下一步", "不会", "不知道", "提示", "怎么做", "然后呢", "卡住", "帮帮", "没思路", "怎么想"];
const SUBMIT = ["算完", "做完", "交卷"];

export function actionForCompleted(completed: number): TeachingAction {
  if (completed <= 0) return "restate";
  if (completed === 1) return "ask_next_step";
  if (completed === 2) return "half_hint";
  return "demonstrate_one_step";
}

export function isConfusion(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return CONFUSION.some((word) => compact.includes(word));
}

function isHelpSeeking(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return HELP.some((word) => compact.includes(word));
}

function isSubmitNudge(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return SUBMIT.some((word) => compact.includes(word));
}

function lineAt(lines: string[], index: number, fallback: string): string {
  if (!lines.length) return fallback;
  return lines[Math.min(Math.max(index, 0), lines.length - 1)] ?? fallback;
}

function revealableIndex(problem: Problem, revealedSteps: number): number {
  const lastAllowed = problem.steps.length - 2;
  if (lastAllowed < 0) return -1;
  return Math.min(Math.max(revealedSteps, 0), lastAllowed);
}

function sameStem(problem: Problem, displayStem: string): boolean {
  const shown = normalize(displayStem);
  if (!shown) return true;
  return shown === normalize(problem.stem) || shown.includes(normalize(problem.stem.split("：").pop() ?? problem.stem));
}

export function makeDecision(
  action: TeachingAction,
  state: ScaffoldState,
  override?: { body: string; simpleBody: string },
): TeachingDecision {
  const stepIndex = Math.max(state.revealedSteps, 0);
  let body = override?.body ?? "";
  let simpleBody = override?.simpleBody ?? "";
  let revealedStep: string | null = null;

  if (!override) {
    if (action === "out_of_scope") {
      body = state.easierStem
        ? `先别硬做。换成同主题、但在当前目标里的一题：${state.easierStem}`
        : `先别硬做。回到今天的${state.problem.topic}小目标，挑一道更基础的。`;
      simpleBody = state.easierStem ? `先换容易的：${state.easierStem}` : `先别做。换一道简单的${state.problem.topic}。`;
    } else if (action === "restate") {
      const core = state.problem.restate;
      const simple = state.problem.restateSimple;
      const shown = state.displayStem.trim();
      body = !shown || sameStem(state.problem, shown) ? core : `题目是「${shown}」。${core}`;
      simpleBody = !shown || sameStem(state.problem, shown) ? simple : `题目是「${shown}」。${simple}`;
    } else if (action === "ask_next_step") {
      body = lineAt(state.problem.asks, stepIndex, "下一步只做一个小动作。先别写出最后结果。");
      simpleBody = lineAt(state.problem.asksSimple, stepIndex, "下一步做什么？先别写答案。");
    } else if (action === "half_hint") {
      body = lineAt(state.problem.halfHints, stepIndex, "只提醒操作，不写出最后结果。");
      simpleBody = lineAt(state.problem.halfHintsSimple, stepIndex, "只提醒一下。先别写答案。");
    } else if (action === "demonstrate_one_step") {
      const index = revealableIndex(state.problem, state.revealedSteps);
      revealedStep = index >= 0 ? state.problem.steps[index] : null;
      body = revealedStep ? `只演示这一步：${revealedStep}。后面的留给你。` : "最后结果先留给你，俺不能把整题说完。";
      simpleBody = revealedStep ? `只看这一步：${revealedStep}。接下来你写。` : "最后结果先留着。你来写。";
    } else if (action === "acknowledge_step") {
      body = "这一步的方向对。接着只想下一小步，先别写出最后结果。";
      simpleBody = "这一步对。下一小步你来，先别写答案。";
    } else {
      body = "这句还没和方程对上。先写等式，再决定哪一项要挪。不要跳到最后结果。";
      simpleBody = "先写等式。先别写最后答案。";
    }
  }

  return {
    action,
    actionLabel: ACTION_LABEL[action],
    languageComplexity: state.languageComplexity,
    body,
    simpleBody,
    revealedStep,
    topic: state.problem.topic,
  };
}

export function advanceScaffold(state: ScaffoldState): {
  decision: TeachingDecision;
  completedHints: number;
  revealedSteps: number;
} {
  if (state.outOfScope) {
    return {
      decision: makeDecision("out_of_scope", state),
      completedHints: state.completedHints,
      revealedSteps: state.revealedSteps,
    };
  }
  const action = actionForCompleted(state.completedHints);
  const decision = makeDecision(action, state);
  let revealedSteps = state.revealedSteps;
  if (action === "demonstrate_one_step") {
    const lastAllowed = state.problem.steps.length - 2;
    if (lastAllowed >= 0) revealedSteps = Math.min(state.revealedSteps + 1, lastAllowed + 1);
  }
  return {
    decision,
    completedHints: state.completedHints + 1,
    revealedSteps,
  };
}

function currentAction(state: ScaffoldState): TeachingAction {
  return actionForCompleted(Math.max(state.completedHints - 1, 0));
}

function classifyAttempt(text: string, problem: Problem): "final" | "error" | "partial" | "none" {
  if (answerMatches(text, problem.accept)) return "final";
  if (problem.errors.some((pattern) => pattern.any.some((token) => hasFragment(text, token)))) return "error";
  if (problem.checkpoints.some((token) => hasFragment(text, token))) return "partial";
  return "none";
}

export function decideChat(state: ChatState): {
  decision: TeachingDecision;
  completedHints: number;
  revealedSteps: number;
  languageComplexity: LanguageComplexity;
} {
  if (state.outOfScope) {
    return {
      decision: makeDecision("out_of_scope", state),
      completedHints: state.completedHints,
      revealedSteps: state.revealedSteps,
      languageComplexity: state.languageComplexity,
    };
  }

  if (isConfusion(state.utterance)) {
    const action = currentAction(state);
    const replay =
      action === "demonstrate_one_step"
        ? { ...state, languageComplexity: "simple" as const, revealedSteps: Math.max(state.revealedSteps - 1, 0) }
        : { ...state, languageComplexity: "simple" as const };
    return {
      decision: makeDecision(action, replay),
      completedHints: state.completedHints,
      revealedSteps: state.revealedSteps,
      languageComplexity: "simple",
    };
  }

  if (isSubmitNudge(state.utterance)) {
    return {
      decision: makeDecision("acknowledge_step", state, {
        body: "把步骤按顺序写进答题区，再点交卷。聊天里不公布最终答案。",
        simpleBody: "去答题区交卷。这里不说最终答案。",
      }),
      completedHints: state.completedHints,
      revealedSteps: state.revealedSteps,
      languageComplexity: state.languageComplexity,
    };
  }

  const attempt = classifyAttempt(state.utterance, state.problem);
  if (attempt === "final") {
    return {
      decision: makeDecision("acknowledge_step", state, {
        body: "你好像已经有结果了。请写到答题区交卷，俺不在这儿把解答再念一遍。",
        simpleBody: "有结果了就去交卷。这里不重复答案。",
      }),
      completedHints: state.completedHints,
      revealedSteps: state.revealedSteps,
      languageComplexity: state.languageComplexity,
    };
  }
  if (attempt === "error") {
    const pattern = state.problem.errors.find((item) => item.any.some((token) => hasFragment(state.utterance, token)));
    const reason = pattern?.reason ?? "这一步和题目还没对上";
    return {
      decision: makeDecision("correct_attempt", state, {
        body: `先停在这一步。${reason}。改完再往下写，先不要算最后结果。`,
        simpleBody: `${reason}。先改这里。`,
      }),
      completedHints: state.completedHints,
      revealedSteps: state.revealedSteps,
      languageComplexity: state.languageComplexity,
    };
  }
  if (attempt === "partial") {
    return {
      decision: makeDecision("acknowledge_step", state),
      completedHints: state.completedHints + 1,
      revealedSteps: state.revealedSteps,
      languageComplexity: state.languageComplexity,
    };
  }
  if (isHelpSeeking(state.utterance)) {
    const advanced = advanceScaffold(state);
    return { ...advanced, languageComplexity: state.languageComplexity };
  }
  return {
    decision: makeDecision("correct_attempt", state),
    completedHints: state.completedHints,
    revealedSteps: state.revealedSteps,
    languageComplexity: state.languageComplexity,
  };
}

import type { Problem } from "@/lib/types";
import { normalize, problemKey } from "@/lib/text";
import { isOutOfScope, targetTier, tierRank, type TierInput } from "@/lib/teaching/plan";

const BEYOND_MARKERS = ["二次", "x²", "x^2", "函数", "三角", "勾股", "证明", "抛物线", "根号", "不等式", "sin", "cos", "tan"];

export function looksBeyondTrack(text: string): boolean {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  return BEYOND_MARKERS.some((marker) => compact.includes(marker.toLowerCase()));
}

export function looksLikeAlgebra(text: string): boolean {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  return compact.includes("=") && /[xyab]/.test(compact);
}

export function matchProblem(text: string, problems: Problem[]): Problem | null {
  const normalized = normalize(text);
  if (normalized.length < 4) return null;
  let best: Problem | null = null;
  let bestLength = 0;
  for (const problem of problems) {
    const key = problemKey(problem.stem);
    if (key.length < 4) continue;
    if (normalized.includes(key)) {
      if (key.length > bestLength) {
        best = problem;
        bestLength = key.length;
      }
    }
  }
  return best;
}

export function pickInScope(input: TierInput, problems: Problem[], topic?: string): Problem | null {
  const eligible = problems.filter((problem) => !isOutOfScope(input, problem));
  const sameTopic = topic ? eligible.filter((problem) => problem.topic === topic) : [];
  const pool = sameTopic.length ? sameTopic : eligible;
  if (!pool.length) return null;
  const target = targetTier(input);
  return (
    pool.find((problem) => problem.tier === target) ??
    [...pool].sort((a, b) => tierRank(b.tier) - tierRank(a.tier))[0]
  );
}

export function pickEasier(input: TierInput, current: Problem, problems: Problem[]): Problem | null {
  const eligible = problems.filter((problem) => problem.id !== current.id && !isOutOfScope(input, problem));
  const sameTopic = eligible.filter((problem) => problem.topic === current.topic);
  const pool = sameTopic.length ? sameTopic : eligible;
  if (!pool.length) return null;
  const target = targetTier(input);
  return [...pool].sort((a, b) => {
    const distance = Math.abs(tierRank(a.tier) - tierRank(target)) - Math.abs(tierRank(b.tier) - tierRank(target));
    if (distance !== 0) return distance;
    if (a.focus === current.focus && b.focus !== current.focus) return -1;
    if (b.focus === current.focus && a.focus !== current.focus) return 1;
    return tierRank(b.tier) - tierRank(a.tier);
  })[0];
}

export function pickSystemProblem(input: TierInput & { lastStuckPoint: string }, problems: Problem[], avoidId?: string): Problem {
  const target = targetTier(input);
  const inScope = problems.filter((problem) => !isOutOfScope(input, problem));
  const sameTier = inScope.filter((problem) => problem.tier === target);
  const pool = sameTier.length ? sameTier : inScope.length ? inScope : problems;
  const stuck = input.lastStuckPoint.trim();
  const related = pool.filter((problem) => {
    if (!stuck) return false;
    if (stuck.includes(problem.focus) || problem.focus.includes(stuck.slice(0, 2))) return true;
    return problem.errors.some((pattern) => stuck.includes(pattern.stuckLabel) || pattern.stuckLabel.includes(stuck.slice(0, 2)));
  });
  const preferred = (related.length ? related : pool).filter((problem) => problem.id !== avoidId);
  return preferred[0] ?? pool[0];
}

export interface PhotoResolution {
  kind: "matched" | "custom" | "beyond";
  problem: Problem | null;
  outOfScope: boolean;
  easier: Problem | null;
}

export function classifyPhotoText(text: string, input: TierInput, problems: Problem[]): PhotoResolution {
  const matched = matchProblem(text, problems);
  if (matched) {
    const outOfScope = isOutOfScope(input, matched);
    return {
      kind: "matched",
      problem: matched,
      outOfScope,
      easier: outOfScope ? pickEasier(input, matched, problems) : null,
    };
  }
  if (looksBeyondTrack(text) || !looksLikeAlgebra(text)) {
    return {
      kind: "beyond",
      problem: null,
      outOfScope: true,
      easier: pickInScope(input, problems, "一元一次方程"),
    };
  }
  return { kind: "custom", problem: null, outOfScope: false, easier: null };
}

export function sampleStem(input: TierInput, problems: Problem[], mode: "default" | "beyond", photoSampleId: string): string {
  if (mode === "beyond") {
    const hard = problems.find((problem) => isOutOfScope(input, problem));
    return hard?.stem ?? "解方程：x² - 5x + 6 = 0";
  }
  return problems.find((problem) => problem.id === photoSampleId)?.stem ?? pickSystemProblem({ ...input, lastStuckPoint: "" }, problems).stem;
}

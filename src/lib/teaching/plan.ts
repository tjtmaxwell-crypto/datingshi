import { TIER_LABEL } from "@/lib/labels";
import type { GradeLevel, ScoreBand, Tier } from "@/lib/types";

export interface TierInput {
  grade: GradeLevel;
  scoreBand: ScoreBand;
}

const TIER_RANK: Record<Tier, number> = { A: 0, B: 1, C: 2 };

/**
 * 目标难度只由年级和分数段决定。
 * 「听不懂」不会改这里。
 */
export function targetTier(input: TierInput): Tier {
  const table: Record<GradeLevel, Record<ScoreBand, Tier>> = {
    7: { low: "A", mid: "A", high: "B" },
    8: { low: "A", mid: "B", high: "B" },
    9: { low: "B", mid: "B", high: "C" },
  };
  return table[input.grade][input.scoreBand];
}

export function tierRank(tier: Tier): number {
  return TIER_RANK[tier];
}

export function isOutOfScope(input: TierInput, problem: { grade: number; tier: Tier }): boolean {
  if (problem.grade > input.grade) return true;
  return tierRank(problem.tier) > tierRank(targetTier(input));
}

export function todayGoal(lastStuckPoint: string, tier: Tier): string {
  const level = `${tier} · ${TIER_LABEL[tier]}`;
  if (lastStuckPoint.trim()) {
    return `把「${lastStuckPoint.trim()}」练到能自己做对。难度停在 ${level}。`;
  }
  return `独立做对一道难度 ${level} 的一元一次方程。`;
}

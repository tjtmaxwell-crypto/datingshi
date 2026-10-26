import type { GradeLevel, ScoreBand, TeachingAction, Tier } from "@/lib/types";

export const GRADE_LABEL: Record<GradeLevel, string> = {
  7: "初一",
  8: "初二",
  9: "初三",
};

export const BAND_LABEL: Record<ScoreBand, string> = {
  low: "偏低",
  mid: "中等",
  high: "较好",
};

export const TIER_LABEL: Record<Tier, string> = {
  A: "基础",
  B: "进阶",
  C: "挑战",
};

export const ACTION_LABEL: Record<TeachingAction, string> = {
  restate: "复述题意",
  ask_next_step: "追问下一步",
  half_hint: "半提示",
  demonstrate_one_step: "演示一步",
  out_of_scope: "超当前目标",
  acknowledge_step: "确认一步",
  correct_attempt: "纠正方向",
};

export function tierText(tier: Tier): string {
  return `${tier} · ${TIER_LABEL[tier]}`;
}

import { tierText } from "@/lib/labels";
import type { GradeResult, LearningArchive, Problem, Tier } from "@/lib/types";

function sentence(text: string): string {
  const trimmed = text.trim().replace(/[。！？]+$/g, "");
  return `${trimmed}。`;
}

export function buildArchive(input: {
  problem: Problem;
  displayStem: string;
  tier: Tier;
  grade: GradeResult | null;
}): LearningArchive {
  const topic = input.problem.topic;
  const stem = input.displayStem.trim() || input.problem.stem;
  const first = sentence(`今天练的是${topic}，题目是「${stem}」`);
  const level = tierText(input.tier);

  if (!input.grade) {
    return {
      sentences: [first, sentence("这道题还没有交卷"), sentence("下一步回到答题区，先把第一小步写出来")],
      parentSummary: `孩子今天打开了${topic}的练习，题目是「${stem}」。还没有交卷。建议让孩子先自己写下第一步，家长先不要讲完整解法。`,
    };
  }

  if (input.grade.verdict === "unverified") {
    return {
      sentences: [first, sentence("这道题不在题库里，所以没有判断对错"), sentence("下一步可以换一道系统出的题，或者改回今天的小目标")],
      parentSummary: `孩子今天尝试了一道题库以外的题目。系统没有判断对错。建议回到当前目标内的${topic}，用一道有步骤的题再练一次。`,
    };
  }

  if (input.grade.correct) {
    const second = input.grade.thinSteps ? sentence("结果是对的，不过过程几乎只有一行") : sentence(`结果是对的，难度停在${level}`);
    return {
      sentences: [first, second, sentence("下一步可以用一道同难度的新题，独立再做一遍")],
      parentSummary: `孩子今天练习了${topic}，难度是${level}。结果正确。建议用一道新题再独立做一遍，不必把整题重讲一遍。`,
    };
  }

  const step = input.grade.suspiciousStep ?? "没有写下的那一行";
  const tag = input.grade.errorTag ?? "概念";
  const stuck = input.grade.stuckLabel ?? tag;
  return {
    sentences: [
      first,
      sentence(`结果还不对，可疑的一步是「${step}」，归在${tag}：${input.grade.reason}`),
      sentence(`下一步只抓「${stuck}」，先把这一处改对再计算`),
    ],
    parentSummary: `孩子今天练习了${topic}。结果不正确，主要问题是${tag}（${stuck}）。建议只提醒这一处，不要把完整解法直接讲出来。`,
  };
}

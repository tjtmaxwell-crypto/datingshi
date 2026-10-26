import { answerMatches, hasFragment, splitAnswerLines } from "@/lib/text";
import type { GradeResult, Problem } from "@/lib/types";

/**
 * 批改只判断对错、可疑步骤和错因。
 * 它不生成孙悟空的说法，那一层在 persona.ts。
 */
export function gradeAnswer(problem: Problem, answerText: string): GradeResult {
  const lines = splitAnswerLines(answerText);
  if (problem.accept.length === 0) {
    return {
      verdict: "unverified",
      correct: false,
      errorTag: null,
      reason: "这道题不在题库里，不能替你判断对错。可以先检查数字挪到另一边时有没有变号",
      stuckLabel: null,
      suspiciousStep: null,
      suspiciousIndex: null,
      thinSteps: false,
      lines: lines.map((text) => ({ text, suspicious: false })),
    };
  }

  if (!lines.length) {
    return {
      verdict: "wrong",
      correct: false,
      errorTag: "审题",
      reason: "答卷是空的，先读完题目，再写下第一步",
      stuckLabel: "还没动笔",
      suspiciousStep: null,
      suspiciousIndex: null,
      thinSteps: false,
      lines: [],
    };
  }

  if (answerMatches(answerText, problem.accept)) {
    return {
      verdict: "correct",
      correct: true,
      errorTag: null,
      reason: "结果和标准答案一致",
      stuckLabel: null,
      suspiciousStep: null,
      suspiciousIndex: null,
      thinSteps: lines.length < 2,
      lines: lines.map((text) => ({ text, suspicious: false })),
    };
  }

  for (const pattern of problem.errors) {
    const index = lines.findIndex((line) => pattern.any.some((token) => hasFragment(line, token)));
    const anywhere = pattern.any.some((token) => hasFragment(answerText, token));
    if (index >= 0 || anywhere) {
      const suspiciousIndex = index >= 0 ? index : lines.length - 1;
      return {
        verdict: "wrong",
        correct: false,
        errorTag: pattern.tag,
        reason: pattern.reason,
        stuckLabel: pattern.stuckLabel,
        suspiciousStep: lines[suspiciousIndex],
        suspiciousIndex,
        thinSteps: false,
        lines: lines.map((text, lineIndex) => ({ text, suspicious: lineIndex === suspiciousIndex })),
      };
    }
  }

  if (lines.length < 2) {
    return {
      verdict: "wrong",
      correct: false,
      errorTag: "跳步",
      reason: "几乎没有过程，中间步骤被跳过了",
      stuckLabel: "跳步",
      suspiciousStep: lines[0],
      suspiciousIndex: 0,
      thinSteps: false,
      lines: lines.map((text, lineIndex) => ({ text, suspicious: lineIndex === 0 })),
    };
  }

  const last = lines.length - 1;
  return {
    verdict: "wrong",
    correct: false,
    errorTag: "概念",
    reason: "结果对不上方程，回到上一步看看用的是哪一条等式性质",
    stuckLabel: "等式依据不稳",
    suspiciousStep: lines[last],
    suspiciousIndex: last,
    thinSteps: false,
    lines: lines.map((text, lineIndex) => ({ text, suspicious: lineIndex === last })),
  };
}

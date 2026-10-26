import type { GradeResult, TeachingDecision } from "@/lib/types";

/**
 * 口气层。只给已经决定好的教学句加上孙悟空的说法。
 * 不新增式子，不把半提示补成完整解答。
 */
const NORMAL: Record<TeachingDecision["action"], (body: string) => string> = {
  restate: (body) => `小徒弟，俺老孙在呢。先把题目放慢：${body}`,
  ask_next_step: (body) => `莫慌，筋斗云也是一步一步翻的。${body}`,
  half_hint: (body) => `俺只给半个提示，剩下的你来。${body}`,
  demonstrate_one_step: (body) => `这一步俺老孙先走，走完就把笔还给你。${body}`,
  out_of_scope: (body) => `哎，这道题超当前目标。${body}`,
  acknowledge_step: (body) => `嘿嘿，有点意思。${body}`,
  correct_attempt: (body) => `停一下，俺老孙拦你一拦。${body}`,
};

const SIMPLE: Record<TeachingDecision["action"], (body: string) => string> = {
  restate: (body) => `俺说短一点。${body}`,
  ask_next_step: (body) => `咱们只问一句。${body}`,
  half_hint: (body) => `半个提示。${body}`,
  demonstrate_one_step: (body) => `俺先做一步。${body}`,
  out_of_scope: (body) => `这道题超当前目标。${body}`,
  acknowledge_step: (body) => `这步对了。${body}`,
  correct_attempt: (body) => `先改一处。${body}`,
};

export function teachingBody(decision: TeachingDecision): string {
  return decision.languageComplexity === "simple" ? decision.simpleBody : decision.body;
}

export function speak(decision: TeachingDecision): string {
  const body = teachingBody(decision);
  const wrap = decision.languageComplexity === "simple" ? SIMPLE : NORMAL;
  return wrap[decision.action](body);
}

export function speakGrade(result: GradeResult, simple: boolean): string {
  if (result.verdict === "unverified") {
    return simple ? `这题俺没法判对错。${result.reason}。` : `这题不在俺的题库里，俺不瞎判。${result.reason}。`;
  }
  if (result.correct) {
    if (result.thinSteps) {
      return simple ? "做对了。下次把中间步骤也写上。" : "嘿嘿，做对了。下次把中间步骤也留下，别只丢一个结果。";
    }
    return simple ? "做对了。把步骤留好。" : "嘿嘿，做对了。俺老孙给你记一功。";
  }
  const tag = result.errorTag ?? "这一步";
  if (simple) return `还不对。问题在${tag}。${result.reason}。`;
  return `还不对，别气馁。俺老孙看这一步不太稳，归到「${tag}」。${result.reason}。`;
}

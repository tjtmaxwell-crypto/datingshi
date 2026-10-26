import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptsRephrase } from "../src/lib/providers/llm";
import { answerMatches, lineHasAnswer, normalize } from "../src/lib/text";
import { PROBLEMS } from "../src/lib/teaching/catalog";
import { advanceScaffold, decideChat, isConfusion } from "../src/lib/teaching/engine";
import { gradeAnswer } from "../src/lib/teaching/grader";
import { speak } from "../src/lib/teaching/persona";
import { isOutOfScope, targetTier } from "../src/lib/teaching/plan";
import { classifyPhotoText, pickEasier, pickSystemProblem } from "../src/lib/teaching/select";
import type { Problem, TeachingDecision } from "../src/lib/types";

const learner = { grade: 8 as const, scoreBand: "mid" as const, lastStuckPoint: "移项不变号" };

function numbers(text: string): string[] {
  return text.match(/\d+/g)?.slice().sort() ?? [];
}

function spokenDigitsMatch(decision: TeachingDecision) {
  const normal = speak(decision);
  const simple = speak({ ...decision, languageComplexity: "simple" });
  assert.deepEqual(numbers(normal), numbers(decision.body));
  assert.deepEqual(numbers(simple), numbers(decision.simpleBody));
  assert.equal(normal.includes(decision.body), true);
  assert.equal(simple.includes(decision.simpleBody), true);
}

function leaks(text: string, problem: Problem): boolean {
  return problem.accept.some((token) => lineHasAnswer(normalize(text), normalize(token)));
}

describe("难度", () => {
  it("按年级和分数段给出 A/B/C", () => {
    assert.equal(targetTier({ grade: 7, scoreBand: "low" }), "A");
    assert.equal(targetTier({ grade: 7, scoreBand: "high" }), "B");
    assert.equal(targetTier({ grade: 8, scoreBand: "mid" }), "B");
    assert.equal(targetTier({ grade: 9, scoreBand: "high" }), "C");
  });

  it("高于目标难度或高于年级算超当前目标", () => {
    assert.equal(isOutOfScope(learner, { grade: 8, tier: "C" }), true);
    assert.equal(isOutOfScope(learner, { grade: 7, tier: "B" }), false);
    assert.equal(isOutOfScope(learner, { grade: 9, tier: "A" }), true);
  });
});

describe("选题", () => {
  it("系统出题避开拍照示例，并贴着卡住的点", () => {
    const picked = pickSystemProblem(learner, PROBLEMS, "lin-both-b");
    assert.equal(picked.id, "lin-goal-b");
  });

  it("超当前目标时换成同主题里更合适的题", () => {
    const hard = PROBLEMS.find((problem) => problem.id === "lin-frac-c");
    assert.ok(hard);
    const resolution = classifyPhotoText(hard.stem, learner, PROBLEMS);
    assert.equal(resolution.outOfScope, true);
    assert.equal(resolution.easier?.topic, "一元一次方程");
    assert.equal(resolution.easier && isOutOfScope(learner, resolution.easier), false);
    const easier = pickEasier(learner, hard, PROBLEMS);
    assert.equal(easier?.topic, hard.topic);
  });

  it("二次式子不在当前目标里", () => {
    const resolution = classifyPhotoText("解方程：x² - 5x + 6 = 0", learner, PROBLEMS);
    assert.equal(resolution.kind, "beyond");
    assert.ok(resolution.easier);
  });
});

describe("苏格拉底提示", () => {
  it("四层推进，而且六次提示都不说出最终答案", () => {
    for (const problem of PROBLEMS) {
      let completedHints = 0;
      let revealedSteps = 0;
      const actions: string[] = [];
      for (let index = 0; index < 6; index += 1) {
        const result = advanceScaffold({
          problem,
          displayStem: problem.stem,
          completedHints,
          revealedSteps,
          languageComplexity: "normal",
          outOfScope: false,
          easierStem: null,
        });
        actions.push(result.decision.action);
        spokenDigitsMatch(result.decision);
        assert.equal(leaks(result.decision.body, problem), false);
        assert.equal(leaks(result.decision.simpleBody, problem), false);
        assert.equal(leaks(speak(result.decision), problem), false);
        const finalStep = problem.steps[problem.steps.length - 1];
        assert.equal(result.decision.body.includes(finalStep), false);
        assert.notEqual(result.decision.revealedStep, finalStep);
        completedHints = result.completedHints;
        revealedSteps = result.revealedSteps;
      }
      assert.deepEqual(actions.slice(0, 4), ["restate", "ask_next_step", "half_hint", "demonstrate_one_step"]);
      assert.equal(actions[4], "demonstrate_one_step");
    }
  });

  it("听不懂只把说法放慢，不改变教学动作和层数", () => {
    const problem = PROBLEMS[0];
    let completedHints = 0;
    let revealedSteps = 0;
    for (let index = 0; index < 3; index += 1) {
      const step = advanceScaffold({
        problem,
        displayStem: problem.stem,
        completedHints,
        revealedSteps,
        languageComplexity: "normal",
        outOfScope: false,
        easierStem: null,
      });
      completedHints = step.completedHints;
      revealedSteps = step.revealedSteps;
    }
    const confused = decideChat({
      problem,
      displayStem: problem.stem,
      completedHints,
      revealedSteps,
      languageComplexity: "normal",
      outOfScope: false,
      easierStem: null,
      utterance: "听不懂，下一步呢",
    });
    assert.equal(isConfusion("听不懂，下一步呢"), true);
    assert.equal(confused.decision.action, "half_hint");
    assert.equal(confused.completedHints, completedHints);
    assert.equal(confused.revealedSteps, revealedSteps);
    assert.equal(confused.languageComplexity, "simple");
    assert.equal(targetTier(learner), "B");
    assert.equal(leaks(speak(confused.decision), problem), false);
  });

  it("已经演示过一步时，听不懂只把这一步说得更短", () => {
    const problem = PROBLEMS.find((item) => item.id === "lin-both-b")!;
    let completedHints = 0;
    let revealedSteps = 0;
    for (let index = 0; index < 4; index += 1) {
      const step = advanceScaffold({
        problem,
        displayStem: problem.stem,
        completedHints,
        revealedSteps,
        languageComplexity: "normal",
        outOfScope: false,
        easierStem: null,
      });
      completedHints = step.completedHints;
      revealedSteps = step.revealedSteps;
    }
    const confused = decideChat({
      problem,
      displayStem: problem.stem,
      completedHints,
      revealedSteps,
      languageComplexity: "normal",
      outOfScope: false,
      easierStem: null,
      utterance: "听不懂",
    });
    assert.equal(confused.decision.action, "demonstrate_one_step");
    assert.equal(confused.revealedSteps, revealedSteps);
    assert.equal(confused.languageComplexity, "simple");
    assert.match(confused.decision.simpleBody, /5x - 2x = 9 \+ 3/);
    assert.equal(confused.decision.simpleBody.includes("3x = 12"), false);
  });

  it("超当前目标时直接说明，并给出更容易的题", () => {
    const hard = PROBLEMS.find((problem) => problem.id === "lin-frac-c")!;
    const result = advanceScaffold({
      problem: hard,
      displayStem: hard.stem,
      completedHints: 0,
      revealedSteps: 0,
      languageComplexity: "normal",
      outOfScope: true,
      easierStem: "解方程：2x + 6 = 14",
    });
    assert.equal(result.decision.action, "out_of_scope");
    assert.equal(result.completedHints, 0);
    assert.match(speak(result.decision), /超当前目标/);
    assert.match(result.decision.body, /2x \+ 6 = 14/);
    assert.equal(leaks(speak(result.decision), hard), false);
  });
});

describe("批改", () => {
  const move = PROBLEMS.find((problem) => problem.id === "lin-move-a")!;

  it("认出正确结果，也不会把 2x=4 当成 x=4", () => {
    assert.equal(gradeAnswer(move, "解得 x＝4").verdict, "correct");
    assert.equal(gradeAnswer(move, "2x = 4").verdict, "wrong");
    const worked = gradeAnswer(move, "2x = 14 - 6\n2x = 8\nx = 4");
    assert.equal(worked.verdict, "correct");
    assert.equal(worked.errorTag, null);
  });

  it("标出可疑步骤和错因", () => {
    const sign = gradeAnswer(move, "2x = 14 + 6\n2x = 20\nx = 10");
    assert.equal(sign.verdict, "wrong");
    assert.equal(sign.errorTag, "概念");
    assert.equal(sign.suspiciousIndex, 0);
    assert.equal(gradeAnswer(move, "x = 9").errorTag, "跳步");
    assert.equal(gradeAnswer(move, "   ").errorTag, "审题");
  });

  it("方程组要 x 和 y 都对", () => {
    const system = PROBLEMS.find((problem) => problem.id === "sys-add-b")!;
    assert.equal(gradeAnswer(system, "x = 6\ny = 4").verdict, "correct");
    assert.equal(gradeAnswer(system, "x = 6").verdict, "wrong");
  });

  it("题库外的式子不假装判对错", () => {
    const custom = { ...move, accept: [], answer: "" };
    assert.equal(gradeAnswer(custom, "x = 4").verdict, "unverified");
  });
});

describe("口气层守住式子", () => {
  it("模型如果多写一个式子就丢掉", () => {
    assert.equal(acceptsRephrase("先写成减 6。", "嘿嘿，所以 2x=8。", ["x=4"]), false);
    assert.equal(acceptsRephrase("只演示这一步：2x = 14 - 6。", "俺先走：2x=14-6。后面你来。", ["x=4"]), true);
    assert.equal(answerMatches("x = 6\ny = 4", ["x=6y=4"]), true);
  });
});

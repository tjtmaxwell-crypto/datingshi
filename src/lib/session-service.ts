import { BAND_LABEL, GRADE_LABEL, tierText } from "@/lib/labels";
import { getDb, getLearner, getSessionRow, listMessages, listProblems, type MessageRow, type SessionRow } from "@/lib/db";
import { HttpError } from "@/lib/route";
import { renderTutorLine } from "@/lib/providers/llm";
import { buildArchive } from "@/lib/teaching/archive";
import { GENERIC_LINEAR, PHOTO_SAMPLE_ID } from "@/lib/teaching/catalog";
import { advanceScaffold, decideChat, makeDecision, type ScaffoldState } from "@/lib/teaching/engine";
import { gradeAnswer } from "@/lib/teaching/grader";
import { speakGrade, teachingBody } from "@/lib/teaching/persona";
import { targetTier, todayGoal } from "@/lib/teaching/plan";
import { classifyPhotoText, pickSystemProblem } from "@/lib/teaching/select";
import type {
  BootstrapResponse,
  GradeResult,
  LanguageComplexity,
  Learner,
  LearnerView,
  LearningArchive,
  Problem,
  PublicHint,
  PublicMessage,
  PublicProblem,
  PublicSession,
  ScoreBand,
  SessionSource,
  SessionStatus,
  TeachingDecision,
  Tier,
} from "@/lib/types";

function now(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function presentLearner(learner: Learner): LearnerView {
  const tier = targetTier(learner);
  return {
    id: learner.id,
    name: learner.name,
    grade: learner.grade,
    scoreBand: learner.scoreBand,
    gradeLabel: GRADE_LABEL[learner.grade],
    bandLabel: BAND_LABEL[learner.scoreBand],
    lastStuckPoint: learner.lastStuckPoint,
    languageComplexity: learner.languageComplexity,
    tier,
    tierLabel: tierText(tier),
    todayGoal: todayGoal(learner.lastStuckPoint, tier),
  };
}

function toPublicProblem(problem: Problem | null): PublicProblem | null {
  if (!problem || problem.id === GENERIC_LINEAR.id) return null;
  return {
    id: problem.id,
    topic: problem.topic,
    grade: problem.grade,
    tier: problem.tier,
    focus: problem.focus,
    stem: problem.stem,
  };
}

export function resumePath(id: string, status: SessionStatus): string {
  if (status === "graded") return `/session/${id}/grade`;
  if (status === "chatting") return `/session/${id}/chat`;
  if (status === "wrapped") return `/session/${id}/wrap`;
  return `/session/${id}/answer`;
}

function workingProblem(row: SessionRow, problems: Problem[]): Problem {
  if (row.problem_id) {
    return problems.find((problem) => problem.id === row.problem_id) ?? { ...GENERIC_LINEAR, stem: row.recognized_text };
  }
  return { ...GENERIC_LINEAR, stem: row.recognized_text };
}

function easierProblem(row: SessionRow, problems: Problem[]): Problem | null {
  if (!row.easier_problem_id) return null;
  return problems.find((problem) => problem.id === row.easier_problem_id) ?? null;
}

function scaffoldFrom(row: SessionRow, learner: Learner, problems: Problem[]): ScaffoldState {
  return {
    problem: workingProblem(row, problems),
    displayStem: row.recognized_text,
    completedHints: row.hint_level,
    revealedSteps: row.revealed_steps,
    languageComplexity: learner.languageComplexity,
    outOfScope: row.out_of_scope === 1,
    easierStem: easierProblem(row, problems)?.stem ?? null,
  };
}

function presentMessage(row: MessageRow): PublicMessage {
  return {
    id: row.id,
    role: row.role === "learner" ? "learner" : "tutor",
    content: row.content,
    decision: parseJson(row.decision_json, null),
    createdAt: row.created_at,
  };
}

function presentSession(row: SessionRow, learner: Learner, problems: Problem[]): PublicSession {
  const problem = workingProblem(row, problems);
  const easier = easierProblem(row, problems);
  const status = row.status as SessionStatus;
  const grade = parseJson<GradeResult | null>(row.grade_json, null);
  return {
    id: row.id,
    source: row.source === "system" ? "system" : "photo",
    status,
    recognizedText: row.recognized_text,
    answerText: row.answer_text,
    topic: problem.id === GENERIC_LINEAR.id ? (row.out_of_scope ? "当前目标之外" : "一元一次方程") : problem.topic,
    tier: problem.id === GENERIC_LINEAR.id ? null : problem.tier,
    outOfScope: row.out_of_scope === 1,
    easierProblem: easier ? { id: easier.id, stem: easier.stem, topic: easier.topic } : null,
    hintLevel: row.hint_level,
    languageComplexity: learner.languageComplexity,
    problem: toPublicProblem(problem),
    hints: parseJson<PublicHint[]>(row.hint_log_json, []),
    grade: grade ? { ...grade, personaLine: speakGrade(grade, learner.languageComplexity === "simple") } : null,
    archive: parseJson<LearningArchive | null>(row.archive_json, null),
    messages: listMessages(row.id).map(presentMessage),
    resumePath: resumePath(row.id, status),
  };
}

function requireSession(id: string): { row: SessionRow; learner: Learner; problems: Problem[] } {
  const row = getSessionRow(id);
  if (!row) throw new HttpError(404, "找不到这道练习");
  return { row, learner: getLearner(), problems: listProblems() };
}

function touch(id: string, patch: Record<string, string | number | null>) {
  const keys = Object.keys(patch);
  const assignments = keys.map((key) => `${key} = @${key}`).join(", ");
  getDb()
    .prepare(`UPDATE sessions SET ${assignments}, updated_at = @updated_at WHERE id = @id`)
    .run({ ...patch, id, updated_at: now() });
}

function setStuck(learnerId: string, stuck: string) {
  getDb().prepare("UPDATE learners SET last_stuck_point = ? WHERE id = ?").run(stuck.slice(0, 40), learnerId);
}

async function persistTutorTurn(input: {
  row: SessionRow;
  learner: Learner;
  decision: TeachingDecision;
  forbidden: string[];
  completedHints: number;
  revealedSteps: number;
  language: LanguageComplexity;
  status?: SessionStatus;
  learnerText?: string;
}) {
  const spoken = await renderTutorLine(input.decision, input.forbidden);
  const stamp = now();
  const decision = {
    action: input.decision.action,
    actionLabel: input.decision.actionLabel,
    languageComplexity: input.decision.languageComplexity,
    neutral: teachingBody(input.decision),
    source: spoken.source,
  };
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO messages (id, session_id, role, content, decision_json, created_at)
     VALUES (@id, @session_id, @role, @content, @decision_json, @created_at)`,
  );
  const write = db.transaction(() => {
    if (input.learnerText) {
      insert.run({
        id: crypto.randomUUID(),
        session_id: input.row.id,
        role: "learner",
        content: input.learnerText,
        decision_json: null,
        created_at: stamp,
      });
    }
    insert.run({
      id: crypto.randomUUID(),
      session_id: input.row.id,
      role: "tutor",
      content: spoken.text,
      decision_json: JSON.stringify(decision),
      created_at: stamp,
    });
    db.prepare(
      `UPDATE sessions
       SET hint_level = ?, revealed_steps = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(input.completedHints, input.revealedSteps, input.status ?? input.row.status, stamp, input.row.id);
    if (input.language !== input.learner.languageComplexity) {
      db.prepare("UPDATE learners SET language_complexity = ? WHERE id = ?").run(input.language, input.learner.id);
    }
  });
  write();
}

export function getBootstrap(): BootstrapResponse {
  const learner = getLearner();
  const latest = getDb()
    .prepare(
      `SELECT id, status, recognized_text AS stem
       FROM sessions
       WHERE learner_id = ? AND status != 'wrapped'
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .get(learner.id) as { id: string; status: SessionStatus; stem: string } | undefined;
  return {
    learner: presentLearner(learner),
    latest: latest ? { ...latest, resumePath: resumePath(latest.id, latest.status) } : null,
    bankCount: listProblems().length,
    providers: {
      ocr: process.env.OCR_API_URL?.trim() ? "remote" : "stub",
      llm: process.env.OPENAI_API_KEY?.trim() ? "model" : "template",
    },
  };
}

export function updateLearner(patch: { grade?: number; scoreBand?: string; lastStuckPoint?: string; languageComplexity?: string }): LearnerView {
  const learner = getLearner();
  const grade = patch.grade === 7 || patch.grade === 8 || patch.grade === 9 ? patch.grade : learner.grade;
  const scoreBand: ScoreBand = patch.scoreBand === "low" || patch.scoreBand === "mid" || patch.scoreBand === "high" ? patch.scoreBand : learner.scoreBand;
  const language: LanguageComplexity = patch.languageComplexity === "simple" || patch.languageComplexity === "normal" ? patch.languageComplexity : learner.languageComplexity;
  const lastStuckPoint = patch.lastStuckPoint === undefined ? learner.lastStuckPoint : patch.lastStuckPoint.trim().slice(0, 40);
  getDb()
    .prepare("UPDATE learners SET grade = ?, score_band = ?, last_stuck_point = ?, language_complexity = ? WHERE id = ?")
    .run(grade, scoreBand, lastStuckPoint, language, learner.id);
  return presentLearner(getLearner());
}

export function createSession(input: { source?: string; recognizedText?: string }): PublicSession {
  const learner = getLearner();
  const problems = listProblems();
  const source: SessionSource = input.source === "system" ? "system" : "photo";
  let problemId: string | null = null;
  let easierId: string | null = null;
  let outOfScope = 0;
  let text = "";

  if (source === "system") {
    const problem = pickSystemProblem(learner, problems, PHOTO_SAMPLE_ID);
    problemId = problem.id;
    text = problem.stem;
  } else {
    text = (input.recognizedText ?? "").trim().slice(0, 2000);
    if (!text) throw new HttpError(400, "还没有题目文字");
    const resolution = classifyPhotoText(text, learner, problems);
    problemId = resolution.problem?.id ?? null;
    easierId = resolution.easier?.id ?? null;
    outOfScope = resolution.outOfScope ? 1 : 0;
  }

  const id = crypto.randomUUID();
  const stamp = now();
  getDb()
    .prepare(
      `INSERT INTO sessions (
        id, learner_id, problem_id, source, status, recognized_text, answer_text,
        out_of_scope, easier_problem_id, hint_level, revealed_steps, hint_log_json,
        grade_json, archive_json, created_at, updated_at
      ) VALUES (
        @id, @learner_id, @problem_id, @source, 'answering', @recognized_text, '',
        @out_of_scope, @easier_problem_id, 0, 0, '[]',
        NULL, NULL, @created_at, @updated_at
      )`,
    )
    .run({
      id,
      learner_id: learner.id,
      problem_id: problemId,
      source,
      recognized_text: text,
      out_of_scope: outOfScope,
      easier_problem_id: easierId,
      created_at: stamp,
      updated_at: stamp,
    });
  return presentSession(getSessionRow(id)!, learner, problems);
}

export function readSession(id: string): PublicSession {
  const { row, learner, problems } = requireSession(id);
  return presentSession(row, learner, problems);
}

export function saveDraft(id: string, answerText: string) {
  requireSession(id);
  touch(id, { answer_text: answerText.slice(0, 4000) });
  return readSession(id);
}

export async function giveHint(id: string, answerText?: string): Promise<PublicSession> {
  const { learner, problems } = requireSession(id);
  if (answerText !== undefined) touch(id, { answer_text: answerText.slice(0, 4000) });
  const fresh = getSessionRow(id)!;
  const state = scaffoldFrom(fresh, learner, problems);
  const advanced = advanceScaffold(state);
  const spoken = await renderTutorLine(advanced.decision, state.problem.accept);
  const hints = parseJson<PublicHint[]>(fresh.hint_log_json, []);
  hints.push({
    content: spoken.text,
    neutral: teachingBody(advanced.decision),
    action: advanced.decision.action,
    actionLabel: advanced.decision.actionLabel,
    languageComplexity: advanced.decision.languageComplexity,
    source: spoken.source,
  });
  touch(id, {
    hint_level: advanced.completedHints,
    revealed_steps: advanced.revealedSteps,
    hint_log_json: JSON.stringify(hints),
  });
  return readSession(id);
}

export function gradeSession(id: string, answerText: string): PublicSession {
  const { row, learner, problems } = requireSession(id);
  const text = answerText.slice(0, 4000);
  const problem = workingProblem(row, problems);
  const grade = gradeAnswer(problem, text);
  if (grade.verdict === "wrong" && grade.stuckLabel) setStuck(learner.id, grade.stuckLabel);
  touch(id, {
    answer_text: text,
    grade_json: JSON.stringify(grade),
    archive_json: null,
    status: "graded",
  });
  return readSession(id);
}

export async function chatSession(id: string, input: { text?: string; opener?: boolean }): Promise<PublicSession> {
  const { row, learner, problems } = requireSession(id);
  if (input.opener) {
    if (listMessages(id).some((message) => message.role === "tutor")) return presentSession(row, learner, problems);
    const state = scaffoldFrom(row, learner, problems);
    let decision: TeachingDecision;
    let completed = row.hint_level;
    if (state.outOfScope) {
      decision = makeDecision("out_of_scope", state);
    } else if (row.hint_level === 0) {
      decision = makeDecision("restate", state);
      completed = 1;
    } else {
      decision = makeDecision("acknowledge_step", state, {
        body: "答题时的提示还算数。你可以说说卡在哪。",
        simpleBody: "提示还在。你可以说哪里不懂。",
      });
    }
    const spoken = await renderTutorLine(decision, state.problem.accept);
    const db = getDb();
    const commit = db.transaction(() => {
      const count = db.prepare("SELECT COUNT(*) AS c FROM messages WHERE session_id = ? AND role = 'tutor'").get(id) as { c: number };
      if (count.c > 0) return;
      const stamp = now();
      db.prepare(
        `INSERT INTO messages (id, session_id, role, content, decision_json, created_at)
         VALUES (?, ?, 'tutor', ?, ?, ?)`,
      ).run(
        crypto.randomUUID(),
        id,
        spoken.text,
        JSON.stringify({
          action: decision.action,
          actionLabel: decision.actionLabel,
          languageComplexity: decision.languageComplexity,
          neutral: teachingBody(decision),
          source: spoken.source,
        }),
        stamp,
      );
      db.prepare("UPDATE sessions SET hint_level = ?, status = ?, updated_at = ? WHERE id = ?").run(
        completed,
        row.status === "wrapped" ? "wrapped" : "chatting",
        stamp,
        id,
      );
    });
    commit.immediate();
    return readSession(id);
  }

  const text = (input.text ?? "").trim().slice(0, 1000);
  if (!text) throw new HttpError(400, "先写一句再发给师父");
  const state = scaffoldFrom(row, learner, problems);
  const result = decideChat({ ...state, utterance: text });
  await persistTutorTurn({
    row,
    learner,
    decision: result.decision,
    forbidden: state.problem.accept,
    completedHints: result.completedHints,
    revealedSteps: result.revealedSteps,
    language: result.languageComplexity,
    status: row.status === "wrapped" ? "wrapped" : "chatting",
    learnerText: text,
  });
  return readSession(id);
}

export function wrapSession(id: string): PublicSession {
  const { row, learner, problems } = requireSession(id);
  if (row.archive_json) {
    if (row.status !== "wrapped") touch(id, { status: "wrapped" });
    return readSession(id);
  }
  const problem = workingProblem(row, problems);
  const tier: Tier = problem.id === GENERIC_LINEAR.id ? targetTier(learner) : problem.tier;
  const archive = buildArchive({
    problem,
    displayStem: row.recognized_text,
    tier,
    grade: parseJson<GradeResult | null>(row.grade_json, null),
  });
  touch(id, { archive_json: JSON.stringify(archive), status: "wrapped" });
  return readSession(id);
}

export function switchEasier(id: string): PublicSession {
  const { row, problems } = requireSession(id);
  const easier = easierProblem(row, problems);
  if (!easier) throw new HttpError(400, "没有可换的同类题");
  const db = getDb();
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM messages WHERE session_id = ?").run(id);
    db.prepare(
      `UPDATE sessions SET
        problem_id = ?, recognized_text = ?, out_of_scope = 0, easier_problem_id = NULL,
        hint_level = 0, revealed_steps = 0, hint_log_json = '[]', answer_text = '',
        grade_json = NULL, archive_json = NULL, status = 'answering', updated_at = ?
       WHERE id = ?`,
    ).run(easier.id, easier.stem, now(), id);
  });
  apply();
  return readSession(id);
}

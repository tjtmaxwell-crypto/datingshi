import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DEFAULT_LEARNER, PROBLEMS, SEED_VERSION } from "@/lib/teaching/catalog";
import type { GradeLevel, LanguageComplexity, Learner, Problem, ScoreBand } from "@/lib/types";

/**
 * 本地开发用 SQLite（better-sqlite3）。
 * 第一次访问时建表并写入种子题。删掉 data/tutor.db 可以重置。
 */

const globalForDb = globalThis as unknown as { __tutorDb?: Database.Database };

export interface SessionRow {
  id: string;
  learner_id: string;
  problem_id: string | null;
  source: string;
  status: string;
  recognized_text: string;
  answer_text: string;
  out_of_scope: number;
  easier_problem_id: string | null;
  hint_level: number;
  revealed_steps: number;
  hint_log_json: string;
  grade_json: string | null;
  archive_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  decision_json: string | null;
  created_at: string;
}

function databasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  return configured ? path.resolve(process.cwd(), configured) : path.join(process.cwd(), "data", "tutor.db");
}

export function getDb(): Database.Database {
  if (!globalForDb.__tutorDb) {
    const file = databasePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 3000");
    migrate(db);
    seed(db);
    globalForDb.__tutorDb = db;
  }
  return globalForDb.__tutorDb;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL,
      score_band TEXT NOT NULL,
      last_stuck_point TEXT NOT NULL DEFAULT '',
      language_complexity TEXT NOT NULL DEFAULT 'normal',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      grade INTEGER NOT NULL,
      tier TEXT NOT NULL,
      stem TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL,
      problem_id TEXT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      recognized_text TEXT NOT NULL,
      answer_text TEXT NOT NULL DEFAULT '',
      out_of_scope INTEGER NOT NULL DEFAULT 0,
      easier_problem_id TEXT,
      hint_level INTEGER NOT NULL DEFAULT 0,
      revealed_steps INTEGER NOT NULL DEFAULT 0,
      hint_log_json TEXT NOT NULL DEFAULT '[]',
      grade_json TEXT,
      archive_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      decision_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_learner ON sessions (learner_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages (session_id, created_at);
  `);
}

function seed(db: Database.Database) {
  const current = db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get() as { value: string } | undefined;
  if (current?.value !== SEED_VERSION) {
    const insert = db.prepare(
      "INSERT INTO problems (id, topic, grade, tier, stem, payload_json) VALUES (@id, @topic, @grade, @tier, @stem, @payload_json)",
    );
    const replaceProblems = db.transaction(() => {
      db.prepare("DELETE FROM problems").run();
      for (const problem of PROBLEMS) {
        insert.run({
          id: problem.id,
          topic: problem.topic,
          grade: problem.grade,
          tier: problem.tier,
          stem: problem.stem,
          payload_json: JSON.stringify(problem),
        });
      }
      db.prepare(
        `INSERT INTO meta (key, value) VALUES ('seed_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ).run(SEED_VERSION);
    });
    replaceProblems();
  }
  const learner = db.prepare("SELECT id FROM learners LIMIT 1").get();
  if (!learner) {
    db.prepare(
      `INSERT INTO learners (id, name, grade, score_band, last_stuck_point, language_complexity, created_at)
       VALUES (@id, @name, @grade, @scoreBand, @lastStuckPoint, @languageComplexity, @createdAt)`,
    ).run({ ...DEFAULT_LEARNER, createdAt: new Date().toISOString() });
  }
}

function asGrade(value: number): GradeLevel {
  if (value === 7 || value === 8 || value === 9) return value;
  return 8;
}

function asBand(value: string): ScoreBand {
  if (value === "low" || value === "mid" || value === "high") return value;
  return "mid";
}

function asLanguage(value: string): LanguageComplexity {
  return value === "simple" ? "simple" : "normal";
}

export function getLearner(): Learner {
  const row = getDb().prepare("SELECT * FROM learners ORDER BY created_at ASC LIMIT 1").get() as {
    id: string;
    name: string;
    grade: number;
    score_band: string;
    last_stuck_point: string;
    language_complexity: string;
    created_at: string;
  };
  return {
    id: row.id,
    name: row.name,
    grade: asGrade(row.grade),
    scoreBand: asBand(row.score_band),
    lastStuckPoint: row.last_stuck_point,
    languageComplexity: asLanguage(row.language_complexity),
    createdAt: row.created_at,
  };
}

export function listProblems(): Problem[] {
  const rows = getDb().prepare("SELECT payload_json FROM problems ORDER BY grade ASC, tier ASC, id ASC").all() as Array<{
    payload_json: string;
  }>;
  return rows.map((row) => JSON.parse(row.payload_json) as Problem);
}

export function getSessionRow(id: string): SessionRow | null {
  return (getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined) ?? null;
}

export function listMessages(sessionId: string): MessageRow[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC")
    .all(sessionId) as MessageRow[];
}

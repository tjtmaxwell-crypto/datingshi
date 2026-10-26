"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BAND_LABEL, GRADE_LABEL, tierText } from "@/lib/labels";
import { targetTier, todayGoal } from "@/lib/teaching/plan";
import type { BootstrapResponse, GradeLevel, LearnerView, ScoreBand } from "@/lib/types";
import { Card, ErrorNote, Frame, Loading, PrimaryButton, TopBar } from "@/components/ui";

export function ProfileScreen() {
  const [learner, setLearner] = useState<LearnerView | null>(null);
  const [grade, setGrade] = useState<GradeLevel>(8);
  const [band, setBand] = useState<ScoreBand>("mid");
  const [stuck, setStuck] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<BootstrapResponse>("/api/bootstrap")
      .then((data) => {
        setLearner(data.learner);
        setGrade(data.learner.grade);
        setBand(data.learner.scoreBand);
        setStuck(data.learner.lastStuckPoint);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const previewTier = targetTier({ grade, scoreBand: band });

  async function save(language?: "normal" | "simple") {
    setPending(true);
    setSaved("");
    setError("");
    try {
      const next = await api<LearnerView>("/api/learner", {
        method: "PATCH",
        body: JSON.stringify({
          grade,
          scoreBand: band,
          lastStuckPoint: stuck,
          ...(language ? { languageComplexity: language } : {}),
        }),
      });
      setLearner(next);
      setSaved("已保存");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "没有保存");
    } finally {
      setPending(false);
    }
  }

  if (!learner && !error) return <Loading label="学情翻开中…" />;

  return (
    <Frame>
      <TopBar
        action={
          <Link href="/" className="text-sm font-semibold text-[#8A5A32]">
            回课堂
          </Link>
        }
      />
      <h1 className="mb-3 text-2xl font-semibold">学情</h1>
      {error ? <ErrorNote message={error} /> : null}
      {learner ? (
        <Card>
          <label className="block text-sm font-medium" htmlFor="grade">
            年级
          </label>
          <select id="grade" value={grade} onChange={(event) => setGrade(Number(event.target.value) as GradeLevel)} className="mt-2 h-12 w-full rounded-2xl border border-[#ead9c0] bg-[#fffdf8] px-3">
            {([7, 8, 9] as GradeLevel[]).map((item) => (
              <option key={item} value={item}>
                {GRADE_LABEL[item]}
              </option>
            ))}
          </select>
          <label className="mt-4 block text-sm font-medium" htmlFor="band">
            分数段
          </label>
          <select id="band" value={band} onChange={(event) => setBand(event.target.value as ScoreBand)} className="mt-2 h-12 w-full rounded-2xl border border-[#ead9c0] bg-[#fffdf8] px-3">
            {(Object.keys(BAND_LABEL) as ScoreBand[]).map((item) => (
              <option key={item} value={item}>
                {BAND_LABEL[item]}
                {item === "low" ? "（大约 60 分以下）" : item === "mid" ? "（大约 60–80）" : "（大约 80 分以上）"}
              </option>
            ))}
          </select>
          <label className="mt-4 block text-sm font-medium" htmlFor="stuck">
            上次卡住
          </label>
          <input id="stuck" value={stuck} onChange={(event) => setStuck(event.target.value)} maxLength={40} className="mt-2 h-12 w-full rounded-2xl border border-[#ead9c0] bg-[#fffdf8] px-3" />
          <p className="mt-4 text-sm text-[#8A5A32]">当前目标难度 {tierText(previewTier)}</p>
          <p className="mt-1 text-sm leading-6">今日小目标：{todayGoal(stuck, previewTier)}</p>
          <p className="mt-3 text-sm">讲法：{learner.languageComplexity === "simple" ? "放慢。这只改说法，不改难度。" : "普通。"}</p>
          {learner.languageComplexity === "simple" ? (
            <button type="button" onClick={() => save("normal")} className="mt-2 text-sm font-semibold text-[#D3542C]">
              恢复普通讲法
            </button>
          ) : null}
          <PrimaryButton className="mt-4 w-full" onClick={() => save()} disabled={pending}>
            {pending ? "保存中…" : "保存学情"}
          </PrimaryButton>
          {saved ? <p className="mt-2 text-sm text-[#1F7A4D]">{saved}</p> : null}
        </Card>
      ) : null}
    </Frame>
  );
}

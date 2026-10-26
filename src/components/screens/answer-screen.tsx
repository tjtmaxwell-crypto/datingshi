"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PublicSession } from "@/lib/types";
import { tierText } from "@/lib/labels";
import { Card, DecisionChip, ErrorNote, Frame, Loading, PrimaryButton, SecondaryButton, StepRail, TopBar } from "@/components/ui";
import { ScratchPad } from "@/components/scratch-pad";
import { MonkeyKing } from "@/components/monkey";

export function AnswerScreen() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [hinting, setHinting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<PublicSession>(`/api/sessions/${id}`)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        setAnswerText(data.answerText);
        setReady(true);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!ready || !id) return;
    const handle = window.setTimeout(() => {
      void api(`/api/sessions/${id}/draft`, { method: "POST", body: JSON.stringify({ answerText }) }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [answerText, id, ready]);

  async function hint() {
    if (!id) return;
    setHinting(true);
    setError("");
    try {
      const data = await api<PublicSession>(`/api/sessions/${id}/hint`, {
        method: "POST",
        body: JSON.stringify({ answerText }),
      });
      setSession(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提示没有拿到");
    } finally {
      setHinting(false);
    }
  }

  async function submit() {
    if (!id) return;
    setGrading(true);
    setError("");
    try {
      await api<PublicSession>(`/api/sessions/${id}/grade`, {
        method: "POST",
        body: JSON.stringify({ answerText }),
      });
      router.push(`/session/${id}/grade`);
    } catch (reason) {
      setGrading(false);
      setError(reason instanceof Error ? reason.message : "批改没有完成");
    }
  }

  async function switchProblem() {
    if (!id) return;
    setSwitching(true);
    setError("");
    try {
      const data = await api<PublicSession>(`/api/sessions/${id}/switch`, { method: "POST", body: "{}" });
      setSession(data);
      setAnswerText("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "没有换成更容易的题");
    } finally {
      setSwitching(false);
    }
  }

  if (error && !session) {
    return (
      <Frame>
        <ErrorNote message={error} />
      </Frame>
    );
  }
  if (!session) return <Loading label="题目翻开中…" />;

  const latest = session.hints[session.hints.length - 1];

  return (
    <Frame>
      <TopBar />
      <StepRail current={1} />
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-[#ead9c0] bg-[#f6efe3]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-xs text-[#8A5A32]">
          {session.topic}
          {session.tier ? ` · 难度 ${tierText(session.tier)}` : ""}
        </p>
        <h1 className="mt-1 text-lg font-semibold leading-snug">{session.recognizedText}</h1>
      </div>
      {session.outOfScope ? (
        <Card className="mb-4 border-[#E7B089] bg-[#fff6ee]">
          <p className="font-semibold">这道题超当前目标</p>
          <p className="mt-1 text-sm leading-6 text-[#6d5644]">先别硬做。可以换成同主题、但在今天目标里的一题。</p>
          {session.easierProblem ? <p className="mt-2 text-sm">可换：{session.easierProblem.stem}</p> : null}
          {session.easierProblem ? (
            <PrimaryButton className="mt-3 w-full" onClick={switchProblem} disabled={switching}>
              {switching ? "正在换题…" : "换一道更容易的同类题"}
            </PrimaryButton>
          ) : null}
        </Card>
      ) : null}
      <Card>
        <label htmlFor="answer" className="text-sm font-medium">
          写下步骤和结果
        </label>
        <textarea
          id="answer"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          rows={6}
          placeholder={"一步一行。先写怎么挪项，再写结果。"}
          className="mt-2 w-full resize-none rounded-2xl border border-[#ead9c0] bg-[#fffdf8] px-3 py-3 leading-7 outline-none"
        />
        <div className="mt-4">
          <ScratchPad />
        </div>
      </Card>
      {latest ? (
        <Card className="mt-4">
          <div className="flex gap-3">
            <MonkeyKing className="h-12 w-12 shrink-0" mood="think" />
            <div>
              <DecisionChip label={latest.actionLabel} simple={latest.languageComplexity === "simple"} />
              <p className="mt-1 leading-7">{latest.content}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#8A6A52]">提示不会直接给出最终答案。口气只负责怎么说。</p>
        </Card>
      ) : null}
      {error ? (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      ) : null}
      <div className="mt-4 grid gap-3">
        <SecondaryButton onClick={hint} disabled={hinting || grading}>
          {hinting ? "师父在想…" : "我想提示"}
        </SecondaryButton>
        <PrimaryButton onClick={submit} disabled={grading || hinting}>
          {grading ? "正在批改…" : "交卷"}
        </PrimaryButton>
      </div>
    </Frame>
  );
}

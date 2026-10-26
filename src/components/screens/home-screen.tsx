"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { BootstrapResponse, PublicSession } from "@/lib/types";
import { Card, ErrorNote, Frame, Loading, TopBar } from "@/components/ui";
import { MonkeyKing } from "@/components/monkey";

const greeting = "小徒弟，俺老孙在呢。今天咱们只攻一个小目标。";

export function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"resume" | "system" | null>(null);

  function load() {
    setError("");
    api<BootstrapResponse>("/api/bootstrap")
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    let cancelled = false;
    api<BootstrapResponse>("/api/bootstrap")
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function resume() {
    if (!data?.latest) {
      setNote("还没有未完成的练习。先拍照，或让系统出一道。");
      return;
    }
    setPending("resume");
    router.push(data.latest.resumePath);
  }

  async function startSystem() {
    setPending("system");
    setNote("");
    try {
      const session = await api<PublicSession>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ source: "system" }),
      });
      router.push(`/session/${session.id}/answer`);
    } catch (reason) {
      setPending(null);
      setError(reason instanceof Error ? reason.message : "出题没有成功");
    }
  }

  if (!data && !error) return <Loading label="课堂正在开门…" />;

  return (
    <Frame>
      <TopBar
        action={
          <Link href="/profile" className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#8A5A32]">
            学情
          </Link>
        }
      />
      {error ? <ErrorNote message={error} onRetry={load} /> : null}
      {data ? (
        <>
          <Card className="mb-3">
            <div className="flex items-center gap-3">
              <MonkeyKing className="h-24 w-24 shrink-0" mood="hello" />
              <div>
                <p className="text-sm text-[#8A5A32]">
                  {data.learner.gradeLabel} · {data.learner.bandLabel} · 难度 {data.learner.tierLabel}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug">{greeting}</p>
              </div>
            </div>
          </Card>
          <Card className="mb-4">
            <p className="text-sm font-medium text-[#8A5A32]">今日小目标</p>
            <p className="mt-1 text-lg leading-snug">{data.learner.todayGoal}</p>
          </Card>
          <div className="grid gap-3">
            <Link href="/photo" className="flex items-center justify-between rounded-3xl border border-[#ead9c0] bg-white px-4 py-4 shadow-sm">
              <span>
                <span className="block text-lg font-semibold">拍照做题</span>
                <span className="mt-1 block text-sm text-[#7C624C]">先核对识别出来的题目</span>
              </span>
              <span aria-hidden className="text-xl text-[#D3542C]">
                →
              </span>
            </Link>
            <button type="button" onClick={resume} disabled={pending !== null} className="flex items-center justify-between rounded-3xl border border-[#ead9c0] bg-white px-4 py-4 text-left shadow-sm disabled:opacity-60">
              <span>
                <span className="block text-lg font-semibold">继续上次</span>
                <span className="mt-1 block text-sm text-[#7C624C]">{data.latest ? data.latest.stem : "还没有未完成的练习"}</span>
              </span>
              <span aria-hidden className="text-xl text-[#D3542C]">
                →
              </span>
            </button>
            <button type="button" onClick={startSystem} disabled={pending !== null} className="flex items-center justify-between rounded-3xl bg-[#D3542C] px-4 py-4 text-left text-white shadow-[0_10px_20px_rgba(211,84,44,0.2)] disabled:opacity-60">
              <span>
                <span className="block text-lg font-semibold">系统出题</span>
                <span className="mt-1 block text-sm text-white/85">按年级和分数段出一道</span>
              </span>
              <span aria-hidden className="text-xl">
                →
              </span>
            </button>
          </div>
          {note ? <p className="mt-3 text-sm text-[#8A5A32]">{note}</p> : null}
          <p className="mt-5 text-sm text-[#6d5644]">上次卡住：{data.learner.lastStuckPoint || "还没有记录"}</p>
          <p className="mt-2 text-xs leading-5 text-[#8A6A52]">
            题库 {data.bankCount} 道，离线就能走完。识别和讲话都有桩；教学决定在服务器上，孙悟空只负责口气。
            {data.providers.ocr === "remote" ? " OCR 已配置。" : ""}
            {data.providers.llm === "model" ? " 大模型已配置。" : ""}
          </p>
          </>
      ) : null}
    </Frame>
  );
}

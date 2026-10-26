"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { PublicSession } from "@/lib/types";
import { Card, ErrorNote, Frame, Loading, StepRail, TopBar } from "@/components/ui";
import { MonkeyKing } from "@/components/monkey";

export function WrapScreen() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [session, setSession] = useState<PublicSession | null>(null);
  const [error, setError] = useState("");
  const [parent, setParent] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<PublicSession>(`/api/sessions/${id}/wrap`, { method: "POST", body: "{}" })
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error && !session) {
    return (
      <Frame>
        <ErrorNote message={error} />
      </Frame>
    );
  }
  if (!session?.archive) return <Loading label="档案正在合上…" />;

  const archive = session.archive;

  return (
    <Frame>
      <TopBar />
      <StepRail current={4} />
      <Card>
        <div className="flex items-center gap-3">
          <MonkeyKing className="h-16 w-16" mood="cheer" />
          <div>
            <p className="text-sm text-[#8A5A32]">今日学习档案</p>
            <h1 className="text-2xl font-semibold">三句话记下</h1>
          </div>
        </div>
        <ol className="mt-4 grid gap-3">
          {archive.sentences.map((sentence, index) => (
            <li key={sentence} className="rounded-2xl bg-[#fff8ef] px-3 py-3 leading-7">
              <span className="mr-2 text-sm font-semibold text-[#D3542C]">{index + 1}</span>
              {sentence}
            </li>
          ))}
        </ol>
      </Card>
      <button type="button" onClick={() => setParent((value) => !value)} className="mt-4 text-sm font-semibold text-[#8A5A32]">
        {parent ? "收起给家长的说法" : "看看给家长的说法"}
      </button>
      {parent ? (
        <Card className="mt-3">
          <p className="text-sm font-medium text-[#8A5A32]">给家长</p>
          <p className="mt-2 leading-7">{archive.parentSummary}</p>
        </Card>
      ) : null}
      <Link href="/" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#D3542C] text-base font-semibold text-white">
        回课堂
      </Link>
    </Frame>
  );
}

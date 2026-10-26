"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ErrorTag, PublicSession } from "@/lib/types";
import { Card, ErrorNote, Frame, Loading, PrimaryButton, SecondaryButton, StepRail, TopBar } from "@/components/ui";
import { MonkeyKing } from "@/components/monkey";

const TAG_STYLE: Record<ErrorTag, string> = {
  概念: "bg-[#F8E7C6] text-[#8A5A12]",
  运算: "bg-[#D9EAF2] text-[#1F5670]",
  审题: "bg-[#E7E0F4] text-[#533E78]",
  跳步: "bg-[#F8D9D2] text-[#8C3426]",
};

export function GradeScreen() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<PublicSession>(`/api/sessions/${id}`)
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
  if (!session) return <Loading label="批改本翻开中…" />;

  const grade = session.grade;
  if (!grade) {
    return (
      <Frame>
        <TopBar />
        <Card>
          <p>这道题还没有交卷。</p>
          <Link href={`/session/${id}/answer`} className="mt-3 inline-block font-semibold text-[#D3542C]">
            回去作答
          </Link>
        </Card>
      </Frame>
    );
  }

  const headline = grade.verdict === "correct" ? "对了" : grade.verdict === "unverified" ? "先不判对错" : "还不对";

  return (
    <Frame>
      <TopBar />
      <StepRail current={2} />
      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <MonkeyKing className="h-14 w-14 shrink-0" mood={grade.correct ? "cheer" : "oops"} />
            <p className="pt-1 leading-7">{grade.personaLine}</p>
          </div>
          <p className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${grade.correct ? "bg-[#E5F3EA] text-[#1F7A4D]" : "bg-[#FDE8DC] text-[#D3542C]"}`}>{headline}</p>
        </div>
      </Card>
      <Card>
        <p className="text-sm text-[#8A5A32]">题目</p>
        <p className="mt-1 font-medium leading-7">{session.recognizedText}</p>
        {grade.lines.length ? (
          <ol className="mt-4 grid gap-2">
            {grade.lines.map((line, index) => (
              <li key={`${line.text}-${index}`} className={`rounded-2xl border px-3 py-3 ${line.suspicious ? "border-[#E7B089] bg-[#FDE8DC]" : "border-[#ead9c0] bg-[#fffdf8]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#8A6A52]">第 {index + 1} 行</span>
                  {line.suspicious && grade.errorTag ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_STYLE[grade.errorTag]}`}>{grade.errorTag}</span> : null}
                </div>
                <p className="mt-1 leading-7">{line.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-2xl bg-[#FDE8DC] px-3 py-3 text-sm">没有写下步骤。</p>
        )}
        <p className="mt-4 text-sm leading-6 text-[#6d5644]">
          {grade.verdict === "correct" ? "批改说明" : grade.verdict === "unverified" ? "说明" : "错因说明"}：{grade.reason}
        </p>
      </Card>
      <div className="mt-4 grid gap-3">
        <PrimaryButton onClick={() => router.push(`/session/${id}/chat`)}>找师父聊聊</PrimaryButton>
        <SecondaryButton onClick={() => router.push(`/session/${id}/wrap`)}>看学习档案</SecondaryButton>
        <Link href={`/session/${id}/answer`} className="text-center text-sm font-semibold text-[#8A5A32]">
          返回改答案
        </Link>
      </div>
    </Frame>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PublicSession } from "@/lib/types";
import { Card, ErrorNote, Frame, Loading, PrimaryButton, SecondaryButton, StepRail, TopBar } from "@/components/ui";
import { WorksheetPlaceholder } from "@/components/worksheet";

interface OcrPayload {
  text: string;
  source: "stub" | "remote";
  note: string;
}

export function PhotoScreen() {
  const router = useRouter();
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [recognizing, setRecognizing] = useState(false);
  const [pending, setPending] = useState(false);

  async function recognize(mode: "default" | "beyond") {
    setError("");
    setRecognizing(true);
    try {
      const result = await api<OcrPayload>("/api/ocr", { method: "POST", body: JSON.stringify({ mode }) });
      setText(result.text);
      setNote(result.note);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "识别没有成功");
    } finally {
      setRecognizing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api<OcrPayload>("/api/ocr", { method: "POST", body: JSON.stringify({ mode: "default" }) })
      .then((result) => {
        if (cancelled) return;
        setText(result.text);
        setNote(result.note);
        setLoading(false);
      })
      .catch((reason: Error) => {
        if (cancelled) return;
        setError(reason.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm() {
    if (!text.trim() || pending) return;
    setPending(true);
    setError("");
    try {
      const session = await api<PublicSession>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ source: "photo", recognizedText: text }),
      });
      router.push(`/session/${session.id}/answer`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "没有进入作答");
    } finally {
      setPending(false);
    }
  }

  function edit() {
    setEditing(true);
    area.current?.focus();
    area.current?.select();
  }

  if (loading && !text) return <Loading label="正在看这张作业…" />;

  return (
    <Frame>
      <TopBar />
      <StepRail current={0} />
      <h1 className="mb-3 text-2xl font-semibold">看一眼，识别对不对</h1>
      <WorksheetPlaceholder />
      <Card className="mt-4">
        <label htmlFor="recognized" className="text-sm font-medium text-[#8A5A32]">
          识别出的题目
        </label>
        <textarea
          id="recognized"
          ref={area}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className={`mt-2 w-full resize-none rounded-2xl border bg-[#fffdf8] px-3 py-3 leading-7 outline-none ${editing ? "border-[#D3542C]" : "border-[#ead9c0]"}`}
        />
        <p className="mt-2 text-xs leading-5 text-[#8A6A52]">
          {editing ? "改完后点「对」。" : "点「改」就能直接改正。"} {note}
        </p>
        {error ? (
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SecondaryButton type="button" onClick={edit} disabled={pending || recognizing}>
            改
          </SecondaryButton>
          <PrimaryButton type="button" onClick={confirm} disabled={pending || recognizing || !text.trim()}>
            {pending ? "正在打开…" : "对"}
          </PrimaryButton>
        </div>
      </Card>
      <button type="button" onClick={() => recognize("beyond")} disabled={recognizing || pending} className="mt-4 text-sm font-semibold text-[#8A5A32] disabled:opacity-50">
        {recognizing ? "正在换示例…" : "填入一道超当前目标的题"}
      </button>
    </Frame>
  );
}

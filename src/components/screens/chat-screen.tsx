"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PublicSession } from "@/lib/types";
import { Card, DecisionChip, ErrorNote, Frame, Loading, PrimaryButton, StepRail, TopBar } from "@/components/ui";
import { MonkeyKing } from "@/components/monkey";

const QUICK = ["听不懂", "下一步怎么想", "我算完了"];

export function ChatScreen() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<PublicSession | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        let data = await api<PublicSession>(`/api/sessions/${id}`);
        if (data.messages.length === 0) {
          data = await api<PublicSession>(`/api/sessions/${id}/chat`, {
            method: "POST",
            body: JSON.stringify({ opener: true }),
          });
        }
        if (!cancelled) setSession(data);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "对话没有打开");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [session?.messages.length]);

  async function send(value: string) {
    if (!id || !value.trim()) return;
    setSending(true);
    setError("");
    setText("");
    try {
      const data = await api<PublicSession>(`/api/sessions/${id}/chat`, {
        method: "POST",
        body: JSON.stringify({ text: value }),
      });
      setSession(data);
    } catch (reason) {
      setText(value);
      setError(reason instanceof Error ? reason.message : "这句话没有送出去");
    } finally {
      setSending(false);
    }
  }

  if (error && !session) {
    return (
      <Frame>
        <ErrorNote message={error} />
      </Frame>
    );
  }
  if (!session) return <Loading label="师父正在坐下…" />;

  return (
    <Frame>
      <TopBar />
      <StepRail current={3} />
      <h1 className="mb-1 text-2xl font-semibold">问问师父</h1>
      <p className="mb-4 text-sm text-[#8A6A52]">孙悟空只改说法。「听不懂」会把句子放慢，不会把题目变简单。</p>
      {session.outOfScope ? (
        <Card className="mb-3 border-[#E7B089] bg-[#fff6ee]">
          <p className="text-sm font-semibold">这道题超当前目标</p>
          {session.easierProblem ? <p className="mt-1 text-sm">可以换：{session.easierProblem.stem}</p> : null}
        </Card>
      ) : null}
      <div className="grid gap-3">
        {session.messages.map((message) =>
          message.role === "learner" ? (
            <div key={message.id} className="ml-10 rounded-3xl rounded-br-md bg-[#D3542C] px-4 py-3 text-white">
              <p className="leading-7">{message.content}</p>
            </div>
          ) : (
            <div key={message.id} className="mr-6 flex gap-2">
              <MonkeyKing className="mt-1 h-10 w-10 shrink-0" mood="think" />
              <div className="rounded-3xl rounded-tl-md border border-[#ead9c0] bg-white px-4 py-3">
                {message.decision ? <DecisionChip label={message.decision.actionLabel} simple={message.decision.languageComplexity === "simple"} /> : null}
                <p className="mt-1 leading-7">{message.content}</p>
              </div>
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      {error ? (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((item) => (
          <button key={item} type="button" disabled={sending} onClick={() => send(item)} className="rounded-full border border-[#ead9c0] bg-white px-3 py-2 text-sm disabled:opacity-50">
            {item}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <label className="sr-only" htmlFor="chat-text">
          想对师父说
        </label>
        <input
          id="chat-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="说说你卡在哪"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-[#ead9c0] bg-white px-3"
        />
        <PrimaryButton type="submit" disabled={sending || !text.trim()} className="px-5">
          发送
        </PrimaryButton>
      </form>
      <button type="button" onClick={() => router.push(`/session/${id}/wrap`)} className="mt-4 text-sm font-semibold text-[#8A5A32]">
        去看学习档案
      </button>
    </Frame>
  );
}

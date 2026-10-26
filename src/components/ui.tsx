import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MonkeyKing } from "@/components/monkey";

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundColor: "#f3eadc",
          backgroundImage:
            "radial-gradient(900px 420px at 8% -10%, rgba(227,160,8,0.28), transparent 60%), radial-gradient(680px 360px at 110% 0%, rgba(211,84,44,0.16), transparent 55%)",
        }}
      />
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-16 pt-5 sm:px-6">{children}</div>
    </div>
  );
}

export function TopBar({ action }: { action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-2">
        <MonkeyKing className="h-11 w-11" />
        <span>
          <span className="block text-xs tracking-[0.18em] text-[#8A5A32]">花果山</span>
          <span className="block text-base font-semibold leading-tight">数学小课堂</span>
        </span>
      </Link>
      {action}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-[#ead9c0] bg-white/90 p-4 shadow-[0_12px_30px_rgba(92,58,24,0.06)] ${className}`}>{children}</section>;
}

export function PrimaryButton({ className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-2xl bg-[#D3542C] px-4 text-base font-semibold text-white shadow-[0_8px_16px_rgba(211,84,44,0.22)] transition hover:bg-[#C44722] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function SecondaryButton({ className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-2xl border border-[#E4CDB4] bg-white px-4 text-base font-semibold text-[#2C2118] transition hover:bg-[#fff8ef] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <Frame>
      <p className="mt-16 text-center text-[#8A6A52]">{label}</p>
    </Frame>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-[#D3542C]">
          再试一次
        </button>
      ) : null}
    </Card>
  );
}

const STEPS = ["确认", "作答", "批改", "追问", "档案"];

export function StepRail({ current }: { current: number }) {
  return (
    <ol className="mb-4 flex flex-wrap items-center gap-1 text-xs text-[#8A6A52]">
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-1">
          <span className={index === current ? "rounded-full bg-[#D3542C] px-2 py-1 font-semibold text-white" : "px-1"} aria-current={index === current ? "step" : undefined}>
            {step}
          </span>
          {index < STEPS.length - 1 ? <span aria-hidden>›</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function DecisionChip({ label, simple }: { label: string; simple?: boolean }) {
  return (
    <p className="text-xs text-[#8A6A52]">
      教学动作：{label}
      {simple ? " · 讲慢一点" : ""}
    </p>
  );
}

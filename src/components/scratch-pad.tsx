"use client";

import { useEffect, useRef, type PointerEvent } from "react";

export function ScratchPad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth || 320;
    const height = 160;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#2C2118";
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">手写草稿</p>
        <button type="button" onClick={clear} className="text-sm text-[#D3542C]">
          清空草稿
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-2xl border border-dashed border-[#e0c8a4] bg-[#fffdf8]"
        onPointerDown={(event) => {
          drawing.current = true;
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const next = point(event);
          context.beginPath();
          context.moveTo(next.x, next.y);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const next = point(event);
          context.lineTo(next.x, next.y);
          context.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerLeave={() => {
          drawing.current = false;
        }}
      />
      <p className="mt-2 text-xs text-[#8A6A52]">手写只是草稿示意，不参与批改。请把步骤写在上面的文字框里。</p>
    </div>
  );
}

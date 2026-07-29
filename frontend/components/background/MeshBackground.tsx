"use client";

import { useEffect, useRef } from "react";

/**
 * Ports the prototype's `.mesh` drifting gradient blobs and cursor-follow
 * glow. Respects prefers-reduced-motion by disabling the JS cursor-follow
 * animation (CSS drift animation is already handled by Tailwind's
 * `motion-reduce:` variants in globals.css).
 */
export function MeshBackground() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.left = `${cx}px`;
        glowRef.current.style.top = `${cy}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute w-[700px] h-[700px] rounded-full blur-[120px] opacity-45 bg-maj -top-[180px] -left-[120px] animate-drift motion-reduce:animate-none" />
      <div
        className="absolute w-[700px] h-[700px] rounded-full blur-[120px] opacity-45 bg-vel -bottom-[200px] -right-[120px] animate-drift motion-reduce:animate-none"
        style={{ animationDelay: "-11s" }}
      />
      <div
        ref={glowRef}
        className="hidden md:block fixed w-[600px] h-[600px] rounded-full -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle, rgba(106,77,212,.18), transparent 60%)",
        }}
      />
    </div>
  );
}

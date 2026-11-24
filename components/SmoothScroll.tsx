"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import * as THREE from "three";
import { scrollStore } from "./scroll/scrollStore";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.05, wheelMultiplier: 1 });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const loop = (time: number) => {
      lenis.raf(time);
      scrollStore.target = lenis.scroll;
      scrollStore.smooth = THREE.MathUtils.damp(scrollStore.smooth, scrollStore.target, 8, 1 / 60);
      scrollStore.velocity = lenis.velocity;
      raf = requestAnimationFrame(loop);
    };
    let raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      (window as unknown as { __lenis?: Lenis }).__lenis = undefined;
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

"use client";

import { Suspense } from "react";
import SmoothScroll from "../components/SmoothScroll";
import SceneCanvas from "../components/scene/SceneCanvas";

export default function Home() {
  return (
    <SmoothScroll>
      <div className="scene-root" style={{ position: "relative", width: "100vw", height: "400vh", overflow: "hidden" }}>
        <Suspense fallback={null}>
          <SceneCanvas />
        </Suspense>
      </div>
    </SmoothScroll>
  );
}

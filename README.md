# Secure Mesh — 70-Scene 3D Scroll Experience

A flagship marketing/experience site for **Secure Mesh** — the offline, end-to-end encrypted BLE mesh messaging app.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- **Three.js** via `@react-three/fiber` + `@react-three/drei`
- **GSAP** + ScrollTrigger (HUD, reveals)
- **Lenis** smooth scroll
- Fonts via `next/font/google`: Archivo / Inter / JetBrains Mono

## Run locally

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
```

## Scene architecture

- `lib/scenes70.ts` — typed `Scene70Config[]` choreography (scenes 1–70)
- `components/scroll/scrollStore.ts` — mutable scroll store (target/smooth/velocity)
- `components/SmoothScroll.tsx` — Lenis smooth scroll feeding the store
- `components/scene/CameraRig.tsx` — per-frame camera via CatmullRomCurve3
- `components/scene/World70.tsx` — crossfading 3D environments + glow
- `components/scene/SceneCanvas.tsx` — R3F `<Canvas>` composition
- `components/hud/Hud70.tsx` — scene title HUD
- `components/hud/FeatureModal.tsx` — feature modal placeholder

## Palette

- Chalk White 60% — `#F7F6F2`
- Onyx Black 30% — `#111215`
- Tangerine Glow 10% — `#FF6B1A`

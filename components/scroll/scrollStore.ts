import Lenis from 'lenis'
import { SCENE_COUNT, sceneIndexAt } from '@/lib/scenes70'

/** Mutable, read-only-from-React scroll state. Never setState from useFrame; read these fields instead. */
export const scroll = {
  targetProgress: 0, // 0..1 from Lenis
  smoothProgress: 0, // damped in CameraRig's useFrame
  scrollVelocity: 0, // damped, approx -1..1
  rawVelocity: 0,
  reduced: false,
}

// ---- tiny external stores (useSyncExternalStore-friendly) ----
type L = () => void
const mk = <T,>(init: T) => {
  let v = init
  const ls = new Set<L>()
  return {
    get: () => v,
    set: (n: T) => { if (n !== v) { v = n; ls.forEach((l) => l()) } },
    sub: (l: L) => { ls.add(l); return () => { ls.delete(l) } },
  }
}

/** Live camera handle for DOM overlays that anchor to world positions (set by CameraRig). */
export const view: { cam: import('three').PerspectiveCamera | null } = { cam: null }
export const sceneStore = mk(0) // current scene index 0..69, changes only when it crosses a boundary
export const modalStore = mk<string | null>(null)
export const readyStore = mk({ geometry: false, fonts: false, frame: false })

export const openModal = (k: string | null) => modalStore.set(k)
export const markReady = (k: 'geometry' | 'fonts' | 'frame') => readyStore.set({ ...readyStore.get(), [k]: true })

// ---- live simulation: triggers are timestamps (s) read inside useFrame; counters feed the HUD ----
export type SimKind = 'hop' | 'burst' | 'anomaly' | 'lab'
export const sim: Record<SimKind, number> = { hop: -99, burst: -99, anomaly: -99, lab: -99 }
export const counters = mk({ sent: 0, relayed: 0, dedup: 0, flagged: 0, labRuns: 0 })
export const nowS = () => performance.now() / 1000

export function triggerSim(k: SimKind) {
  sim[k] = nowS()
  const c = counters.get()
  counters.set(
    k === 'hop' ? { ...c, sent: c.sent + 1, relayed: c.relayed + 2 }
    : k === 'burst' ? { ...c, sent: c.sent + 1, dedup: c.dedup + 12 }
    : k === 'anomaly' ? { ...c, flagged: c.flagged + 1 }
    : { ...c, sent: c.sent + 40, relayed: c.relayed + 96, dedup: c.dedup + 17, flagged: c.flagged + 2, labRuns: c.labRuns + 1 },
  )
}

/** Lab link-tuning value (0..1) written by the HUD slider, read in useFrame. */
export const tune = { reach: 0.5 }

// ---- Lenis ----
let lenis: Lenis | null = null
const sceneT = (n: number) => (n - 1 + 0.5) / SCENE_COUNT

export function initScroll() {
  scroll.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  lenis = new Lenis({ lerp: scroll.reduced ? 1 : 0.1, smoothWheel: !scroll.reduced })
  const onScroll = (l: Lenis) => {
    scroll.targetProgress = l.limit > 0 ? Math.min(1, Math.max(0, l.scroll / l.limit)) : 0
    scroll.rawVelocity = Math.max(-1, Math.min(1, l.velocity / 40))
    sceneStore.set(sceneIndexAt(scroll.targetProgress))
  }
  lenis.on('scroll', onScroll)
  onScroll(lenis)
  let raf = 0
  const tick = (t: number) => { lenis?.raf(t); raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick)
  return () => { cancelAnimationFrame(raf); lenis?.destroy(); lenis = null }
}

export function jumpToScene(n: number, instant = false) {
  if (!lenis) return
  const clamped = Math.min(SCENE_COUNT, Math.max(1, n))
  lenis.scrollTo(lenis.limit * sceneT(clamped), { duration: scroll.reduced || instant ? 0 : 2.2 })
}

export function lockScroll(on: boolean) { if (on) lenis?.stop(); else lenis?.start() }

const SIM_SCENE: Record<SimKind, number> = { hop: 24, burst: 28, anomaly: 36, lab: 48 }
/** Fire a simulation; if the visitor is far from the relevant scene, glide there first so the effect is visible. */
export function runSim(k: SimKind) {
  const cur = sceneStore.get() + 1, target = SIM_SCENE[k]
  if (Math.abs(cur - target) > 1) { jumpToScene(target); setTimeout(() => triggerSim(k), scroll.reduced ? 100 : 2400) }
  else triggerSim(k)
}

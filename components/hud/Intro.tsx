'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * "Swarm build" intro: a flock of named cursors (the mesh's phones) circles a blank page, then drags out boxes
 * and types text until the site's own UI is drawn, and the sketch dissolves into the real thing.
 * Plays once per 4 hours (localStorage), skippable (Esc / Enter / button), skipped for reduced motion.
 * Written from scratch; the idea is inspired by DhvanilPatel/swarm-cursors.
 */
const KEY = 'sm.swarm.seen'
const GAP = 4 * 3600 * 1000
const allowed = () => { try { const t = Number(localStorage.getItem(KEY)); return !t || t > Date.now() || Date.now() - t > GAP } catch { return true } }
const stamp = () => { try { localStorage.setItem(KEY, String(Date.now())) } catch { /* private mode: play each load */ } }

const COL = { chalk: '#F7F6F2', onyx: '#111215', tang: '#FF6B1A', grey: '#E3E5E9', raised: '#E9EBEF', mute: '#5c5e66' }
const NAMES = ['Asha', 'Bilal', 'Chen', 'Dara', 'Esha', 'Farid', 'Gita', 'Hari', 'Ira', 'Jay', 'Kabir', 'Leela']

interface Task { kind: 'box' | 'text' | 'ticks'; x: number; y: number; w: number; h: number; r: number; fill?: string; stroke?: string; text?: string; size?: number; color?: string; mono?: boolean; center?: boolean; after: number; p: number; done: boolean; doneAt: number; owner: number; dur: number }
interface Agent { x: number; y: number; vx: number; vy: number; name: string; hot: boolean; task: number; mode: 'swarm' | 'fly' | 'act'; wait: number; fly: number; rot: number; alpha: number }

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

/** The site's real HUD layout (see Hud70 CSS), drawn as a sequence of tasks. */
function layout(W: number, H: number) {
  const T: Task[] = []
  const add = (t: Partial<Task> & { kind: Task['kind'] }) => T.push({ x: 0, y: 0, w: 0, h: 0, r: 0, after: -1, p: 0, done: false, doneAt: 0, owner: -1, dur: 0.6, ...t }) - 1
  const txt = (s: string, x: number, y: number, size: number, o: Partial<Task> = {}) => add({ kind: 'text', text: s, x, y, size, color: COL.onyx, dur: Math.max(0.3, s.length / 34), ...o })
  const wide = W >= 1000

  // header
  const m = add({ kind: 'box', x: 16, y: 16, w: 190, h: 42, r: 12, fill: COL.onyx })
  txt('SECURE_MESH', 52, 42, 13, { color: COL.chalk, mono: true, after: m })
  const jw = Math.min(480, W - 32), jx = (W - jw) / 2, jy = wide ? 16 : 66
  const j = W >= 1100 ? add({ kind: 'box', x: jx, y: jy, w: jw, h: 44, r: 12, stroke: COL.onyx, fill: COL.chalk }) : -1
  if (j >= 0) for (let i = 0; i < 5; i++) add({ kind: 'box', x: jx + 6 + i * ((jw - 12) / 5), y: jy + 6, w: (jw - 12) / 5 - 6, h: 32, r: 9, fill: i === 0 ? COL.tang : COL.onyx, after: j, dur: 0.35 })
  if (wide) {
    const sp = add({ kind: 'box', x: W - 164, y: 16, w: 148, h: 44, r: 12, stroke: COL.onyx, fill: COL.chalk })
    add({ kind: 'box', x: W - 158, y: 22, w: 66, h: 32, r: 9, stroke: COL.onyx, after: sp, dur: 0.35 })
    add({ kind: 'box', x: W - 86, y: 22, w: 64, h: 32, r: 9, stroke: COL.onyx, after: sp, dur: 0.35 })
  }

  const mob = W < 760
  // phone (desktop) with the app's chat list
  if (W >= 1100) {
    const px = W - Math.max(24, W * 0.06) - 234, py = Math.max(84, H / 2 - 242)
    const ph = add({ kind: 'box', x: px, y: py, w: 234, h: 484, r: 34, fill: COL.onyx, dur: 0.9 })
    const sc = add({ kind: 'box', x: px + 8, y: py + 8, w: 218, h: 468, r: 26, fill: COL.grey, after: ph, dur: 0.7 })
    txt('SecureMesh', px + 24, py + 52, 20, { after: sc })
    for (let i = 0; i < 3; i++) add({ kind: 'box', x: px + 20, y: py + 82 + i * 62, w: 186, h: 52, r: 18, fill: COL.raised, stroke: 'rgba(22,24,28,.12)', after: sc, dur: 0.5 })
    add({ kind: 'box', x: px + 22, y: py + 424, w: 182, h: 36, r: 18, fill: COL.raised, after: sc, dur: 0.5 })
    add({ kind: 'box', x: px + 24, y: py + 427, w: 44, h: 30, r: 15, fill: COL.onyx, after: sc, dur: 0.3 })
  } else if (mob) {
    const px = W - 8 - 108, py = 54
    const ph = add({ kind: 'box', x: px, y: py, w: 108, h: 222, r: 16, fill: COL.onyx, dur: 0.7 })
    add({ kind: 'box', x: px + 4, y: py + 4, w: 100, h: 214, r: 12, fill: COL.grey, after: ph, dur: 0.5 })
  }
  // product-section panel: kicker, title, copy, bullets, buttons
  const pw = mob ? W - 20 : Math.min(410, W - 48), pxl = mob ? 10 : Math.max(24, W * 0.04), ph2 = mob ? 190 : 330, py2 = mob ? H - 14 - ph2 : H / 2 - ph2 / 2
  const pan = add({ kind: 'box', x: pxl, y: py2, w: pw, h: ph2, r: 18, stroke: 'rgba(17,18,21,.12)', fill: COL.chalk, dur: 0.8 })
  txt('OFFLINE BLUETOOTH MESSENGER', pxl + 20, py2 + 30, 11, { mono: true, color: COL.mute, after: pan })
  txt('Messages that don’t', pxl + 20, py2 + 68, mob ? 21 : 30, { after: pan })
  txt('need a network.', pxl + 20, py2 + (mob ? 94 : 104), mob ? 21 : 30, { color: COL.tang, after: pan })
  if (!mob) for (let i = 0; i < 3; i++) add({ kind: 'box', x: pxl + 20, y: py2 + 160 + i * 28, w: 9 + 150 + i * 40, h: 10, r: 5, fill: 'rgba(17,18,21,.14)', after: pan, dur: 0.35 })
  add({ kind: 'box', x: pxl + 20, y: py2 + ph2 - 54, w: 150, h: 34, r: 17, fill: COL.tang, after: pan, dur: 0.4 })
  add({ kind: 'box', x: pxl + 178, y: py2 + ph2 - 54, w: 96, h: 34, r: 17, stroke: COL.onyx, after: pan, dur: 0.4 })
  return T
}

function start(cv: HTMLCanvasElement, host: HTMLElement, finish: () => void, setSkip: (f: () => void) => void) {
  const ctx = cv.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = window.innerWidth, H = window.innerHeight
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const fam = getComputedStyle(document.querySelector('.sm-hud') ?? document.body).fontFamily || 'system-ui, sans-serif'
  const mono = 'ui-monospace, Menlo, Consolas, monospace'
  const font = (t: Task) => `${t.mono ? 500 : 700} ${t.size}px ${t.mono ? mono : fam}`
  const tasks = layout(W, H)
  const n = W < 700 ? 8 : NAMES.length
  const agents: Agent[] = Array.from({ length: n }, (_, i) => ({
    x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
    name: NAMES[i], hot: i % 4 === 0, task: -1, mode: 'swarm', wait: 0, fly: 0, rot: 0, alpha: 1,
  }))
  const mouse = { x: -999, y: -999 }
  const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
  window.addEventListener('pointermove', onMove)

  const t0 = performance.now()
  let t = 0, tBuild = 1.8, finale = -1, skipped = false, ended = false, raf = 0, last = performance.now()
  const skip = () => { if (!skipped) { skipped = true; if (finale < 0) finale = t } }
  setSkip(skip)
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') skip() }
  const onResize = () => skip()
  window.addEventListener('keydown', onKey); window.addEventListener('resize', onResize)

  const startPoint = (k: Task) => {
    if (k.kind !== 'text') return [k.x, k.y] as const
    ctx.font = font(k)
    const w = ctx.measureText(k.text!).width
    return [k.center ? k.x - w / 2 : k.x, k.y - k.size! * 0.4] as const
  }
  const rr = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)) }

  function swarm(a: Agent, k: number, pull: number) {
    let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, c = 0
    for (const b of agents) {
      if (b === a) continue
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy
      if (d2 < 150 * 150) { c++; cx += b.x; cy += b.y; ax += b.vx; ay += b.vy; if (d2 < 46 * 46) { sx -= dx; sy -= dy } }
    }
    if (c) { a.vx += ((cx / c - a.x) * 0.0009 + (ax / c - a.vx) * 0.04 + sx * 0.012) * k; a.vy += ((cy / c - a.y) * 0.0009 + (ay / c - a.vy) * 0.04 + sy * 0.012) * k }
    const dx = W / 2 - a.x, dy = H / 2 - a.y, d = Math.hypot(dx, dy) || 1, R = Math.min(W, H) * 0.3
    a.vx += ((dx / d) * (d - R) * 0.0006 * pull + (-dy / d) * 0.035) * k
    a.vy += ((dy / d) * (d - R) * 0.0006 * pull + (dx / d) * 0.035) * k
    const md = Math.hypot(a.x - mouse.x, a.y - mouse.y) // flee the real pointer
    if (md < 150) { const f = (1 - md / 150) * 1.5; a.vx += ((a.x - mouse.x) / md) * f * k; a.vy += ((a.y - mouse.y) / md) * f * k }
    const sp = Math.hypot(a.vx, a.vy), max = 2.7
    if (sp > max) { a.vx = (a.vx / sp) * max; a.vy = (a.vy / sp) * max }
    a.x += a.vx * k; a.y += a.vy * k
    const tip = Math.atan2(a.vy, a.vx) + 2.03 // arrow tip leads the heading
    a.rot += (Math.atan2(Math.sin(tip - a.rot), Math.cos(tip - a.rot))) * Math.min(1, k * 0.12)
  }

  function step(dt: number) {
    const k = dt * 60
    // claim tasks
    if (t > tBuild && finale < 0) {
      for (const a of agents) {
        if (a.mode !== 'swarm') continue
        a.wait -= dt
        if (a.wait > 0) continue
        const i = tasks.findIndex((q) => q.owner < 0 && (q.after < 0 || tasks[q.after].done))
        if (i >= 0) { tasks[i].owner = agents.indexOf(a); a.task = i; a.mode = 'fly'; a.fly = 0 }
      }
    }
    for (const a of agents) {
      if (finale >= 0 && t - finale > 0.35) { // burst outward
        const dx = a.x - W / 2, dy = a.y - H / 2, d = Math.hypot(dx, dy) || 1
        a.x += (dx / d) * 14 * k; a.y += (dy / d) * 14 * k; a.alpha = Math.max(0, a.alpha - dt * 1.4); continue
      }
      if (a.mode === 'swarm') { swarm(a, k, t > tBuild ? 0.2 : 1); continue }
      const q = tasks[a.task]
      a.rot += (0 - a.rot) * Math.min(1, dt * 10)
      if (a.mode === 'fly') {
        a.fly += dt
        const [sx, sy] = startPoint(q)
        a.x += (sx - a.x) * Math.min(1, dt * 9); a.y += (sy - a.y) * Math.min(1, dt * 9)
        if ((Math.hypot(sx - a.x, sy - a.y) < 6 && a.fly > 0.12) || a.fly > 0.8) { a.mode = 'act'; a.fly = 0 }
      } else {
        q.p = Math.min(1, q.p + dt / q.dur)
        let tx: number, ty: number
        if (q.kind === 'box') { const e = ease(q.p); tx = q.x + q.w * e; ty = q.y + q.h * e }
        else if (q.kind === 'ticks') { tx = q.x + q.w * q.p; ty = q.y + q.h / 2 }
        else { ctx.font = font(q); const full = ctx.measureText(q.text!).width, w = ctx.measureText(q.text!.slice(0, Math.floor(q.p * q.text!.length))).width; tx = (q.center ? q.x - full / 2 : q.x) + w + 6; ty = q.y - q.size! * 0.2 }
        a.x += (tx - a.x) * Math.min(1, dt * 16); a.y += (ty - a.y) * Math.min(1, dt * 16)
        if (q.p >= 1) { q.done = true; q.doneAt = t; a.mode = 'swarm'; a.task = -1; a.wait = 0.08 + Math.random() * 0.25; a.vx = (Math.random() - 0.5) * 3; a.vy = (Math.random() - 0.5) * 3 }
      }
    }
    if (finale < 0 && t > tBuild && tasks.every((q) => q.done)) finale = t + 0.4
    if (finale < 0 && (t > 14 || performance.now() - t0 > 13000)) finale = t // safety cap (sim time and wall clock)
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    for (const q of tasks) {
      if (q.p <= 0 && !q.done) continue
      if (q.kind === 'box') {
        const e = q.done ? 1 : ease(q.p), w = q.w * e, h = q.h * e
        if (!q.done) { // live crosshair drag: selection box, handles, size label
          rr(q.x, q.y, w, h, q.r); ctx.fillStyle = 'rgba(255,107,26,.07)'; ctx.fill(); ctx.strokeStyle = COL.tang; ctx.lineWidth = 1.2; ctx.stroke()
          ctx.fillStyle = COL.chalk; for (const [hx, hy] of [[q.x, q.y], [q.x + w, q.y], [q.x, q.y + h], [q.x + w, q.y + h]]) { ctx.fillRect(hx - 3, hy - 3, 6, 6); ctx.strokeRect(hx - 3, hy - 3, 6, 6) }
          const lab = `${Math.round(w)} × ${Math.round(h)}`; ctx.font = `600 10px ${mono}`; const lw = ctx.measureText(lab).width + 10
          ctx.fillStyle = COL.tang; rr(q.x + w - lw / 2, q.y + h + 8, lw, 16, 8); ctx.fill(); ctx.fillStyle = COL.onyx; ctx.fillText(lab, q.x + w - lw / 2 + 5, q.y + h + 20)
        } else {
          ctx.globalAlpha = Math.min(1, 0.35 + (t - q.doneAt) * 4)
          rr(q.x, q.y, q.w, q.h, q.r)
          if (q.fill) { ctx.fillStyle = q.fill; ctx.fill() }
          if (q.stroke) { ctx.strokeStyle = q.stroke; ctx.lineWidth = 1; ctx.stroke() }
          ctx.globalAlpha = 1
        }
      } else if (q.kind === 'text') {
        ctx.font = font(q); const full = ctx.measureText(q.text!).width, nChars = Math.floor(q.p * q.text!.length), x0 = q.center ? q.x - full / 2 : q.x
        ctx.fillStyle = q.color!; ctx.fillText(q.text!.slice(0, nChars), x0, q.y)
        if (!q.done && Math.floor(t * 4) % 2 === 0) { ctx.fillStyle = COL.tang; ctx.fillRect(x0 + ctx.measureText(q.text!.slice(0, nChars)).width + 1, q.y - q.size! * 0.85, 2, q.size! * 1.05) }
      } else {
        const cnt = Math.floor(q.p * 70), s = q.w / 70
        for (let i = 0; i < cnt; i++) { ctx.fillStyle = i === 0 ? COL.tang : 'rgba(17,18,21,.22)'; rr(q.x + i * s, q.y, Math.max(1, s - 2), q.h, 3); ctx.fill() }
      }
    }
    // BLE-style links between nearby phones, with a pulse travelling each link
    ctx.lineWidth = 1
    for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i], b = agents[j], d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d > 140 || a.alpha <= 0) continue
      ctx.strokeStyle = `rgba(17,18,21,${(1 - d / 140) * 0.28 * a.alpha})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      const p = (t * 0.9 + i * 0.37) % 1; ctx.fillStyle = `rgba(255,107,26,${(1 - d / 140) * a.alpha})`; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, 2, 0, 6.3); ctx.fill()
    }
    for (const a of agents) {
      if (a.alpha <= 0) continue
      ctx.save(); ctx.globalAlpha = a.alpha; ctx.translate(a.x, a.y); ctx.rotate(a.rot)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.5, 13); ctx.lineTo(8, 20); ctx.lineTo(10.5, 19); ctx.lineTo(7, 12); ctx.lineTo(13, 12); ctx.closePath()
      ctx.fillStyle = a.hot ? COL.tang : COL.onyx; ctx.fill(); ctx.strokeStyle = COL.chalk; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.rotate(-a.rot); ctx.font = `600 11px ${fam}`; const lab = a.mode === 'swarm' ? a.name : a.name + (tasks[a.task]?.kind === 'text' ? ' · typing' : ' · drawing'); const w = ctx.measureText(lab).width + 14
      ctx.fillStyle = a.hot ? COL.tang : COL.onyx; rr(12, 18, w, 18, 9); ctx.fill(); ctx.fillStyle = a.hot ? COL.onyx : COL.chalk; ctx.fillText(lab, 19, 31)
      ctx.restore()
    }
  }

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt
    step(dt); draw()
    if (finale >= 0 && t - finale > 0.2 && host.dataset.out !== 'true') host.dataset.out = 'true' // CSS cross-dissolve into the live site
    if (finale >= 0 && t - finale > (skipped ? 0.6 : 1.5)) { if (!ended) { ended = true; finish() } return }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize) }
}

/** `force` increments to replay on demand (does not touch the 4-hour timer). */
export function Intro({ force }: { force: number }) {
  const [on, setOn] = useState(false)
  const cv = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null), skipRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (force === 0) { if (!allowed()) return; stamp() }
    setOn(true)
  }, [force])

  useEffect(() => {
    if (!on || !cv.current || !host.current) return
    const root = document.documentElement, prev = root.style.overflow
    root.style.overflow = 'hidden' // no scrolling while the swarm builds
    const stop = start(cv.current, host.current, () => setOn(false), (f) => { skipRef.current = f })
    return () => { stop(); root.style.overflow = prev }
  }, [on])

  if (!on) return null
  return (
    <div ref={host} className="sm-intro" data-out="false">
      <canvas ref={cv} aria-hidden="true" />
      <button className="sm-btn sm-ghost sm-skip" onClick={() => skipRef.current()}>Skip intro · Esc</button>
    </div>
  )
}

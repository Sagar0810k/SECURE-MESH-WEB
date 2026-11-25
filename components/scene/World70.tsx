'use client'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeElements, type ThreeEvent } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { CameraRig } from './CameraRig'
import { envWeights, SCENE_COUNT, type EnvId, type ModalKey } from '@/lib/scenes70'
const LOW = typeof window !== 'undefined' && (window.innerWidth < 760 || matchMedia('(pointer:coarse)').matches)
import { counters, markReady, nowS, openModal, scroll, sim, tune } from '@/components/scroll/scrollStore'

// ───────────────────────── palette ─────────────────────────
const C = { chalk: '#F7F6F2', onyx: '#111215', tang: '#FF6B1A' }
const SKIN = ['#f1c9a5', '#e0ac85', '#c68642', '#8d5524', '#5c3a21']
const CLOTH = ['#2f4f7f', '#556b2f', '#a23b2a', '#d4a72c', '#3b3b3b', '#7a5c3e', '#c9c1b0', '#2e6f6a']
const PACK = ['#3a4a6b', '#8a3b2e', '#4b5b3a', '#2d2d2d', '#b8802f']
const PANTS = ['#2b3a55', '#3a3a3d', '#6b5d45', '#1f2a44', '#4a4f57']

// ───────────────────────── shared geometry + materials (created once, disposed on unmount) ─────────────────────────
const std = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o })
function makeAssets() {
  const geo = {
    sphere: new THREE.SphereGeometry(1, 20, 14), shell: new THREE.SphereGeometry(1, 16, 10), box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 18), capsule: new THREE.CapsuleGeometry(0.22, 0.8, 4, 8),
    torus: new THREE.TorusGeometry(1, 0.018, 6, 96), torusFat: new THREE.TorusGeometry(1, 0.05, 8, 64), flat: new THREE.RingGeometry(0.96, 1, 72),
    cone: new THREE.ConeGeometry(1, 1, 8), ico: new THREE.IcosahedronGeometry(1, 0), icoDetail: new THREE.IcosahedronGeometry(1, 1),
    plane: new THREE.PlaneGeometry(1, 1), wedge: new THREE.CircleGeometry(10, 40, 0, Math.PI / 3),
  }
  const mat = {
    // UI / system accents (60/30/10)
    chalk: std(C.chalk), onyx: std(C.onyx, { roughness: 0.5 }), tang: std(C.tang, { emissive: C.tang, emissiveIntensity: 1.5 }),
    tangFlat: new THREE.MeshBasicMaterial({ color: C.tang }), onyxFlat: new THREE.MeshBasicMaterial({ color: C.onyx }),
    chalkFlat: new THREE.MeshBasicMaterial({ color: C.chalk }), grey: std('#8d8f94'),
    wire: new THREE.MeshBasicMaterial({ color: C.tang, wireframe: true }),
    sweep: new THREE.MeshBasicMaterial({ color: C.tang, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    glass: new THREE.MeshBasicMaterial({ color: C.tang, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    // natural, real-life colours
    white: std('#ffffff'), tile: std('#cfc8b8'), wall: std('#b9b2a2'), concrete: std('#9d9b95'), wood: std('#8a5a2e'), metal: std('#6c737b'),
    brick: std('#9c4f3a'), awningRed: std('#b8402e'), awningCream: std('#eadfc8'), board: std('#2d5f8b'), asphalt: std('#3a3b40'),
    sidewalk: std('#8e8a82'), lampPole: std('#2b2e33'), lampBulb: new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), grass: std('#6d8b45'),
    trail: std('#a68c68'), bark: std('#6a4a2f'), sign: std('#d9a441'),
  }
  return { geo, mat }
}
type Assets = ReturnType<typeof makeAssets>
const AssetCtx = createContext<Assets>(null!)
const useA = () => useContext(AssetCtx)
const EnvRef = createContext<React.RefObject<THREE.Group | null>>(null!)

// ───────────────────────── env registry + weights (module-level; written only by Driver) ─────────────────────────
const ENV_IDS: EnvId[] = ['concourse', 'rfBasin', 'relayLattice', 'idsSanctuary', 'meshLab', 'synthesis', 'eveningStreet', 'fieldTrail']
const EW = Object.fromEntries(ENV_IDS.map((k) => [k, 0])) as Record<EnvId, number>
const groups: Partial<Record<EnvId, THREE.Group>> = {}
const fade: Partial<Record<EnvId, THREE.Material[]>> = {}
const lastW: Partial<Record<EnvId, number>> = {}

interface Style { bg: string; near: number; far: number; dirI: number; dirC: string; amb: number }
const STYLE: Record<EnvId, Style> = {
  concourse: { bg: '#d9dfe3', near: 22, far: 60, dirI: 2.4, dirC: '#fff4e0', amb: 0.8 },
  rfBasin: { bg: C.chalk, near: 22, far: 50, dirI: 1.3, dirC: '#ffffff', amb: 1.0 },
  relayLattice: { bg: C.chalk, near: 24, far: 52, dirI: 1.3, dirC: '#ffffff', amb: 1.0 },
  idsSanctuary: { bg: C.onyx, near: 16, far: 38, dirI: 1.2, dirC: '#ffffff', amb: 1.0 },
  meshLab: { bg: C.chalk, near: 24, far: 52, dirI: 1.3, dirC: '#ffffff', amb: 1.0 },
  synthesis: { bg: C.chalk, near: 26, far: 60, dirI: 1.4, dirC: '#ffffff', amb: 1.0 },
  eveningStreet: { bg: '#2a2233', near: 14, far: 44, dirI: 0.9, dirC: '#ffb87a', amb: 0.6 },
  fieldTrail: { bg: '#b7d3e8', near: 28, far: 80, dirI: 2.6, dirC: '#fff1d6', amb: 0.9 },
}

// ───────────────────────── helpers ─────────────────────────
const rnd = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const lerp = THREE.MathUtils.lerp
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const sceneU = (n: number) => scroll.smoothProgress * SCENE_COUNT - (n - 1) // local progress inside scene n
const tt = (c: THREE.Clock) => (scroll.reduced ? 0 : c.elapsedTime)
const pick = <T,>(a: T[], r: () => number) => a[Math.floor(r() * a.length)]

const hit = (k: ModalKey, env: EnvId) => ({
  onClick: (e: ThreeEvent<MouseEvent>) => { if (EW[env] < 0.5) return; e.stopPropagation(); openModal(k) },
  onPointerOver: (e: ThreeEvent<PointerEvent>) => { if (EW[env] < 0.5) return; e.stopPropagation(); document.body.style.cursor = 'pointer' },
  onPointerOut: () => { document.body.style.cursor = '' },
})

function scatter(n: number, seed: number, rMin: number, rMax: number, y = 0) {
  const r = rnd(seed)
  return Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996 + r() * 0.5, d = lerp(rMin, rMax, Math.sqrt((i + 0.5) / n))
    return V(Math.cos(a) * d, y + (r() - 0.5) * 0.8, Math.sin(a) * d)
  })
}
function links(nodes: THREE.Vector3[], maxD: number) {
  const pts: THREE.Vector3[] = []
  nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && a.distanceTo(b) < maxD) pts.push(a, b) }))
  return new THREE.BufferGeometry().setFromPoints(pts)
}
function useSelfMat(color: string) {
  const m = useMemo(() => { const x = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }); x.userData.self = true; return x }, [color])
  useEffect(() => () => m.dispose(), [m])
  return m
}

type MP = Omit<ThreeElements['mesh'], 'geometry' | 'material' | 'ref'> & { g: keyof Assets['geo']; m: keyof Assets['mat'] }
function M({ g, m, ...p }: MP) { const A = useA(); return <mesh geometry={A.geo[g]} material={A.mat[m]} {...p} /> }

// Instanced mesh: `fill` runs once, `anim` every frame while its env is visible.
type Fill = (i: number, o: THREE.Object3D, c: THREE.Color) => void
type Anim = (i: number, o: THREE.Object3D, c: THREE.Color, t: number) => void
function Inst({ g, m, count, fill, anim, colored, animColor, extra }: { g: keyof Assets['geo']; m: keyof Assets['mat']; count: number; fill?: Fill; anim?: Anim; colored?: boolean; animColor?: boolean; extra?: object }) {
  const A = useA(), shown = useContext(EnvRef), ref = useRef<THREE.InstancedMesh>(null)
  const o = useMemo(() => new THREE.Object3D(), []), c = useMemo(() => new THREE.Color(), [])
  const run = (f: Fill | Anim, t: number, setColor: boolean) => {
    const mesh = ref.current!
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); c.set('#ffffff')
      ;(f as Anim)(i, o, c, t)
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix)
      if (setColor) mesh.setColorAt(i, c)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (setColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  useLayoutEffect(() => { run(fill ?? ((_i: number, ob: THREE.Object3D) => { ob.scale.setScalar(0.0001) }), 0, !!colored) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => { if (anim && shown.current?.visible) run(anim, tt(clock), !!animColor) })
  return <instancedMesh ref={ref} args={[A.geo[g], A.mat[m], count]} frustumCulled={false} {...(extra as object)} />
}

function Env({ id, children }: { id: EnvId; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => { groups[id] = ref.current!; return () => { delete groups[id] } }, [id])
  return <group ref={ref} visible={false}><EnvRef.Provider value={ref}>{children}</EnvRef.Provider></group>
}

/** Expanding ring in the env's own fade-aware material. */
function Ping({ env, pos, max = 3, period = 2.4, off = 0, color = C.tang }: { env: EnvId; pos: [number, number, number]; max?: number; period?: number; off?: number; color?: string }) {
  const A = useA(), m = useSelfMat(color), ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const k = (tt(clock) / period + off) % 1
    ref.current!.scale.setScalar(0.2 + max * k); m.opacity = (1 - k) * 0.8 * EW[env]
  })
  return <mesh ref={ref} geometry={A.geo.flat} material={m} position={pos} rotation-x={-Math.PI / 2} />
}
function Shell({ env, max, period, off }: { env: EnvId; max: number; period: number; off: number }) {
  const A = useA(), m = useMemo(() => { const x = new THREE.MeshBasicMaterial({ color: C.tang, wireframe: true, transparent: true, opacity: 0 }); x.userData.self = true; return x }, [])
  useEffect(() => () => m.dispose(), [m])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { const k = (tt(clock) / period + off) % 1; ref.current!.scale.setScalar(0.3 + max * k); m.opacity = (1 - k) * 0.35 * EW[env] })
  return <mesh ref={ref} geometry={A.geo.shell} material={m} />
}
/** Dots travelling along a curve. */
function Dots({ curve, n, speed, size = 0.1, mat = 'tang' }: { curve: THREE.Curve<THREE.Vector3>; n: number; speed: number; size?: number; mat?: keyof Assets['mat'] }) {
  return <Inst g="sphere" m={mat} count={n} anim={(i, o, _c, t) => { curve.getPoint((t * speed + i / n) % 1, o.position); o.scale.setScalar(size) }} />
}
function Tube({ curve, r = 0.04, mat = 'onyx', extra }: { curve: THREE.Curve<THREE.Vector3>; r?: number; mat?: keyof Assets['mat']; extra?: object }) {
  const A = useA(), geo = useMemo(() => new THREE.TubeGeometry(curve, 64, r, 6, false), [curve, r])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={A.mat[mat]} {...(extra as object)} />
}

// ───────────────────────── crowd (natural colours; instanced bodies, heads, packs, phones) ─────────────────────────
function Crowd({ n, seed, area, speed = 0.3, axis = 'x', fixed = [], onPhone, env }: { n: number; seed: number; area: [number, number, number, number]; speed?: number; axis?: 'x' | 'z'; fixed?: [number, number][]; onPhone?: object; env: EnvId }) {
  const shown = useContext(EnvRef)
  const bodies = useRef<THREE.InstancedMesh>(null), heads = useRef<THREE.InstancedMesh>(null), packs = useRef<THREE.InstancedMesh>(null)
  const phones = useRef<THREE.InstancedMesh>(null), screens = useRef<THREE.InstancedMesh>(null)
  const legs = useRef<THREE.InstancedMesh>(null), shadows = useRef<THREE.InstancedMesh>(null), shadowMat = useSelfMat('#000000')
  const A = useA(), o = useMemo(() => new THREE.Object3D(), []), col = useMemo(() => new THREE.Color(), [])
  const people = useMemo(() => {
    const r = rnd(seed)
    return Array.from({ length: n }, (_, i) => ({
      x: fixed[i]?.[0] ?? lerp(area[0], area[1], r()), z: fixed[i]?.[1] ?? lerp(area[2], area[3], r()),
      still: i < fixed.length, ph: r() * 6.28, amp: 0.4 + r() * 1.4, h: 0.9 + r() * 0.2, pack: r() > 0.45,
      cloth: pick(CLOTH, r), skin: pick(SKIN, r), packC: pick(PACK, r), pants: pick(PANTS, r),
    }))
  }, [n, seed, area, fixed])
  useLayoutEffect(() => {
    people.forEach((p, i) => {
      bodies.current!.setColorAt(i, col.set(p.cloth)); heads.current!.setColorAt(i, col.set(p.skin)); packs.current!.setColorAt(i, col.set(p.packC))
    })
    people.forEach((p, i) => { legs.current!.setColorAt(i * 2, col.set(p.pants)); legs.current!.setColorAt(i * 2 + 1, col.set(p.pants)) })
    for (const m of [bodies, heads, packs, legs]) m.current!.instanceColor!.needsUpdate = true
  }, [people, col])
  useFrame(({ clock }) => {
    if (!shown.current?.visible) return
    const t = tt(clock)
    people.forEach((p, i) => {
      const s = p.still ? 0 : Math.sin(t * speed + p.ph) * p.amp
      const x = p.x + (axis === 'x' ? s : 0), z = p.z + (axis === 'z' ? s : 0), bob = p.still ? 0 : Math.abs(Math.sin(t * speed * 6 + p.ph)) * 0.04
      const face = (axis === 'x' ? Math.cos(t * speed + p.ph) : Math.cos(t * speed + p.ph)) > 0 ? 1 : -1
      const put = (m: THREE.InstancedMesh, px: number, py: number, pz: number, sx: number, sy: number, sz: number, ry = 0, idx = i, rx = 0) => {
        o.rotation.order = 'YXZ'; o.position.set(px, py, pz); o.rotation.set(rx, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix(); m.setMatrixAt(idx, o.matrix)
      }
      const ry = axis === 'x' ? (face > 0 ? Math.PI / 2 : -Math.PI / 2) : face > 0 ? 0 : Math.PI
      put(bodies.current!, x, 1.05 * p.h + bob, z, 1, 0.62 * p.h, 1, ry)
      put(heads.current!, x, 1.62 * p.h + bob, z, 0.17, 0.17, 0.17)
      const sw = p.still ? 0 : Math.sin(t * speed * 6 + p.ph) * 0.5
      for (const sd of [-1, 1]) put(legs.current!, x + Math.cos(ry) * sd * 0.09, 0.36 * p.h, z - Math.sin(ry) * sd * 0.09, 0.075, 0.72 * p.h, 0.075, ry, i * 2 + (sd + 1) / 2, sw * sd)
      put(shadows.current!, x, 0.01, z, 0.38, 0.004, 0.38)
      put(packs.current!, x - Math.sin(ry) * 0.2, 1.0 * p.h + bob, z - Math.cos(ry) * 0.2, p.pack ? 0.3 : 0.0001, 0.4, 0.16, ry)
      put(phones.current!, x + Math.sin(ry) * 0.25, 1.05 * p.h + bob, z + Math.cos(ry) * 0.25, 0.08, 0.14, 0.015, ry)
      put(screens.current!, x + Math.sin(ry) * 0.262, 1.05 * p.h + bob, z + Math.cos(ry) * 0.262, 0.07, 0.12, 0.002, ry)
    })
    for (const m of [bodies, heads, packs, phones, screens, legs, shadows]) m.current!.instanceMatrix.needsUpdate = true
    shadowMat.opacity = 0.22 * EW[env]
  })
  const props = { frustumCulled: false }
  return (
    <>
      <instancedMesh ref={bodies} args={[A.geo.capsule, A.mat.white, n]} {...props} />
      <instancedMesh ref={heads} args={[A.geo.sphere, A.mat.white, n]} {...props} />
      <instancedMesh ref={packs} args={[A.geo.box, A.mat.white, n]} {...props} />
      <instancedMesh ref={legs} args={[A.geo.cyl, A.mat.white, n * 2]} {...props} />
      <instancedMesh ref={shadows} args={[A.geo.cyl, shadowMat, n]} {...props} />
      <instancedMesh ref={phones} args={[A.geo.box, A.mat.onyx, n]} {...props} />
      <instancedMesh ref={screens} args={[A.geo.box, A.mat.tang, n]} {...props} {...(onPhone ?? {})} />
    </>
  )
}

// ───────────────────────── PROLOGUE: concourse ─────────────────────────
function Motes({ n = 40, box = [24, 8, 24], y = 4, size = 0.035, m = 'chalk' as keyof Assets['mat'] }: { n?: number; box?: number[]; y?: number; size?: number; m?: keyof Assets['mat'] }) {
  const k = LOW ? Math.floor(n / 2) : n
  return <Inst g="sphere" m={m} count={k} anim={(i, o, _c, t) => { const r = rnd(i + 7); const bx = r() * box[0] - box[0] / 2, by = r() * box[1], bz = r() * box[2] - box[2] / 2; o.position.set(bx + Math.sin(t * 0.2 + i) * 0.6, y - box[1] / 2 + (by + t * 0.1) % box[1], bz + Math.cos(t * 0.17 + i) * 0.6); o.scale.setScalar(size) }} />
}

function Concourse() {
  const hero: [number, number][] = [[0.3, 0.3], [-3.5, 1.2], [3.5, 0]]
  const portal = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (portal.current) portal.current.rotation.z = tt(clock) * 0.3 })
  return (
    <>
      <Motes n={40} m="chalk" />
      <M g="plane" m="tile" rotation-x={-Math.PI / 2} scale={[70, 70, 1]} />
      <M g="box" m="wall" position={[0, 5, -22]} scale={[70, 12, 0.5]} />
      <Inst g="box" m="concrete" count={10} fill={(i, o) => { o.position.set(-15 + (i % 5) * 7.5, 3, i < 5 ? -8 : -15); o.scale.set(0.9, 6, 0.9) }} />
      <Inst g="box" m="metal" count={7} fill={(i, o) => { o.position.set(-15 + i * 5, 6.2, -2); o.scale.set(0.5, 0.4, 40) }} />
      <Inst g="box" m="wood" count={8} fill={(i, o) => {
        const b = [[-3.5, 1.2], [5, -3], [-8, -3], [9, 3]][i % 4]
        if (i < 4) { o.position.set(b[0], 0.45, b[1]); o.scale.set(2.2, 0.12, 0.6) } else { o.position.set(b[0], 0.85, b[1] - 0.3); o.scale.set(2.2, 0.6, 0.1) }
      }} />
      <M g="box" m="brick" position={[-7, 1, -11]} scale={[3.2, 2, 1.6]} />
      <M g="box" m="awningRed" position={[-7, 2.3, -10.8]} scale={[3.6, 0.15, 2.1]} />
      <M g="box" m="brick" position={[7, 1, -11]} scale={[3.2, 2, 1.6]} />
      <M g="box" m="awningCream" position={[7, 2.3, -10.8]} scale={[3.6, 0.15, 2.1]} />
      <M g="plane" m="board" position={[0, 2.2, -21.7]} scale={[7, 3.4, 1]} />
      <Crowd env="concourse" n={LOW ? 14 : 28} seed={11} area={[-11, 11, -9, 1]} fixed={hero} speed={0.3} onPhone={hit('chats', 'concourse')} />
      {/* technical callouts: dead-zone crossed rings + BLE proximity wave (UI accents, not realistic) */}
      <group position={[0.3, 4.4, 0.3]}>
        <M g="torusFat" m="tangFlat" scale={0.7} />
        <M g="box" m="tangFlat" rotation-z={Math.PI / 4} scale={[1.5, 0.07, 0.07]} />
        <M g="box" m="tangFlat" rotation-z={-Math.PI / 4} scale={[1.5, 0.07, 0.07]} />
      </group>
      <Ping env="concourse" pos={[0.3, 1.05, 0.3]} max={4} period={2.2} />
      <Ping env="concourse" pos={[-3.5, 1.05, 1.2]} max={3} period={2.2} off={0.5} />
      {/* scene 10: glowing device screen + RF wave plane we dive through */}
      <group ref={portal} position={[0, 1.6, -3.2]}>
        <M g="plane" m="glass" scale={[3.4, 2.2, 1]} />
        <M g="torusFat" m="tangFlat" scale={1.7} />
        <M g="torus" m="tangFlat" scale={2.3} />
      </group>
    </>
  )
}

// ───────────────────────── ACT I: RF basin ─────────────────────────
function RfBasin() {
  const nodes = useMemo(() => scatter(14, 7, 2.6, 9.4), [])
  const edges = useMemo(() => links(nodes, 4.8), [nodes])
  const A = useA(), shown = useContext(EnvRef), sweep = useRef<THREE.Mesh>(null), edge = useRef<THREE.Group>(null), orb = useRef<THREE.Group>(null)
  const loop = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => V(-6 + Math.cos(i / 12 * 6.283) * 1.2, 0.4, -5 + Math.sin(i / 12 * 6.283) * 1.2)), true), [])
  const live = useMemo(() => new THREE.LineCurve3(V(3, 0.4, -5), V(7, 0.4, -5)), [])
  const fr = useMemo(() => { const r = rnd(4); return Array.from({ length: 14 }, () => V((r() - 0.5) * 4, r() * 2, (r() - 0.5) * 4)) }, [])
  useEffect(() => () => edges.dispose(), [edges])
  useFrame(({ clock }) => {
    if (!shown.current?.visible) return
    const t = tt(clock)
    sweep.current!.rotation.y = -t * 0.9
    // scene 17: a node drifting out of range; link thins and flickers
    const x = 8.6 + Math.sin(t * 0.6) * 1.5, g = edge.current!, len = x - 5.2
    g.children[0].position.set((x + 5.2) / 2, 0.4, -2); g.children[0].scale.set(Math.max(0.01, 0.06 * (1 - len / 5)), len, Math.max(0.01, 0.06 * (1 - len / 5)))
    g.children[0].visible = Math.sin(t * 40) > -0.5 + (len - 3) * 0.2
    g.children[1].position.set(x, 0.4, -2); g.children[2].position.set(x, 0.4, -2); g.children[2].scale.setScalar(0.5 + 0.1 * Math.sin(t * 6))
    orb.current!.rotation.y = t * 0.8
  })
  return (
    <>
      <Motes n={40} m="tang" />
      {[2.5, 4.5, 6.5, 8.5, 10.5].map((r) => <M key={r} g="torus" m="onyx" rotation-x={Math.PI / 2} scale={r} />)}
      <mesh ref={sweep} geometry={A.geo.wedge} material={A.mat.sweep} rotation-x={-Math.PI / 2} position-y={0.02} {...hit('radar', 'rfBasin')} />
      <Inst g="sphere" m="onyx" count={nodes.length} fill={(i, o) => { o.position.copy(nodes[i]); o.scale.setScalar(0.26) }} extra={hit('radar', 'rfBasin')} />
      <M g="sphere" m="tang" scale={0.42} {...hit('radar', 'rfBasin')} />
      <lineSegments geometry={edges}><lineBasicMaterial color={C.onyx} transparent opacity={0.35} /></lineSegments>
      <Shell env="rfBasin" max={9} period={3.2} off={0} /><Shell env="rfBasin" max={9} period={3.2} off={0.33} /><Shell env="rfBasin" max={9} period={3.2} off={0.66} />
      {/* scene 14: raw bytes snap into frames */}
      <group position={[4.5, 0.7, 3.2]}>
        <Inst g="box" m="white" count={14} colored animColor anim={(i, o, c) => {
          const k = THREE.MathUtils.smoothstep(sceneU(14), 0.1, 0.8)
          o.position.set(lerp(fr[i].x, i * 0.3 - 2, k), lerp(fr[i].y, 0, k), lerp(fr[i].z, 0, k)); o.scale.set(0.24, 0.24, 0.24)
          c.set(i < 2 ? C.tang : i < 4 ? '#8d8f94' : C.onyx)
        }} />
      </group>
      {/* scene 16: loopback track vs live BLE track */}
      <Tube curve={loop} r={0.025} /><Dots curve={loop} n={3} speed={0.25} size={0.14} />
      <Tube curve={live} r={0.025} /><Dots curve={live} n={3} speed={0.35} size={0.14} mat="onyx" />
      <M g="sphere" m="onyx" position={[3, 0.4, -5]} scale={0.3} /><M g="sphere" m="onyx" position={[7, 0.4, -5]} scale={0.3} />
      <group ref={edge}><M g="cyl" m="tang" /><M g="sphere" m="onyx" scale={0.28} /><M g="torus" m="tangFlat" /></group>
      {/* scene 18: session/context rings on a pair */}
      <group ref={orb} position={[-3, 0.8, 3.5]}>
        <M g="torus" m="tangFlat" scale={0.9} rotation-x={0.9} /><M g="torus" m="onyxFlat" scale={1.2} rotation-x={-0.6} />
      </group>
    </>
  )
}

// ───────────────────────── ACT II: relay lattice ─────────────────────────
const P = { S: V(-8, 0, 1), R1: V(-4, 1.2, -1), R2: V(0, 0.2, 1.8), J: V(3.8, 1, -0.6), D: V(8.5, 0.3, 0.6), RB: V(-1.5, 2, -4) }
function RelayLattice() {
  const route = useMemo(() => new THREE.CatmullRomCurve3([P.S, P.R1, P.R2, P.J, P.D]), [])
  const branch = useMemo(() => new THREE.CatmullRomCurve3([P.S, P.RB, P.J]), [])
  const shown = useContext(EnvRef), A = useA()
  const pkt = useRef<THREE.Group>(null), dup = useRef<THREE.Mesh>(null), gate = useRef<THREE.Mesh>(null), shell = useRef<THREE.Mesh>(null)
  const way = useRef<THREE.InstancedMesh>(null), burst = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => new THREE.Vector3(), []), o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    if (!shown.current?.visible) return
    const t = tt(clock), now = nowS()
    const sp = now - sim.hop, pa = sp >= 0 && sp < 3 ? sp / 3 : (t * 0.1) % 1
    route.getPoint(pa, pkt.current!.position); shell.current!.rotation.y = t
    const pb = THREE.MathUtils.clamp((pa - 0.05) / 0.72, 0, 1), showB = pa > 0.05 && pa < 0.8
    branch.getPoint(pb, dup.current!.position); dup.current!.visible = showB
    dup.current!.scale.setScalar(0.18 * (1 - THREE.MathUtils.smoothstep(pb, 0.88, 1)))
    let pulse = Math.max(0, 1 - Math.abs(pb - 1) * 6) * (showB ? 1 : 0)
    // duplicate burst: 12 copies stream down the branch and are dropped at the gate
    const bs = now - sim.burst
    for (let i = 0; i < 12; i++) {
      const p = THREE.MathUtils.clamp((bs - i * 0.08) / 1.1, 0, 1), live = bs > 0 && bs < 3 && p > 0 && p < 1
      branch.getPoint(p, tmp); o.position.copy(tmp).add(V(0, ((i % 3) - 1) * 0.12, ((i % 4) - 1.5) * 0.1))
      o.scale.setScalar(live ? 0.12 * (1 - THREE.MathUtils.smoothstep(p, 0.88, 1)) : 0.0001); o.updateMatrix(); burst.current!.setMatrixAt(i, o.matrix)
      if (live && p > 0.9) pulse = 1
    }
    burst.current!.instanceMatrix.needsUpdate = true
    gate.current!.scale.setScalar(0.9 + pulse * 0.45)
    // waypoints light as the packet passes (hop 1..4)
    ;[0.25, 0.5, 0.75, 1].forEach((th, i) => { o.position.copy(route.getPoint(th)); o.position.y += 0.7; o.scale.setScalar(pa >= th - 0.02 ? 0.22 : 0.1); o.updateMatrix(); way.current!.setMatrixAt(i, o.matrix) })
    way.current!.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <Tube curve={route} extra={hit('multihop', 'relayLattice')} /><Tube curve={branch} r={0.025} />
      <M g="box" m="onyx" position={[0, 0.8, 0.4]} scale={[0.01, 0.01, 0.01]} />
      <mesh position={P.S.clone().lerp(P.D, 0.5)} geometry={A.geo.cyl} material={A.mat.grey} rotation-z={Math.PI / 2} scale={[0.012, 16.5, 0.012]} />
      <M g="sphere" m="tang" position={P.S} scale={0.5} />
      <M g="sphere" m="onyx" position={P.D} scale={0.45} /><M g="torus" m="tangFlat" position={P.D} scale={0.9} />
      <M g="sphere" m="onyx" position={P.RB} scale={0.32} />
      {[P.R1, P.R2, P.J].map((p, i) => (
        <group key={i} position={p}><M g="cyl" m="onyx" scale={[0.55, 0.4, 0.55]} {...hit('multihop', 'relayLattice')} /><M g="torus" m="tangFlat" rotation-x={Math.PI / 2} position-y={0.25} scale={0.7} /></group>
      ))}
      <mesh ref={gate} geometry={A.geo.torusFat} material={A.mat.tang} position={P.J} rotation-y={Math.PI / 2} scale={1} {...hit('dedup', 'relayLattice')} />
      <group ref={pkt}>
        <M g="sphere" m="tang" scale={0.2} />
        <mesh ref={shell} geometry={A.geo.ico} material={A.mat.wire} scale={0.4} {...hit('crypto', 'relayLattice')} />
      </group>
      <mesh ref={dup} geometry={A.geo.sphere} material={A.mat.tang} />
      <instancedMesh ref={way} args={[A.geo.sphere, A.mat.onyx, 4]} frustumCulled={false} />
      <instancedMesh ref={burst} args={[A.geo.sphere, A.mat.tang, 12]} frustumCulled={false} />
    </>
  )
}

// ───────────────────────── ACT III: IDS sanctuary ─────────────────────────
function IdsSanctuary() {
  const A = useA(), shown = useContext(EnvRef)
  const rim = useMemo(() => scatter(8, 3, 6, 6.6), []), inner = useMemo(() => scatter(6, 9, 1.6, 4.2), [])
  const tree = useMemo(() => {
    const pts: THREE.Vector3[] = [], leaves: THREE.Vector3[] = []
    const grow = (p: THREE.Vector3, d: number, w: number) => {
      if (d === 0) { leaves.push(p.clone()); return }
      for (const s of [-1, 1]) { const q = p.clone().add(V(s * w, 0.9, 0)); pts.push(p.clone(), q); grow(q, d - 1, w / 2) }
    }
    grow(V(0, 0, 0), 4, 1.2)
    return { geo: new THREE.BufferGeometry().setFromPoints(pts), leaves }
  }, [])
  useEffect(() => () => tree.geo.dispose(), [tree])
  const susp = useRef<THREE.Mesh>(null), ring = useRef<THREE.Mesh>(null), fuse = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!shown.current?.visible) return
    const t = tt(clock), ph = nowS() - sim.anomaly
    const entry = V(12, 0.4, 5), tgt = V(6.5, 0.4, 0.5)
    let pulse = 0
    if (ph >= 0 && ph < 2.2) { susp.current!.position.lerpVectors(entry, tgt, THREE.MathUtils.smootherstep(ph / 2.2, 0, 1)); susp.current!.scale.setScalar(0.3) }
    else if (ph >= 2.2 && ph < 5) { susp.current!.position.copy(tgt); susp.current!.scale.setScalar(0.3 * (1 - (ph - 2.2) / 2.8 * 0.5)); pulse = Math.max(0, 1 - (ph - 2.2) * 2) }
    else { susp.current!.position.set(entry.x + Math.sin(t * 31) * 0.1, entry.y + Math.cos(t * 23) * 0.1, entry.z); susp.current!.scale.setScalar(0.3) } // erratic jitter at the perimeter
    ring.current!.scale.setScalar(1.2 + pulse * 0.5)
    fuse.current!.rotation.set(t * 0.6, t * 0.9, 0)
  })
  return (
    <>
      {[3, 5, 7].map((r) => <M key={r} g="torus" m="chalkFlat" rotation-x={Math.PI / 2} scale={r} />)}
      <Inst g="box" m="tang" count={48} fill={(i, o) => { const a = (i / 48) * 6.283; o.position.set(Math.cos(a) * 7, 0, Math.sin(a) * 7); o.rotation.y = -a; o.scale.set(0.06, 0.06, i % 4 ? 0.3 : 0.6) }} />
      <M g="sphere" m="chalk" scale={0.7} {...hit('ids', 'idsSanctuary')} /><M g="torus" m="tangFlat" rotation-x={Math.PI / 2} scale={1.1} />
      <Inst g="sphere" m="chalk" count={8} fill={(i, o) => { o.position.copy(rim[i]); o.scale.setScalar(0.22) }} />
      <Inst g="sphere" m="tang" count={8} anim={(i, o, _c, t) => { const p = (t * 0.4 + i / 8) % 1; o.position.lerpVectors(rim[i], V(0, 0, 0), p); o.scale.setScalar(0.09) }} />
      {/* feature columns */}
      <group position={[-5, 0, 4]}>
        <Inst g="box" m="chalk" count={11} anim={(i, o, _c, t) => { const h = 0.4 + (Math.sin(t * 1.3 + i * 1.7) * 0.5 + 0.5) * 2; o.position.set(i * 0.5, h / 2, 0); o.scale.set(0.3, h, 0.3) }} />
        <Inst g="box" m="tang" count={11} anim={(i, o, _c, t) => { const h = 0.4 + (Math.sin(t * 1.3 + i * 1.7) * 0.5 + 0.5) * 2; o.position.set(i * 0.5, h + 0.05, 0); o.scale.set(0.32, 0.1, 0.32) }} />
      </group>
      {/* rule gates */}
      {[-10.5, -9, -7.5, -6, -4.5].map((x, i) => <group key={i} position={[x, 0.8, -4]}><M g="torus" m="tangFlat" rotation-y={Math.PI / 2} scale={0.8} /></group>)}
      <Inst g="sphere" m="chalk" count={6} anim={(i, o, _c, t) => { o.position.set(-12 + ((t * 1.2 + i * 0.6) % 8), 0.8, -4); o.scale.setScalar(0.09) }} />
      {/* random-forest trees */}
      {[[-1, -6], [2, -7], [5, -6]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} scale={0.8}>
          <lineSegments geometry={tree.geo}><lineBasicMaterial color={C.chalk} /></lineSegments>
          <Inst g="sphere" m="tang" count={tree.leaves.length} fill={(k, o) => { o.position.copy(tree.leaves[k]); o.scale.setScalar(0.07) }} />
        </group>
      ))}
      <mesh ref={fuse} geometry={A.geo.ico} material={A.mat.wire} position={[0, 3, -2]} scale={0.9} {...hit('ids', 'idsSanctuary')} />
      {/* identities: verified inside, blocked outside */}
      <Inst g="sphere" m="chalk" count={6} fill={(i, o) => { o.position.copy(inner[i]); o.scale.setScalar(0.2) }} />
      <Inst g="shell" m="wire" count={3} fill={(i, o) => { o.position.set(9.5 + i * 0.8, 0.3, -3 + i * 2.2); o.scale.setScalar(0.35) }} />
      {/* containment */}
      <mesh ref={ring} geometry={A.geo.torusFat} material={A.mat.tang} position={[6.5, 0.4, 0.5]} rotation-x={Math.PI / 2} {...hit('ids', 'idsSanctuary')} />
      <mesh ref={susp} geometry={A.geo.sphere} material={A.mat.tang} />
      {/* entropy health bars */}
      <Inst g="box" m="chalk" count={5} anim={(i, o, _c, t) => { const w = 1.2 + Math.sin(t * 0.8 + i) * 0.3; o.position.set(-9.5 + w / 2, 0.15, 1 + i * 0.3); o.scale.set(w, 0.1, 0.16) }} />
    </>
  )
}

// ───────────────────────── ACT IV: mesh lab ─────────────────────────
function MeshLab() {
  const A = useA(), shown = useContext(EnvRef), rings = useRef<THREE.Group>(null), cols = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), [])
  const stream = useMemo(() => new THREE.LineCurve3(V(-10, 0.5, 4.5), V(10, 0.5, 4.5)), [])
  const cl = useMemo(() => scatter(20, 5, 0.5, 3, 1), [])
  useFrame(() => {
    if (!shown.current?.visible) return
    for (let i = 0; i < 4; i++) rings.current!.children[i].scale.setScalar((i + 1) * (0.5 + tune.reach * 0.9))
    const k = counters.get(), v = [k.sent, k.relayed, k.dedup, k.flagged], lab = nowS() - sim.lab
    v.forEach((n, i) => { const h = 0.6 + Math.log2(1 + n) * 0.35 + (lab > 0 && lab < 2 ? Math.sin(lab * 9) * 0.15 : 0); o.position.set(-9 + i * 1.1, h / 2, 2.5); o.scale.set(0.6, h, 0.6); o.updateMatrix(); cols.current!.setMatrixAt(i, o.matrix) })
    cols.current!.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <Motes n={40} m="tang" />
      <gridHelper args={[40, 40, C.onyx, '#b9b8b2']} position-y={-0.01} />
      <M g="box" m="onyx" position={[0, -0.2, 0]} scale={[14, 0.3, 6]} />
      <Inst g="box" m="tang" count={8} fill={(i, o) => { o.position.set(-6 + i * 1.7, -0.02, 2.7); o.scale.set(0.12, 0.05, 0.12) }} />
      <group ref={rings} position={[6, 0.3, -1]}>{[1, 2, 3, 4].map((r) => <M key={r} g="torus" m="onyx" rotation-x={Math.PI / 2} />)}<M g="sphere" m="tang" scale={0.25} /></group>
      <Dots curve={stream} n={14} speed={0.12} size={0.1} />
      <Inst g="box" m="onyx" count={10} fill={(i, o) => { o.position.set(-9 + i * 2, 0.5, 4.5); o.scale.set(1.5, 0.03, 0.12) }} />
      <Inst g="sphere" m="onyx" count={20} anim={(i, o, _c, t) => {
        const a = 0.2 + 1.5 * Math.exp(-Math.max(0, nowS() - sim.lab) / 2.5) * (nowS() - sim.lab > 0 ? 1 : 0)
        o.position.set(cl[i].x - 4, cl[i].y + Math.sin(t * 2 + i) * 0.15 * (1 + a), cl[i].z - 2 + Math.cos(t * 1.7 + i) * 0.15 * (1 + a)); o.scale.setScalar(0.14)
      }} />
      <Inst g="box" m="tang" count={6} colored animColor anim={(i, o, c, t) => {
        const on = ((t / 1.1) % 8) > i + 0.5
        o.position.set(1 + i * 0.7, 1, -4.5); o.scale.setScalar(on ? 0.3 : 0.18); c.set(on ? C.tang : '#8d8f94')
      }} />
      <Inst g="box" m="tang" count={4} fill={(i, o) => { o.position.set(-9 + i * 1.1, 0.1, 2.5); o.scale.set(0.62, 0.1, 0.62) }} />
      <instancedMesh ref={cols} args={[A.geo.box, A.mat.onyx, 4]} frustumCulled={false} />
      <M g="box" m="onyx" position={[2, 1.6, -7]} scale={[2.4, 1.5, 0.1]} {...hit('lab', 'meshLab')} /><M g="box" m="tang" position={[2, 2.1, -6.93]} scale={[1.6, 0.12, 0.02]} />
      <M g="box" m="onyx" position={[5.2, 1.6, -7]} scale={[2.4, 1.5, 0.1]} {...hit('lab', 'meshLab')} /><M g="box" m="chalk" position={[5.2, 1.4, -6.93]} scale={[1.6, 0.5, 0.02]} />
      <M g="box" m="onyx" position={[-3, 0.2, -6]} scale={[10, 0.05, 0.1]} />
      <Inst g="box" m="tang" count={9} fill={(i, o) => { o.position.set(-7.5 + i * 1.1, 0.35, -6); o.scale.set(0.05, 0.5, 0.05) }} />
    </>
  )
}

// ───────────────────────── ACT V: synthesis ─────────────────────────
const LAYERS: [string, ModalKey][] = [['radar', 'radar'], ['relay', 'multihop'], ['dedup', 'dedup'], ['ids', 'ids'], ['lab', 'lab']]
function Synthesis() {
  const g = useRef<THREE.Group>(null), shown = useContext(EnvRef)
  useFrame(({ clock }) => { if (shown.current?.visible) g.current!.rotation.y = tt(clock) * 0.08 })
  return (
    <>
      <group ref={g}>
        {LAYERS.map(([, k], i) => (
          <group key={k} position-y={i * 1.1}>
            <M g="cyl" m="onyx" scale={[4, 0.14, 4]} {...hit(k, 'synthesis')} />
            <M g="torus" m={i === 3 ? 'tang' : 'tangFlat'} rotation-x={Math.PI / 2} scale={4.05} />
            <M g="sphere" m="tang" position={[Math.cos(i * 1.7) * 2.4, 0.3, Math.sin(i * 1.7) * 2.4]} scale={0.2} />
          </group>
        ))}
        {[6, 7, 8, 9].map((r, i) => <M key={r} g="torus" m="onyx" rotation-x={Math.PI / 2 + i * 0.1} position-y={1 + i} scale={r} />)}
      </group>
      <group position={[-8, 0.15, 5]}>{/* 60 / 30 / 10 token bar */}
        <M g="box" m="chalk" position={[1.5, 0, 0]} scale={[3, 0.3, 0.6]} /><M g="box" m="onyx" position={[3.75, 0, 0]} scale={[1.5, 0.3, 0.6]} /><M g="box" m="tang" position={[4.75, 0, 0]} scale={[0.5, 0.3, 0.6]} />
      </group>
      <M g="plane" m="chalk" rotation-x={-Math.PI / 2} position-y={-0.1} scale={[80, 80, 1]} />
    </>
  )
}

// ───────────────────────── real-life: evening street ─────────────────────────
function Street() {
  const arcs = useMemo(() => [[-2, 1.4, -4, 1, 1.4, 2], [1, 1.4, 2, -1.5, 1.4, 8]].map(([a, b, c, d, e, f]) => new THREE.QuadraticBezierCurve3(V(a, b, c), V((a + d) / 2, b + 1.6, (c + f) / 2), V(d, e, f))), [])
  return (
    <>
      <M g="plane" m="asphalt" rotation-x={-Math.PI / 2} scale={[8, 70, 1]} />
      {[-1, 1].map((s) => <M key={s} g="box" m="sidewalk" position={[s * 5.5, 0.08, 0]} scale={[3, 0.16, 70]} />)}
      <Inst g="box" m="white" count={16} colored fill={(i, o, c) => {
        const r = rnd(i + 40), s = i % 2 ? 1 : -1; o.position.set(s * 12, 3 + r() * 3, -30 + Math.floor(i / 2) * 8); o.scale.set(6, 6 + r() * 6, 7)
        c.set(['#b5654a', '#d8c7a5', '#c9a56b', '#9aa3ad', '#a88f78'][Math.floor(r() * 5)])
      }} />
      {/* lit windows + string lights */}
      <Inst g="box" m="lampBulb" count={LOW ? 24 : 48} fill={(i, o) => { const r = rnd(i + 90), s = i % 2 ? 1 : -1; o.position.set(s * 8.98, 2 + Math.floor(r() * 4) * 1.6, -28 + Math.floor(i / 2) * 2.4 * r() * 2 + (i % 5) * 4); o.scale.set(0.05, 0.9, 0.7) }} />
      <Inst g="sphere" m="lampBulb" count={LOW ? 20 : 40} anim={(i, o, _c, t) => { const k = i / 40; o.position.set(-4.2 + k * 8.4, 4.3 - Math.sin(k * Math.PI) * 0.6 + Math.sin(t * 2 + i) * 0.02, -10 + (i % 3) * 7); o.scale.setScalar(0.07) }} />
      <Inst g="cyl" m="lampPole" count={10} fill={(i, o) => { o.position.set(i % 2 ? 4.2 : -4.2, 2.2, -16 + Math.floor(i / 2) * 7); o.scale.set(0.06, 4.4, 0.06) }} />
      <Inst g="sphere" m="lampBulb" count={10} fill={(i, o) => { o.position.set(i % 2 ? 4.2 : -4.2, 4.5, -16 + Math.floor(i / 2) * 7); o.scale.setScalar(0.28) }} />
      <Inst g="box" m="wood" count={8} fill={(i, o) => { o.position.set(i % 2 ? 6.2 : -6.2, 0.45, -12 + Math.floor(i / 2) * 7); o.scale.set(1.8, 0.9, 1.1) }} />
      <Inst g="box" m="awningRed" count={8} fill={(i, o) => { o.position.set(i % 2 ? 6.2 : -6.2, 2.3, -12 + Math.floor(i / 2) * 7); o.rotation.x = 0.15; o.scale.set(2.2, 0.08, 1.6) }} />
      <Crowd env="eveningStreet" n={LOW ? 12 : 22} seed={21} area={[-3.5, 3.5, -10, 8]} axis="z" speed={0.35} fixed={[[-2, -4], [1, 2], [-1.5, 8]]} onPhone={hit('chats', 'eveningStreet')} />
      {arcs.map((c, i) => <group key={i}><Tube curve={c} r={0.02} mat="tangFlat" /><Dots curve={c} n={3} speed={0.3} size={0.07} /></group>)}
    </>
  )
}

// ───────────────────────── real-life: field and ridge trail ─────────────────────────
function Field() {
  const arcs = useMemo(() => [[-6, 1.5, 2, -1, 1.5, 0], [-1, 1.5, 0, 4, 1.5, -3]].map(([a, b, c, d, e, f]) => new THREE.QuadraticBezierCurve3(V(a, b, c), V((a + d) / 2, b + 1.8, (c + f) / 2), V(d, e, f))), [])
  const spots = (seed: number, n: number, rMin: number, rMax: number) => { const r = rnd(seed); return Array.from({ length: n }, () => { const a = r() * 6.283, d = lerp(rMin, rMax, r()); return [Math.cos(a) * d, Math.sin(a) * d, r()] as const }) }
  const rocks = useMemo(() => spots(5, 30, 4, 28), []), trees = useMemo(() => spots(8, 40, 9, 34), [])
  const hikers: [number, number][] = [[-6, 2], [-1, 0], [4, -3], [9, -6]]
  return (
    <>
      <Motes n={30} m="chalk" />
      <M g="plane" m="grass" rotation-x={-Math.PI / 2} scale={[120, 120, 1]} />
      <M g="plane" m="trail" rotation-x={-Math.PI / 2} rotation-z={0.4} position-y={0.02} scale={[2.2, 80, 1]} />
      <Inst g="icoDetail" m="white" count={4} colored fill={(i, o, c) => { o.position.set(-30 + i * 22, 3, -45); o.scale.set(22, 9 + i * 2, 16); c.set(['#7d8a68', '#8a8579', '#76806a', '#8f8a7e'][i]) }} />
      <Inst g="ico" m="white" count={rocks.length} colored fill={(i, o, c) => { const [x, z, r] = rocks[i]; o.position.set(x, 0.3, z); o.scale.set(0.5 + r, 0.4 + r * 0.7, 0.5 + r); o.rotation.y = r * 6; c.set(['#7c7469', '#8d867a', '#6b665d'][i % 3]) }} />
      <Inst g="cyl" m="bark" count={trees.length} fill={(i, o) => { const [x, z] = trees[i]; o.position.set(x, 0.7, z); o.scale.set(0.12, 1.4, 0.12) }} />
      <Inst g="cone" m="white" count={trees.length} colored fill={(i, o, c) => { const [x, z, r] = trees[i]; o.position.set(x, 2.2, z); o.scale.set(0.9 + r * 0.4, 2.4 + r, 0.9 + r * 0.4); c.set(['#3f6b2f', '#34592a', '#4a7a35'][i % 3]) }} />
      <Inst g="cone" m="white" count={18} colored fill={(i, o, c) => { const r = rnd(i + 90); o.position.set((r() - 0.5) * 20, 0.2, (r() - 0.5) * 16); o.scale.set(0.4, 0.5, 0.4); c.set('#6f8a3a') }} />
      <Inst g="box" m="sign" count={4} fill={(i, o) => { o.position.set(-3 + i * 4.5, 0.6, 1.2 - i * 1.7); o.scale.set(0.35, 0.3, 0.05) }} />
      <Crowd env="fieldTrail" n={4} seed={31} area={[-6, 9, -6, 2]} fixed={hikers} speed={0.15} onPhone={hit('multihop', 'fieldTrail')} />
      {arcs.map((c, i) => <group key={i}><Tube curve={c} r={0.025} mat="tangFlat" /><Dots curve={c} n={3} speed={0.3} size={0.08} /></group>)}
    </>
  )
}

// ───────────────────────── driver: weights, cross-fade, fog, lights, material cloning ─────────────────────────
function Driver() {
  const clones = useRef<THREE.Material[]>([])
  const c = useMemo(() => new THREE.Color(), []), tc = useMemo(() => new THREE.Color(), []), dirC = useMemo(() => new THREE.Color(), [])
  const dir = useRef<THREE.DirectionalLight>(null), amb = useRef<THREE.AmbientLight>(null)
  const scene = useThree((s) => s.scene), gl = useThree((s) => s.gl), camera = useThree((s) => s.camera)
  // Each env gets its own material copies so one shared material can fade with exactly one env.
  useEffect(() => {
    scene.background = new THREE.Color(C.chalk); scene.fog = new THREE.Fog(C.chalk, 20, 50)
    for (const id of ENV_IDS) {
      const g = groups[id]; if (!g) continue
      const map = new Map<THREE.Material, THREE.Material>(), list: THREE.Material[] = []
      g.traverse((ob) => {
        const mesh = ob as THREE.Mesh, m = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (!m || Array.isArray(m) || m.userData.self) return
        let cl = m.userData.clone ? m : map.get(m)
        if (!cl) { cl = m.clone(); cl.userData.clone = true; cl.userData.o0 = m.opacity; cl.transparent = true; map.set(m, cl); clones.current.push(cl) }
        mesh.material = cl
        if (!list.includes(cl)) list.push(cl)
      })
      fade[id] = list; lastW[id] = -1
    }
    // precompile every env's shaders up front so scrolling never hitches on first sight of an env
    ENV_IDS.forEach((id) => { if (groups[id]) groups[id]!.visible = true })
    Promise.resolve(gl.compileAsync?.(scene, camera)).catch(() => {}).finally(() => markReady('geometry'))
    return () => { clones.current.forEach((m) => m.dispose()); scene.background = null; scene.fog = null }
  }, [scene, gl, camera])

  useFrame(({ scene: s }) => {
    envWeights(scroll.smoothProgress, EW)
    c.set(0, 0, 0); dirC.set(0, 0, 0)
    let near = 0, far = 0, dI = 0, aI = 0
    for (const id of ENV_IDS) {
      const w = EW[id], g = groups[id]
      if (g) {
        g.visible = w > 0.003
        if (g.visible && Math.abs(w - (lastW[id] ?? -1)) > 0.002) { lastW[id] = w; fade[id]?.forEach((m) => { m.opacity = m.userData.o0 * w }) }
      }
      if (w <= 0) continue
      const st = STYLE[id]
      c.r += tc.set(st.bg).r * w; c.g += tc.g * w; c.b += tc.b * w
      dirC.r += tc.set(st.dirC).r * w; dirC.g += tc.g * w; dirC.b += tc.b * w
      near += st.near * w; far += st.far * w; dI += st.dirI * w; aI += st.amb * w
    }
    if (s.background instanceof THREE.Color) s.background.copy(c)
    if (s.fog instanceof THREE.Fog) { s.fog.color.copy(c); s.fog.near = near; s.fog.far = far }
    if (dir.current) { dir.current.intensity = dI; dir.current.color.copy(dirC) }
    if (amb.current) amb.current.intensity = aI
  })
  return (<><ambientLight ref={amb} /><directionalLight ref={dir} position={[6, 12, 8]} /></>)
}

/** Adaptive DPR, tab-hidden / off-screen pause, low-power tail, first-frame marker. */
function Perf() {
  const setDpr = useThree((s) => s.setDpr), setLoop = useThree((s) => s.setFrameloop), el = useThree((s) => s.gl.domElement)
  const max = useMemo(() => Math.min(window.devicePixelRatio, 2), [])
  const st = useRef({ low: false, first: false, vis: true, inView: true })
  useEffect(() => {
    const apply = () => setLoop(st.current.vis && st.current.inView ? 'always' : 'never')
    const onVis = () => { st.current.vis = !document.hidden; apply() }
    const io = new IntersectionObserver(([e]) => { st.current.inView = e.isIntersecting; apply() })
    io.observe(el); document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [setLoop, el])
  useFrame(() => {
    if (!st.current.first) { st.current.first = true; markReady('frame') }
    const low = scroll.smoothProgress > 0.957 // scenes 68–70: calm drift, minimal GPU
    if (low !== st.current.low) { st.current.low = low; setDpr(low ? Math.min(1.25, max) : max) }
  })
  return <PerformanceMonitor onChange={({ factor }) => { if (!st.current.low) setDpr(1 + (max - 1) * factor) }} />
}

export function World70() {
  const A = useMemo(makeAssets, [])
  useEffect(() => () => { Object.values(A.geo).forEach((g) => g.dispose()); Object.values(A.mat).forEach((m) => m.dispose()) }, [A])
  return (
    <AssetCtx.Provider value={A}>
      <Driver />
      <Env id="concourse"><Concourse /></Env>
      <Env id="rfBasin"><RfBasin /></Env>
      <Env id="relayLattice"><RelayLattice /></Env>
      <Env id="idsSanctuary"><IdsSanctuary /></Env>
      <Env id="meshLab"><MeshLab /></Env>
      <Env id="synthesis"><Synthesis /></Env>
      <Env id="eveningStreet"><Street /></Env>
      <Env id="fieldTrail"><Field /></Env>
    </AssetCtx.Provider>
  )
}

export default function SceneCanvas() {
  const max = Math.min(window.devicePixelRatio, LOW ? 1.5 : 2)
  return (
    <Canvas dpr={[1, max]} camera={{ fov: 50, near: 0.1, far: 120, position: [0, 1.8, 9] }} gl={{ antialias: !LOW, powerPreference: 'high-performance' }} style={{ position: 'fixed', inset: 0 }}>
      <CameraRig />
      <World70 />
      <Perf />
    </Canvas>
  )
}

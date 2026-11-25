'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { SCENES, SCENE_COUNT } from '@/lib/scenes70'
import { scroll, view } from '@/components/scroll/scrollStore'

const damp = THREE.MathUtils.damp
const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2])

/** Samples a Catmull-Rom spline through every scene's camera pose. Mount this BEFORE World70 so it advances smoothProgress first. */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const { pos, look } = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(SCENES.map((s) => v3(s.camPos)), false, 'centripetal'),
    look: new THREE.CatmullRomCurve3(SCENES.map((s) => v3(s.lookAt)), false, 'centripetal'),
  }), [])
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), look: new THREE.Vector3(), px: 0, py: 0, init: false }), [])

  useFrame(({ pointer, clock }, dtRaw) => {
    view.cam = camera
    const dt = Math.min(dtRaw, 0.05) // avoid jumps after tab switches
    const lam = scroll.reduced ? 40 : 3.2
    scroll.smoothProgress = damp(scroll.smoothProgress, scroll.targetProgress, lam, dt)
    scroll.scrollVelocity = damp(scroll.scrollVelocity, scroll.rawVelocity, 6, dt)

    // scene i's pose sits at t = (i + .5)/70 → spline param i/69
    const u = THREE.MathUtils.clamp((scroll.smoothProgress * SCENE_COUNT - 0.5) / (SCENE_COUNT - 1), 0, 1)
    pos.getPoint(u, tmp.p)
    look.getPoint(u, tmp.l)
    if (!tmp.init) { tmp.look.copy(tmp.l); tmp.init = true }
    const ll = scroll.reduced ? 40 : 7
    tmp.look.set(damp(tmp.look.x, tmp.l.x, ll, dt), damp(tmp.look.y, tmp.l.y, ll, dt), damp(tmp.look.z, tmp.l.z, ll, dt))

    if (!scroll.reduced) {
      tmp.px = damp(tmp.px, pointer.x, 3, dt)
      tmp.py = damp(tmp.py, pointer.y, 3, dt)
      tmp.p.x += tmp.px * 0.35
      tmp.p.y += tmp.py * 0.2
      // the world never holds still: slow idle drift on top of the scroll path
      const T = clock.elapsedTime
      tmp.p.x += Math.sin(T * 0.33) * 0.22; tmp.p.y += Math.sin(T * 0.47) * 0.1
    }
    camera.position.copy(tmp.p)
    camera.lookAt(tmp.look)

    const fov = 50 + (scroll.reduced ? 0 : Math.min(1, Math.abs(scroll.scrollVelocity)) * 5)
    if (Math.abs(camera.fov - fov) > 0.02) { camera.fov = damp(camera.fov, fov, 5, dt); camera.updateProjectionMatrix() }
  })
  return null
}

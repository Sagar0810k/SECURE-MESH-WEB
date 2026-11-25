'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { SCENES, SCENE_COUNT } from '@/lib/scenes70'
import { openModal, scroll, view } from '@/components/scroll/scrollStore'

// Features (F) and security guarantees (S), pinned into the world at what the camera is looking at in that scene.
const PINS: [number, 'F' | 'S'][] = [
  [2, 'F'], [3, 'F'], [5, 'F'], [7, 'F'], [9, 'F'], [14, 'F'], [18, 'F'],
  [4, 'S'], [13, 'S'], [17, 'S'], [21, 'S'], [28, 'S'],
  [33, 'F'], [36, 'S'], [38, 'S'], [40, 'S'], [43, 'S'],
  [48, 'F'], [49, 'F'], [51, 'F'], [58, 'F'], [68, 'S'],
]
const LABEL = { F: 'FEATURE', S: 'SECURITY' }

export function WorldTags() {
  const refs = useRef<(HTMLElement | null)[]>([])
  useEffect(() => {
    const v = new THREE.Vector3(), pos = PINS.map(([id]) => new THREE.Vector3(...SCENES[id - 1].lookAt).add(new THREE.Vector3(0, 0.4, 0)))
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const cam = view.cam; if (!cam) return
      const f = scroll.smoothProgress * SCENE_COUNT
      const W = innerWidth, H = innerHeight
      PINS.forEach(([id], i) => {
        const el = refs.current[i]; if (!el) return
        const d = Math.abs(f - (id - 0.5)), a = d > 1 ? 0 : d < 0.55 ? 1 : 1 - (d - 0.55) / 0.45
        if (a <= 0.02) { if (el.style.visibility !== 'hidden') { el.style.visibility = 'hidden'; el.dataset.on = 'false' } return }
        v.copy(pos[i]).project(cam)
        if (v.z > 1) { el.style.visibility = 'hidden'; return }
        const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H
        const cx = Math.min(W - 24, Math.max(24, x)), cy = Math.min(H - 150, Math.max(130, y))
        const isL = W < 760 ? cx > W / 2 : cx > W - 330, left = isL ? 'true' : 'false'
        if (el.dataset.l !== left) el.dataset.l = left
        el.style.setProperty('--w', Math.max(140, Math.min(280, (isL ? cx : W - cx) - 44)).toFixed(0) + 'px')
        el.style.visibility = 'visible'; el.style.opacity = String(a); el.dataset.on = a > 0.6 ? 'true' : 'false'
        el.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div aria-hidden={false}>
      {PINS.map(([id, k], i) => {
        const sc = SCENES[id - 1], inner = (
          <>
            <small>{LABEL[k]} · {String(id).padStart(2, '0')}</small><b>{sc.title}</b><span className="t">{sc.detail}</span>
            {sc.modalKey && <em>Inspect →</em>}
          </>
        )
        return (
          <div key={id} ref={(e) => { refs.current[i] = e }} className="wt" data-s={k === 'S'}>
            <i className="ln" /><i className="d" />
            {sc.modalKey
              ? <button className="lb" onClick={() => openModal(sc.modalKey!)}>{inner}</button>
              : <div className="lb">{inner}</div>}
          </div>
        )
      })}
    </div>
  )
}

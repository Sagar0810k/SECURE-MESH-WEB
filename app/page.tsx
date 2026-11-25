'use client'
import dynamic from 'next/dynamic'
import { Hud70 } from '@/components/hud/Hud70'

// Canvas is client-only and loads after first paint; the HUD preloader covers it.
const SceneCanvas = dynamic(() => import('@/components/scene/World70'), { ssr: false })

export default function Page() {
  return (
    <>
      <SceneCanvas />
      <Hud70 />
      {/* scroll track: ~55vh per scene; Lenis maps it to 0..1 */}
      <main aria-label="Secure_Mesh scroll experience" style={{ height: 'calc(70 * 55vh + 100vh)' }} />
    </>
  )
}

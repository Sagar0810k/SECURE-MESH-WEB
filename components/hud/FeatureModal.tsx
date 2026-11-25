'use client'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { SCENES, type ModalKey } from '@/lib/scenes70'
import { jumpToScene, lockScroll, modalStore, openModal, runSim, type SimKind } from '@/components/scroll/scrollStore'

interface Info { title: string; kicker: string; body: string; modules: string[]; scene: number; sim?: [SimKind, string]; rows?: [string, string][]; list?: string[] }
export const MODALS: Record<ModalKey, Info> = {
  chats: { title: 'Chats that need no internet', kicker: 'Chats tab', scene: 2, modules: ['ChatsScreen.tsx', 'ChatScreen.tsx', 'kit.tsx', 'chatStore.ts'],
    body: 'Every phone in range becomes a chat, with signal bars and a hop trail. "Everyone nearby" is a public broadcast room; direct chats are end-to-end encrypted. Bubbles go from queued to on air to delivered, with the round-trip time.' },
  radar: { title: 'Nearby radar', kicker: 'Nearby tab', scene: 12, modules: ['NearbyScreen.tsx', 'Radar.tsx', 'BleRadio.ts', 'Radio.ts'],
    body: 'Phones announce their name and public key about every 25 seconds. They appear on the radar within roughly 5 to 15 seconds: closer to the centre means stronger signal, hollow rings are reached through relays. Tap a ring to chat, or Ping to measure round-trip time.' },
  framing: { title: 'Advertisements, not connections', kicker: 'Radio', scene: 14, modules: ['framing.ts', 'BleRadio.ts', 'PacketCodec.ts', 'bytes.ts'],
    body: 'Each packet is cut into frames of the form [0xB1][stream ID][index and total][data], padded to 25 bytes (stepping down to 21 or 16 if Android rejects the advert). A packet can use up to 16 frames. The receiver tolerates shuffled, repeated and lost frames, and drops incomplete streams after 20 seconds.' },
  loopback: { title: 'One node, two airs', kicker: 'Radio', scene: 16, modules: ['LoopbackRadio.ts', 'BleRadio.ts', 'Radio.ts', 'sim.ts'],
    body: 'MeshNode talks to a Radio interface. LoopbackRadio is an in-memory air used by the tests and the Lab simulator; BleRadio is the real thing. Same protocol code, both ways.' },
  crypto: { title: 'Sealed for one reader', kicker: 'Crypto and identity', scene: 4, modules: ['EncryptionService.ts', 'identity.ts', 'random.ts', 'PacketCodec.ts'],
    body: 'Direct messages use X25519 keys and an XSalsa20-Poly1305 box with a fresh 24-byte nonce and a 16-byte tamper check, via tweetnacl. Your mesh ID is the first 8 bytes of SHA-512 of your public key. Keys live in the Android Keystore. The public broadcast room is deliberately not encrypted.' },
  multihop: { title: 'Multi-hop relay', kicker: 'Mesh', scene: 24, modules: ['MeshNode.ts', 'RelayManager.ts', 'HopTrail (kit.tsx)'],
    body: 'Packets start with TTL 7. A phone that hears a packet not meant for it forwards it with TTL minus one and hops plus one, after a random 40 to 200 ms. Its own messages jump the relay queue, and sealed payloads stay sealed at every hop.', sim: ['hop', 'Send Hop'] },
  dedup: { title: 'Duplicate suppression', kicker: 'Mesh', scene: 28, modules: ['DedupCache.ts', 'RelayManager.ts'],
    body: 'With several routes, the same message arrives more than once. DedupCache remembers the last 2000 message IDs and drops repeats before they are re-broadcast, so the mesh doesn\'t flood itself.', sim: ['burst', 'Duplicate Burst'] },
  ids: { title: 'On-device intrusion detection', kicker: 'Guard tab', scene: 36, modules: ['IDSEngine.ts', 'HybridDecisionEngine.ts', 'RuleEngine.ts', 'RandomForestEngine.ts', 'FeatureExtractor.ts', 'TelemetryAggregator.ts', 'ids_model.json', 'SecurityScreen.tsx'],
    body: 'Every 60 seconds, each sender\'s telemetry becomes 11 features. A 200-tree random forest (100 trees for benign or malicious, 100 for the attack type) and five threshold rules vote; the hybrid engine returns Normal, Low, Suspicious, High or Critical and escalates persistent offenders. It targets blackhole, brute-force, flood and replay attacks, all offline, and ignores noisy-radio false alarms.', sim: ['anomaly', 'Inject IDS Anomaly'] },
  lab: { title: 'The Lab', kicker: 'Lab tab', scene: 48, modules: ['LabScreen.tsx', 'selftest.ts', 'sim.ts', 'SessionRecorder.ts'],
    body: 'Readiness checks, a two-phone live test, link tuning, counters, a raw sniffer, a nine-check self-test that needs no radio, a four-phone simulator (Asha, Bilal, Chen, Dara) and session logs you can export as JSONL or CSV.', sim: ['lab', 'Run Lab Sim'] },
  sos: { title: 'SOS', kicker: 'Chats', scene: 9, modules: ['ChatScreen.tsx', 'MeshNode.ts', 'NotificationHost.tsx', 'constants.ts'],
    body: 'SOS is its own packet type. It shows as a pulsing, outlined bubble and raises a sticky notification on phones that hear it, and it relays across the mesh like any other packet.' },
  specs: { title: 'Spec sheet', kicker: 'Facts from the repo', scene: 69, modules: ['app.json', 'package.json', 'constants.ts'],
    body: 'The numbers behind the demo.', rows: [
      ['Platform', 'Android 12 or newer (minSdk 31), arm64'],
      ['Transport', 'BLE advertisements, no connections, company ID 0xFFFF'],
      ['Advert capacity', '25 bytes, adaptive down to 21 and 16'],
      ['Packet', '35-byte header, default TTL 7, up to 16 frames'],
      ['Message size', 'About 260 bytes of text; a short message is about 4 adverts'],
      ['Encryption', 'X25519 + XSalsa20-Poly1305 (tweetnacl), fresh 24-byte nonce'],
      ['Identity', '8-byte ID from SHA-512 of your public key; keys in Android Keystore'],
      ['Dedup', 'Last 2000 message IDs'],
      ['IDS', '200 trees, 11 features, 60 s windows, 5 rules, fully offline'],
      ['Permissions', 'Bluetooth Scan, Advertise, Connect. No Location.'],
      ['Stack', 'Expo SDK 57, React Native 0.86, React 19, TypeScript, Zustand 5'],
    ] },
  limits: { title: 'Honest limits', kicker: 'Read before you rely on it', scene: 68, modules: ['app.json', 'docs/BLE TEST GUIDE.md'],
    body: 'SecureMesh is an early build. Per the project documentation:', list: [
      'Android only, Android 12 or newer. iOS cannot advertise this kind of data the same way.',
      'Installed as a custom build, not from Expo Go, because it needs a native BLE module.',
      'BLE adverts are slow by design: a short message takes a few seconds on air.',
      '"Everyone nearby" is public and not encrypted. Direct chats are sealed.',
      'Announces are not signed. A peer is trusted on first sight; forged announces that don\'t match their claimed ID are blocked.',
      'Chats live in memory; your identity persists.',
      'The simulator and tests prove protocol logic, not real-world radio range or interference.',
      'Some IDS telemetry feeds are still being wired up, so flooding is the best-exercised detection today.',
    ] },
}

export function FeatureModal() {
  const key = useSyncExternalStore(modalStore.sub, modalStore.get, modalStore.get)
  const box = useRef<HTMLDivElement>(null), closeBtn = useRef<HTMLButtonElement>(null)
  const info = key ? MODALS[key as ModalKey] : null

  useEffect(() => {
    if (!info) return
    const prev = document.activeElement as HTMLElement | null
    lockScroll(true); closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return openModal(null)
      if (e.key !== 'Tab' || !box.current) return
      const f = [...box.current.querySelectorAll<HTMLElement>('button, a[href]')]
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); lockScroll(false); prev?.focus() }
  }, [info])

  if (!info) return null
  const sc = SCENES[info.scene - 1]
  return (
    <div className="sm-scrim" onClick={() => openModal(null)}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="sm-mt" className="sm-modal" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div className="sm-kicker">{info.kicker}</div>
        <h2 id="sm-mt">{info.title}</h2>
        <p>{info.body}</p>
        {info.list && <ul className="sm-list">{info.list.map((x) => <li key={x}>{x}</li>)}</ul>}
        {info.rows && <dl className="sm-rows">{info.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        <div className="sm-chips">{info.modules.map((m) => <code key={m}>{m}</code>)}</div>
        <div className="sm-row">
          {info.sim && <button className="sm-btn sm-hot" onClick={() => { openModal(null); runSim(info.sim![0]) }}>{info.sim[1]}</button>}
          <button className="sm-btn" onClick={() => { openModal(null); jumpToScene(info.scene) }}>Go to scene {String(info.scene).padStart(2, '0')} · {sc.title}</button>
          <button ref={closeBtn} className="sm-btn sm-ghost" onClick={() => openModal(null)}>Close</button>
        </div>
      </div>
    </div>
  )
}

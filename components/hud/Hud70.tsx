'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ACT_JUMPS, SCENES, SCENE_COUNT, type ModalKey } from '@/lib/scenes70'
import { counters, initScroll, jumpToScene, markReady, openModal, readyStore, runSim, scroll, sceneStore, tune, type SimKind } from '@/components/scroll/scrollStore'
import { FeatureModal } from './FeatureModal'
import { WorldTags } from './WorldTags'
import { PhoneScreen, PHONE_CSS } from './PhoneScreen'
import { Intro } from './Intro'
import { SITE } from '@/lib/site'

const useStore = <T,>(s: { get: () => T; sub: (l: () => void) => () => void }) => useSyncExternalStore(s.sub, s.get, s.get)
const pad = (n: number) => String(n).padStart(2, '0')

// 60% Chalk White · 30% Onyx Black · 10% Tangerine Glow. Tangerine is used for fills/borders; text on it is Onyx (contrast).
const CSS = PHONE_CSS + `
:root{--chalk:#F7F6F2;--onyx:#111215;--tang:#FF6B1A;--mute:#5c5e66;--sans:var(--font-manrope,Manrope),system-ui,sans-serif;--mono:var(--font-geist-mono,'Geist Mono'),ui-monospace,monospace}
.sm-hud{position:fixed;inset:0;z-index:5;pointer-events:none;font-family:var(--sans);color:var(--onyx)}
.sm-hud button,.sm-hud input,.sm-hud .sm-card{pointer-events:auto}
.sm-card{background:rgba(247,246,242,.93);border:1px solid rgba(17,18,21,.1);border-radius:18px;padding:16px 18px;box-shadow:0 14px 34px -14px rgba(17,18,21,.4)}
.sm-top{position:absolute;top:16px;left:16px;right:16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.sm-mark{font:800 15px var(--sans);letter-spacing:.14em;background:var(--onyx);color:var(--chalk);padding:9px 14px;border-radius:12px}
.sm-mark b{color:var(--tang)}
.sm-top .sm-jumps{background:rgba(247,246,242,.93);box-shadow:0 10px 26px -14px rgba(17,18,21,.4);border-radius:14px;padding:5px;pointer-events:auto}
.sm-jumps{display:flex;gap:6px;flex-wrap:wrap}
.sm-btn{font:700 13px var(--sans);background:var(--onyx);color:var(--chalk);border:1px solid var(--onyx);border-radius:10px;padding:9px 13px;cursor:pointer;transition:transform .15s,background .15s}
.sm-btn:hover{transform:translateY(-1px)} .sm-btn:focus-visible,.sm-seg:focus-visible,.sm-hud input:focus-visible{outline:3px solid var(--tang);outline-offset:2px}
.sm-hot{background:var(--tang);color:var(--onyx);border-color:var(--onyx)}
.sm-ghost{background:var(--chalk);color:var(--onyx)}
.sm-sim{position:absolute;right:20px;bottom:22px;display:none;flex-wrap:wrap;gap:6px;align-items:center;padding:10px;border-radius:18px;max-width:min(520px,calc(100vw - 32px))}.sm-sim[data-open=true]{display:flex}
.sm-sim .sm-btn{padding:7px 12px;font-size:12px;border-radius:999px}
.sm-sim .st{display:flex;gap:10px;font:600 10px var(--mono);color:var(--mute);padding:0 6px} .sm-sim .st b{font:800 13px var(--sans);color:var(--onyx);margin-right:3px}
.sm-tune{display:flex;gap:8px;align-items:center;font:600 11px var(--mono)} .sm-tune input{accent-color:var(--tang);width:90px}
.sm-live{position:absolute;right:20px;bottom:22px;pointer-events:auto}.sm-live[aria-expanded=true]{display:none}
.sm-cta{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;width:min(640px,calc(100vw - 32px));background:var(--onyx);color:var(--chalk);border-color:var(--tang);border-width:2px;padding:28px 24px}
.sm-cta h2{margin:0 0 8px;font:800 clamp(28px,5vw,44px)/1.05 var(--sans)} .sm-cta h2 em{font-style:normal;color:var(--tang)} .sm-cta p{margin:0 0 18px;font:500 15px/1.5 var(--sans);color:#d6d4cc}
.sm-cta .sm-jumps{justify-content:center} .sm-cta .sm-btn{background:var(--chalk);color:var(--onyx)} .sm-cta .sm-hot{background:var(--tang)}
.sm-scrim{position:fixed;inset:0;z-index:20;background:rgba(17,18,21,.6);display:grid;place-items:center;padding:16px;pointer-events:auto}
.sm-modal{background:var(--chalk);color:var(--onyx);border:2px solid var(--onyx);border-radius:18px;padding:26px;width:min(620px,100%);max-height:88vh;overflow:auto;box-shadow:10px 10px 0 var(--tang)}
.sm-modal h2{margin:4px 0 10px;font:800 28px/1.1 var(--sans)} .sm-modal p{font:500 15px/1.6 var(--sans);margin:0 0 14px}
.sm-kicker{font:700 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute)} .sm-row{display:flex;gap:8px;flex-wrap:wrap}
.sm-pre{position:fixed;inset:0;z-index:50;background:var(--chalk);color:var(--onyx);display:grid;place-items:center;transition:opacity .6s ease;pointer-events:auto}
.sm-pre[data-out=true]{opacity:0;pointer-events:none}
.sm-pre .in{width:min(360px,80vw)} .sm-pre .w{font:800 28px var(--sans);letter-spacing:.14em} .sm-pre .w b{color:var(--tang)}
.sm-pre .t{height:4px;background:rgba(17,18,21,.15);margin:16px 0 8px;border-radius:4px;overflow:hidden} .sm-pre .t>div{height:100%;width:100%;background:var(--tang);transform-origin:0 50%;transition:transform .5s ease}
.sm-pre .l{font:600 11px var(--mono);color:var(--mute);display:flex;justify-content:space-between}
.sm-list{margin:0 0 14px;padding-left:18px;font:500 14px/1.55 var(--sans)}.sm-list li{margin:4px 0}
.sm-rows{margin:0 0 14px;display:grid;gap:0;font:500 13.5px/1.45 var(--sans)}.sm-rows>div{display:grid;grid-template-columns:130px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid rgba(17,18,21,.12)}.sm-rows dt{color:var(--mute);font:600 12px var(--mono)}.sm-rows dd{margin:0}
.sm-mark img{width:22px;height:22px;border-radius:6px;vertical-align:-6px;margin-right:8px}
.sm-cta .sm-btn[aria-disabled=true]{opacity:.55;cursor:not-allowed}
.sm-intro{position:fixed;inset:0;z-index:60;background:var(--chalk);transition:opacity .9s ease}.sm-intro[data-out=true]{opacity:0;pointer-events:none}.sm-intro canvas{display:block}.sm-skip{position:absolute;left:50%;bottom:22px;transform:translateX(-50%)}
.sm-note{font:500 12px/1.4 var(--sans);color:#a9a79f;margin:12px 0 0}
.sm-phone{position:absolute;right:max(24px,6vw);top:max(84px,calc(50% - 242px));display:grid;justify-items:center;gap:10px;pointer-events:none;perspective:1200px}
.sm-phone .tilt{transform:rotateY(var(--ry,0deg)) rotateX(var(--rx,0deg));transition:transform .25s linear;will-change:transform}
.sm-phone .ph{animation:smfloat 6s ease-in-out infinite;box-shadow:0 40px 60px -30px rgba(17,18,21,.55)}@keyframes smfloat{50%{transform:translateY(-8px)}}
.sm-phone figcaption{font:700 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;background:var(--chalk);border-radius:999px;padding:4px 10px;box-shadow:0 6px 16px -8px rgba(17,18,21,.5)}
.sm-sec{position:absolute;left:max(24px,4vw);top:50%;transform:translateY(-50%);width:min(410px,calc(100vw - 48px));animation:smin .6s cubic-bezier(.2,.7,.2,1)}@keyframes smin{from{opacity:0;transform:translateY(calc(-50% + 18px))}}
.sm-sec .k{font:700 11px var(--mono);letter-spacing:.14em;color:var(--mute);display:flex;gap:8px;align-items:center}.sm-sec .k i{width:8px;height:8px;border-radius:50%;background:var(--tang)}
.sm-sec h2{margin:8px 0 10px;font:800 clamp(26px,3vw,38px)/1.05 var(--sans);letter-spacing:-.02em}.sm-sec h2 em{font-style:normal;color:var(--tang)}
.sm-sec p{margin:0 0 12px;font:500 14.5px/1.55 var(--sans)}
.sm-sec ul{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:7px}.sm-sec li{font:600 13px/1.4 var(--sans);padding-left:20px;position:relative}.sm-sec li::before{content:"";position:absolute;left:2px;top:5px;width:9px;height:9px;border-radius:3px;background:var(--tang);border:1.5px solid var(--onyx)}
.sm-sec .act{display:flex;gap:8px;flex-wrap:wrap}
.sm-scrollhint{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);font:700 11px var(--mono);letter-spacing:.14em;color:var(--onyx);background:var(--chalk);border-radius:999px;padding:8px 14px;animation:smb 1.6s ease-in-out infinite}@keyframes smb{50%{transform:translate(-50%,6px)}}
@media (max-width:1100px){.sm-phone{display:none}.wt{display:none}}
@media (max-width:1100px) and (min-width:761px){.sm-sec{width:min(440px,calc(100vw - 48px))}}
.wt{position:absolute;left:0;top:0;opacity:0;visibility:hidden;will-change:transform,opacity;pointer-events:none}
.wt[data-on=true]{pointer-events:auto}
.wt .d{position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;background:var(--tang);border:3px solid var(--chalk);box-shadow:0 0 0 1px var(--onyx)}
.wt .d::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2px solid var(--tang);animation:smping 2s ease-out infinite}@keyframes smping{from{transform:scale(.4);opacity:.9}to{transform:scale(1.5);opacity:0}}
.wt .ln{position:absolute;left:0;top:0;width:34px;height:2px;background:var(--onyx);transform-origin:0 50%;transform:rotate(-32deg)}
.wt .lb{position:absolute;left:30px;top:-62px;width:var(--w,280px);text-align:left;font:inherit;color:var(--onyx);background:rgba(247,246,242,.95);border:1px solid rgba(17,18,21,.12);border-radius:14px;padding:11px 13px;box-shadow:0 14px 30px -14px rgba(17,18,21,.5);display:grid;gap:3px;cursor:default}
.wt[data-s=true] .lb{background:var(--onyx);color:var(--chalk);border-color:var(--tang)} .wt[data-s=true] .ln{background:var(--tang)}
.wt[data-l=true] .lb{left:auto;right:30px}.wt[data-l=true] .ln{transform:rotate(-148deg)}
.wt small{font:700 10px var(--mono);letter-spacing:.12em;color:var(--mute)} .wt[data-s=true] small{color:var(--tang)}
.wt b{font:800 15px/1.2 var(--sans)} .wt span.t{font:500 12.5px/1.4 var(--sans);opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.wt em{font:700 11px var(--mono);font-style:normal;color:var(--tang)} button.lb{cursor:pointer}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:1100px){.sm-top .sm-jumps:nth-child(2){display:none}}
@media (max-width:760px){
.sm-top{top:10px;left:10px;right:10px}.sm-mark{font-size:12px;padding:7px 10px}.sm-mark img{width:18px;height:18px;margin-right:6px}.sm-top .sm-btn{padding:7px 10px;font-size:12px}
.sm-live,.sm-sim{left:10px;right:auto;bottom:auto;top:54px}.sm-sim{max-width:calc(100vw - 20px)}
.sm-phone{display:grid;right:8px;top:54px;transform:scale(.46);transform-origin:top right}.sm-phone figcaption{display:none}
.sm-sec{left:10px;right:10px;top:auto;bottom:calc(14px + env(safe-area-inset-bottom));width:auto;transform:none;animation:smin2 .5s ease}@keyframes smin2{from{opacity:0;transform:translateY(16px)}}
.sm-sec h2{font-size:21px;margin:6px 0}.sm-sec p{font-size:13px;line-height:1.4;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.sm-sec ul{display:none}.sm-scrollhint{bottom:auto;top:calc(100% - 40px)}
.wt .lb{padding:9px 11px}.wt b{font-size:14px}.wt span.t{font-size:12px;-webkit-line-clamp:2}
.sm-cta{width:calc(100vw - 20px);max-height:78vh;overflow:auto;padding:20px 16px}
.sm-modal{padding:18px;border-radius:16px;box-shadow:6px 6px 0 var(--tang)}.sm-modal h2{font-size:22px}.sm-rows>div{grid-template-columns:96px 1fr}
}
@media (prefers-reduced-motion:reduce){.sm-hud *,.sm-pre,.sm-pre *{transition:none!important}}
`

function Preloader() {
  const r = useStore(readyStore), [gone, setGone] = useState(false), [minMs, setMin] = useState(false)
  const done = r.geometry && r.fonts && r.frame && minMs
  useEffect(() => { const t = setTimeout(() => setMin(true), 700); const f = setTimeout(() => { markReady('geometry'); markReady('fonts'); markReady('frame') }, 8000); return () => { clearTimeout(t); clearTimeout(f) } }, []) // failsafe: never trap the page behind the preloader
  useEffect(() => { if (!done) return; const t = setTimeout(() => setGone(true), 700); return () => clearTimeout(t) }, [done])
  if (gone) return null
  const p = (+r.geometry + +r.fonts + +r.frame) / 3
  return (
    <div className="sm-pre" data-out={done} role="status" aria-live="polite">
      <div className="in">
        <div className="w">SECURE<b>_</b>MESH</div>
        <div className="t"><div style={{ transform: `scaleX(${Math.max(0.06, p)})` }} /></div>
        <div className="l"><span>{r.geometry ? '✓' : '·'} geometry</span><span>{r.fonts ? '✓' : '·'} fonts</span><span>{r.frame ? '✓' : '·'} first frame</span></div>
      </div>
    </div>
  )
}

function Link({ href, label, hot }: { href: string; label: string; hot?: boolean }) {
  return href
    ? <a className={`sm-btn${hot ? ' sm-hot' : ''}`} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{label}</a>
    : <button className={`sm-btn${hot ? ' sm-hot' : ''}`} aria-disabled="true" onClick={(e) => e.preventDefault()}>{label}</button>
}

type Sec = { from: number; k: string; title: React.ReactNode; body: string; pts: string[]; modal?: ModalKey }
const SECS: Sec[] = [
  { from: 1, k: 'OFFLINE BLUETOOTH MESSENGER', title: <>Messages that don&apos;t need <em>a network</em>.</>, body: 'Phone-to-phone chat over Bluetooth Low Energy. No cell, no Wi-Fi, no server. Everyone in range is a chat.', pts: ['Direct messages sealed end to end', 'Relayed by the phones in between', 'Guarded by an on-device intrusion detector'] },
  { from: 4, k: 'CHAT', title: <>Write it. <em>See the cost.</em></>, body: 'The composer counts bytes live: how many adverts the message needs and about how long it takes on air. Delivery goes queued, on air, delivered, with the round-trip time.', pts: ['“Everyone nearby” is always there', 'SOS: a priority alert with a sticky notification', 'Nearby devices permission only, never Location'], modal: 'chats' },
  { from: 11, k: 'NEARBY', title: <>See who is <em>around you</em>.</>, body: 'Peers show up within about 5 to 15 seconds. Closer to the centre means stronger signal; hollow rings are reached through relays.', pts: ['Packets cut into 25-byte frames, up to 16', 'Announces about every 25 s carry name and key', 'Name, ID, hops, dBm, last seen, Message and Ping'], modal: 'radar' },
  { from: 21, k: 'RELAY', title: <>Reach people <em>out of range</em>.</>, body: 'A phone in between relays the packet. The sealed payload stays sealed at every hop: relays handle headers, not your words.', pts: ['Starts at TTL 7, lowered at each relay', 'Random 40 to 200 ms wait; your own messages go first', '2000-entry dedup cache: no broadcast storm'], modal: 'multihop' },
  { from: 33, k: 'GUARD · SECURITY', title: <>A detector that <em>never leaves</em> the phone.</>, body: 'Counters become 11 features every 60 seconds. Five rules and a 200-tree random forest fuse into a verdict from Normal to Critical.', pts: ['Flood, brute-force, blackhole, replay, poor-link rules', 'X25519 keys, XSalsa20-Poly1305, fresh 24-byte nonce', 'Forged announces and replayed packets are blocked'], modal: 'ids' },
  { from: 45, k: 'LAB', title: <>Prove it on <em>real phones</em>. Or none.</>, body: 'Readiness checks, a raw sniffer, four virtual phones, a nine-check self-test and a session recorder, all inside the app.', pts: ['Tune dwell, repeat rounds and relay TTL', 'Export labelled sessions as .jsonl or .csv', 'Two phones prove DMs; a third proves relaying'], modal: 'lab' },
  { from: 57, k: 'EVERYDAY', title: <>Built for crowds, streets and <em>trails</em>.</>, body: 'Events, markets and neighbourhoods keep talking when the network does not. Every phone relays for others and guards its own traffic.', pts: ['One TypeScript architecture: phone, simulator, tests', 'Jest covers crypto, framing, relay, replay and the IDS', 'Android 12+, early build. Read the honest limits'], modal: 'limits' },
]
const secAt = (n: number) => SECS.reduce((a, s, i) => (n >= s.from ? i : a), 0)
const PHONE_NAME = { chats: 'Chats tab', start: 'First start', chat: 'Chat', sos: 'SOS', nearby: 'Nearby tab', guard: 'Guard tab', lab: 'Lab tab' } as const
const SIMS: [SimKind, string][] = [['hop', 'Send Hop'], ['burst', 'Duplicate Burst'], ['anomaly', 'IDS Anomaly'], ['lab', 'Lab Sim']]

export function Hud70() {
  const idx = useStore(sceneStore), c = useStore(counters), root = useRef<HTMLDivElement>(null), s = SCENES[idx]
  const [reach, setReach] = useState(tune.reach)
  const [simOpen, setSimOpen] = useState(false)
  const [introN, setIntroN] = useState(0)

  useEffect(() => {
    const off = initScroll()
    document.fonts.ready.then(() => markReady('fonts'))
    let raf = 0, last = -1
    const tick = () => { const p = scroll.smoothProgress; if (Math.abs(p - last) > 0.0005) { last = p; const st = root.current?.style; st?.setProperty('--ry', (Math.sin(p * 70 * 0.55) * 16).toFixed(1) + 'deg'); st?.setProperty('--rx', (Math.cos(p * 70 * 0.4) * 4).toFixed(1) + 'deg') } raf = requestAnimationFrame(tick) } // DOM write only when changed, no React render
    raf = requestAnimationFrame(tick)
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || modalOpen()) return
      if (e.key === 'ArrowRight') jumpToScene(sceneStore.get() + 2)
      if (e.key === 'ArrowLeft') jumpToScene(sceneStore.get())
    }
    window.addEventListener('keydown', onKey)
    return () => { off(); cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) }
  }, [])

  const jumps = (
    <div className="sm-jumps" role="group" aria-label="Jump to act">
      {ACT_JUMPS.map((a) => <button key={a.scene} className={`sm-btn${ACT_JUMPS[Math.min(s.act, 4)].scene === a.scene ? ' sm-hot' : ''}`} onClick={() => jumpToScene(a.scene)}>{pad(a.scene)} · {a.label}</button>)}
    </div>
  )
  const inLab = s.envId === 'meshLab'
  return (
    <>
      <Preloader />
      <Intro force={introN} />
      <div ref={root} className="sm-hud">
        <style>{CSS}</style>
        <header className="sm-top"><div className="sm-mark"><img src="/icon.png" alt="" />SECURE<b>_</b>MESH</div>{jumps}<div className="sm-jumps"><button className="sm-btn sm-ghost" onClick={() => openModal('specs')}>Specs</button><button className="sm-btn sm-ghost" onClick={() => openModal('limits')}>Limits</button></div></header>

        <WorldTags />
        <figure className="sm-phone" aria-hidden="true"><div className="tilt"><PhoneScreen screen={s.phone} /></div><figcaption>{PHONE_NAME[s.phone]}</figcaption></figure>
        {idx < SCENE_COUNT - 1 && (() => { const sc = SECS[secAt(s.id)]; return (
          <section key={secAt(s.id)} className="sm-card sm-sec">
            <div className="k"><i />{sc.k}</div><h2>{sc.title}</h2><p>{sc.body}</p>
            <ul>{sc.pts.map((t) => <li key={t}>{t}</li>)}</ul>
            <div className="act">
              {secAt(s.id) === 0 ? <><Link href={SITE.apkUrl} label="Get the Android build" hot />{SITE.repoUrl && <Link href={SITE.repoUrl} label="View source" />}</> : sc.modal && <button className="sm-btn sm-hot" onClick={() => openModal(sc.modal!)}>Inspect</button>}
              <button className="sm-btn sm-ghost" onClick={() => openModal('specs')}>Specs</button>
            </div>
          </section>) })()}
        {idx < 2 && <div className="sm-scrollhint">SCROLL ↓</div>}
        <p className="sr" aria-live="polite">{s.title}. {s.detail}</p>
        <button className="sm-btn sm-hot sm-live" aria-expanded={simOpen} onClick={() => setSimOpen(true)}>▶ Try live</button>
        <div className="sm-card sm-sim" data-open={simOpen} role="group" aria-label="Try it live">
          {SIMS.map(([k, l]) => <button key={k} className="sm-btn" onClick={() => runSim(k)}>{l}</button>)}
          <button className="sm-btn sm-ghost" aria-label="Close" onClick={() => setSimOpen(false)}>✕</button>
          <span className="st"><span><b>{c.sent}</b>sent</span><span><b>{c.relayed}</b>relay</span><span><b>{c.dedup}</b>dedup</span><span><b>{c.flagged}</b>flag</span></span>
          {inLab && <label className="sm-tune">Reach {Math.round(reach * 100)}%<input type="range" min={0} max={1} step={0.01} value={reach} onChange={(e) => { tune.reach = +e.target.value; setReach(tune.reach) }} /></label>}
        </div>
        {idx === SCENE_COUNT - 1 && (
          <section className="sm-card sm-cta">
            <h2>Messages that don&apos;t need <em>a network</em>.</h2>
            <p>Offline phone-to-phone chat over Bluetooth Low Energy. End-to-end encrypted, relayed across the crowd, guarded by an on-device IDS. Android 12+.</p>
            <div className="sm-jumps" style={{ marginBottom: 12 }}>
              <Link href={SITE.apkUrl} label="Get the Android build" hot />
              {SITE.repoUrl && <Link href={SITE.repoUrl} label="View the source" />}
              <button className="sm-btn" onClick={() => openModal('specs')}>Specs</button>
              <button className="sm-btn" onClick={() => openModal('limits')}>Honest limits</button>
            </div>
            <div className="sm-jumps">
              {ACT_JUMPS.map((a) => <button key={a.scene} className="sm-btn" onClick={() => jumpToScene(a.scene)}>↺ {a.label}</button>)}
              <button className="sm-btn sm-hot" onClick={() => { jumpToScene(1, true); setIntroN((n) => n + 1) }}>↺ Swarm intro</button>
            </div>
            {!SITE.apkUrl && <p className="sm-note">Set apkUrl in lib/site.ts.</p>}
          </section>
        )}

      </div>
      <FeatureModal />
    </>
  )
}
const modalOpen = () => !!document.querySelector('.sm-modal')

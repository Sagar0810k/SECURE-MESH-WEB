'use client'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { PhoneKey } from '@/lib/scenes70'
import { counters, scroll } from '@/components/scroll/scrollStore'

// A DOM replica of the real app's screens (src/screens/*, theme.ts): pearl greys and graphite, one light source, no hues.
export const PHONE_CSS = `
.ph{--page:#E3E5E9;--raised:#E9EBEF;--sunken:#DADCE1;--ink:#15171B;--onink:#ECEEF1;--dim2:#9AA0AA;--t:#16181C;--t2:#454A52;--ts:#6A707A;--td:#8E949E;--hair:rgba(22,24,28,.08);
 --raise:-5px -5px 10px rgba(255,255,255,.95),6px 6px 12px rgba(163,168,178,.7);--raiseSm:-3px -3px 6px rgba(255,255,255,.95),3px 3px 7px rgba(163,168,178,.7);
 --sunk:inset 4px 4px 8px rgba(163,168,178,.7),inset -4px -4px 8px rgba(255,255,255,.95);--sunkSm:inset 2px 2px 5px rgba(163,168,178,.7),inset -2px -2px 5px rgba(255,255,255,.95);
 --inkS:-2px -2px 5px rgba(255,255,255,.1),5px 6px 11px rgba(10,11,13,.55);
 width:234px;height:484px;border-radius:34px;background:#15171B;padding:8px;box-sizing:border-box;box-shadow:0 18px 40px rgba(17,18,21,.35);pointer-events:auto;position:relative}
.ph-in{width:300px;height:620px;transform:scale(.7);transform-origin:0 0;border-radius:30px;overflow:hidden;background:var(--page);position:relative;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--t)}
.ph-box{width:218px;height:468px;overflow:hidden;border-radius:26px}
.ph-pad{padding:30px 18px 0}
.ph h1{margin:0;font-size:26px;font-weight:700;letter-spacing:-.8px}
.ph .sub{font-size:11.5px;color:var(--ts);font-weight:500;margin-top:5px;display:flex;align-items:center;gap:7px}
.ph .dot{width:8px;height:8px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 3px rgba(21,23,27,.12)}
.ph .row{background:var(--raised);box-shadow:var(--raise);border-radius:22px;padding:11px;display:flex;align-items:center;gap:11px;margin:9px 0}
.ph .av{width:40px;height:40px;border-radius:50%;background:var(--sunken);box-shadow:var(--sunkSm);display:grid;place-items:center;font-weight:700;font-size:15px;color:var(--t2);flex:none}
.ph .nm{font-size:14px;font-weight:600}.ph .ls{font-size:11.5px;color:var(--ts);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
.ph .meta{margin-left:auto;display:grid;justify-items:end;gap:5px;font-size:9px;color:var(--td)}
.ph .sig{display:flex;gap:2px;align-items:flex-end;height:11px}.ph .sig i{width:3px;background:var(--ink);border-radius:1px}.ph .sig i.o{background:rgba(22,24,28,.18)}
.ph .trail{display:flex;align-items:center;gap:2px}.ph .trail b{width:5px;height:5px;border-radius:50%;background:var(--ink)}.ph .trail b.h{background:transparent;border:1.4px solid var(--ink);box-sizing:border-box}.ph .trail u{width:6px;height:1.4px;background:var(--ink);opacity:.4}
.ph .badge{min-width:18px;height:18px;border-radius:9px;background:var(--ink);color:var(--onink);font-size:10px;font-weight:800;display:grid;place-items:center;padding:0 5px}
.ph .card{background:var(--raised);box-shadow:var(--raise);border-radius:24px;padding:14px;margin:10px 0}
.ph .card h4{margin:0 0 4px;font-size:14px;font-weight:600}.ph .card p{margin:0 0 10px;font-size:11.5px;line-height:1.45;color:var(--ts)}
.ph .btn{display:inline-block;background:var(--ink);color:var(--onink);box-shadow:var(--inkS);border-radius:16px;padding:9px 14px;font-size:12px;font-weight:700;margin-right:8px}
.ph .btn.l{background:var(--raised);color:var(--t);box-shadow:var(--raiseSm)}
.ph .lab{font-size:9px;font-weight:700;letter-spacing:1.4px;color:var(--td);text-transform:uppercase}
.ph .hd{margin:16px 0 6px}.ph .hd h3{margin:3px 0 0;font-size:16px;font-weight:600;letter-spacing:-.2px}
.ph .kv{display:flex;justify-content:space-between;font-size:11.5px;padding:6px 0;border-bottom:1px solid var(--hair);gap:10px}.ph .kv:last-child{border:0}.ph .kv span:first-child{color:var(--ts)}.ph .kv b{font-weight:600;text-align:right}
.ph .mono{font-family:ui-monospace,Menlo,monospace}
.ph .well{background:var(--sunken);box-shadow:var(--sunkSm);border-radius:16px;padding:10px 12px;font-size:11.5px;line-height:1.6}
.ph .dock{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:var(--raised);box-shadow:var(--raise);border-radius:34px;padding:5px}
.ph .dock>div{background:var(--sunken);box-shadow:var(--sunk);border-radius:29px;display:flex;position:relative;width:272px;height:42px}
.ph .dock .k{position:absolute;top:0;left:0;width:68px;height:42px;border-radius:29px;background:var(--ink);box-shadow:var(--inkS);transition:transform .35s cubic-bezier(.3,1.3,.5,1)}
.ph .dock span{width:68px;text-align:center;line-height:42px;font-size:12px;font-weight:700;color:var(--ts);position:relative}.ph .dock span.on{color:var(--onink)}
.ph .top{display:flex;align-items:center;gap:10px;padding:30px 14px 10px;border-bottom:1px solid var(--hair)}
.ph .back{width:34px;height:34px;border-radius:50%;background:var(--raised);box-shadow:var(--raiseSm);display:grid;place-items:center;font-size:14px}
.ph .msgs{padding:12px;display:flex;flex-direction:column;gap:12px}
.ph .b{max-width:84%;border-radius:20px;padding:9px 13px;font-size:13.5px;line-height:1.35;position:relative}
.ph .b.m{align-self:flex-end;background:var(--ink);color:var(--onink);box-shadow:var(--inkS);border-bottom-right-radius:6px}.ph .b.t{align-self:flex-start;background:var(--raised);box-shadow:var(--raiseSm);border-bottom-left-radius:6px}
.ph .b small{display:flex;gap:6px;justify-content:flex-end;font-size:9.5px;margin-top:5px;opacity:.75;align-items:center}
.ph .b.sos{border:2px solid var(--ink)}.ph .b.sos:before{content:'';position:absolute;inset:-5px;border-radius:24px;border:1.5px solid var(--ink);animation:phpulse 2.2s ease-out infinite}
@keyframes phpulse{from{opacity:.5;transform:scale(1)}to{opacity:0;transform:scale(1.06)}}
.ph .comp{position:absolute;left:0;right:0;bottom:0;padding:8px 12px 14px;border-top:1px solid var(--hair);background:var(--page)}
.ph .comp .cnt{font-size:9.5px;color:var(--td);margin-bottom:6px}.ph .comp .in{display:flex;gap:8px;align-items:center}.ph .comp .f{flex:1;background:var(--sunken);box-shadow:var(--sunk);border-radius:22px;padding:11px 14px;font-size:12.5px;color:var(--td)}
.ph .comp .s{width:42px;height:42px;border-radius:50%;background:var(--ink);box-shadow:var(--inkS);display:grid;place-items:center;color:var(--onink);font-size:15px}
.ph .radar{margin:14px auto 4px;width:210px;height:210px;position:relative}
.ph .sweep{transform-origin:100px 100px;animation:phsweep 4s linear infinite}@keyframes phsweep{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.ph .sweep,.ph .b.sos:before{animation:none}.ph .dock .k{transition:none}}
`

const useCounters = () => useSyncExternalStore(counters.sub, counters.get, counters.get)
function Sig({ n }: { n: number }) { return <div className="sig">{[4, 6, 8, 11].map((h, i) => <i key={i} className={i < n ? '' : 'o'} style={{ height: h }} />)}</div> }
function Trail({ relays }: { relays: number }) {
  return <div className="trail"><b />{Array.from({ length: relays }, (_, i) => <span key={i} style={{ display: 'contents' }}><u /><b className="h" /></span>)}<u /><b /></div>
}
const Row = ({ n, last, sig, relays, unread, ago, broadcast }: { n: string; last: string; sig?: number; relays?: number; unread?: number; ago?: string; broadcast?: boolean }) => (
  <div className="row">
    <div className="av">{broadcast ? '))' : n[0]}</div>
    <div><div className="nm">{n}</div><div className="ls">{last}</div></div>
    <div className="meta">{sig !== undefined && <Sig n={sig} />}{relays !== undefined && <Trail relays={relays} />}{ago && <span>{ago}</span>}{unread ? <div className="badge">{unread}</div> : null}</div>
  </div>
)
const Head = ({ eyebrow, title, note }: { eyebrow?: string; title: string; note?: string }) => (
  <div className="hd">{eyebrow && <div className="lab">{eyebrow}</div>}<h3>{title}</h3>{note && <div className="sub" style={{ marginTop: 3 }}>{note}</div>}</div>
)
const KV = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => <div className="kv"><span>{k}</span><b className={mono ? 'mono' : ''}>{v}</b></div>

const TABS = ['Chats', 'Nearby', 'Lab', 'Guard'] as const
const TAB_OF: Record<PhoneKey, number> = { chats: 0, start: 0, chat: 0, sos: 0, nearby: 1, lab: 2, guard: 3 }
const Dock = ({ at }: { at: number }) => (
  <div className="dock"><div><div className="k" style={{ transform: `translateX(${at * 68}px)` }} />{TABS.map((t, i) => <span key={t} className={i === at ? 'on' : ''}>{t}</span>)}</div></div>
)

function Radar() {
  const rings = [30, 60, 90]
  return (
    <div className="radar">
      <svg viewBox="0 0 200 200" width="210" height="210" role="img" aria-label="Radar: Bilal and Chen reached directly, Dara through relays">
        <circle cx="100" cy="100" r="96" fill="#DADCE1" />
        {rings.map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(22,24,28,.14)" />)}
        <g className="sweep"><path d="M100 100 L100 6 A94 94 0 0 1 150 19 Z" fill="rgba(21,23,27,.12)" /></g>
        <circle cx="100" cy="100" r="7" fill="#15171B" />
        <circle cx="132" cy="78" r="6" fill="#15171B" /><text x="140" y="76" fontSize="9" fill="#454A52">Bilal</text>
        <circle cx="62" cy="140" r="6" fill="#15171B" /><text x="30" y="156" fontSize="9" fill="#454A52">Chen</text>
        <circle cx="44" cy="52" r="6" fill="none" stroke="#15171B" strokeWidth="1.6" /><text x="52" y="50" fontSize="9" fill="#454A52">Dara</text>
      </svg>
    </div>
  )
}

function useStep(on: boolean) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!on) return
    if (scroll.reduced) { setN(3); return }
    const t = setInterval(() => setN((x) => (x + 1) % 5), 1300)
    return () => clearInterval(t)
  }, [on])
  return n
}

export function PhoneScreen({ screen }: { screen: PhoneKey }) {
  const c = useCounters()
  const step = useStep(screen === 'chat' || screen === 'sos')
  const status = step < 1 ? 'queued…' : step < 2 ? 'on air' : 'delivered · 3.2s'
  const at = TAB_OF[screen]
  let body: ReactNode
  if (screen === 'chats' || screen === 'start') {
    const on = screen === 'chats'
    body = (
      <div className="ph-pad">
        <h1>SecureMesh</h1>
        <div className="sub"><span className="dot" style={on ? undefined : { background: 'transparent', border: '1.5px solid var(--ink)', boxSizing: 'border-box' }} />{on ? 'Mesh radio on · 3 devices known' : 'Mesh radio is off'}</div>
        {!on && <div className="card" style={{ boxShadow: 'var(--sunk)', background: 'var(--sunken)' }}><h4>Nobody can reach you yet</h4><p>Messages travel phone-to-phone over Bluetooth, so the radio has to be on. No internet needed.</p><span className="btn">Start mesh</span><span className="btn l">Open Lab</span></div>}
        <Row n="Everyone nearby" broadcast last="Public. Everyone in range can read this" />
        {on && <>
          <Row n="Asha" last="You: East gate, near the kiosk" sig={3} relays={1} ago="4s" />
          <Row n="Bilal" last="End-to-end encrypted · tap to write" sig={4} relays={0} ago="9s" />
          <Row n="Chen" last="Reached the platform" relays={2} unread={2} ago="21s" />
        </>}
      </div>
    )
  } else if (screen === 'chat' || screen === 'sos') {
    body = (
      <>
        <div className="top"><div className="back">‹</div><div><div className="nm" style={{ fontSize: 16 }}>{screen === 'sos' ? 'Everyone nearby' : 'Asha'}</div>
          <div className="ls" style={{ maxWidth: 190 }}>{screen === 'sos' ? 'Public broadcast · not encrypted' : 'end-to-end encrypted · 2 hops away'}</div></div></div>
        <div className="msgs">
          {screen === 'chat' && <>
            <div className="b t">Which gate are you at?<small><Trail relays={1} /> 14:02 · 2 hops · sealed</small></div>
            <div className="b m">East gate, near the kiosk<small>14:03 · sealed <b>{status}</b></small></div>
          </>}
          {screen === 'sos' && <>
            <div className="b t">Anyone near platform 3?<small>14:05 · public</small></div>
            <div className="b m sos"><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 3 }}>⚠ SOS</div>Need help near platform 3<small>14:06 · public <b>{status}</b></small></div>
          </>}
        </div>
        <div className="comp"><div className="cnt">{screen === 'sos' ? 'SOS is a priority alert' : '24/260 bytes · ≈4 adverts · ~4.0s on air'}</div><div className="in"><div className="f">{screen === 'sos' ? 'Broadcast to everyone nearby' : 'Message Asha'}</div><div className="s">➤</div></div></div>
      </>
    )
  } else if (screen === 'nearby') {
    body = (
      <div className="ph-pad">
        <h1>Nearby</h1><div className="sub" style={{ lineHeight: 1.4 }}>Closer to the centre means stronger signal. Hollow rings are reached through relays.</div>
        <Radar />
        <Head title="Devices" />
        <div className="card" style={{ margin: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div className="nm" style={{ fontSize: 15 }}>Bilal</div><div className="mono" style={{ fontSize: 9.5, color: 'var(--td)' }}>9f2c41aa07d3e8b1</div></div><div className="meta"><Sig n={3} /><Trail relays={0} /></div></div>
          <p style={{ marginTop: 8, marginBottom: 8 }}>1 hop · -62 dBm · seen 4s ago</p><span className="btn">Message</span><span className="btn l">Ping</span></div>
      </div>
    )
  } else if (screen === 'guard') {
    body = (
      <div className="ph-pad" style={{ paddingBottom: 90 }}>
        <h1>Guard</h1><div className="sub">Who you are on the mesh, and what the mesh has thrown at you.</div>
        <Head eyebrow="Intrusion detection" title="ML Defense Engine" />
        <div className="card" style={{ margin: 0 }}>
          <KV k="Status" v="Active (Monitoring)" /><KV k="Pipeline" v="Offline Random Forest + Rules" /><KV k="Protected" v="Blackhole, Brute-Force, Flood, Replay" /><KV k="Detections logged" v={String(c.flagged)} />
        </div>
        {c.flagged > 0 && <div style={{ background: 'var(--ink)', color: 'var(--onink)', boxShadow: 'var(--inkS)', borderRadius: 22, padding: 13, margin: '12px 0' }}>
          <div className="lab" style={{ color: 'var(--dim2)' }}>Critical threat · now</div><div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Unknown node (c41f09…)</div>
          <div style={{ fontSize: 11.5, color: 'var(--dim2)', marginTop: 2 }}>Attack: flood · 97.8% ML confidence</div><div style={{ fontSize: 11, color: 'var(--dim2)', marginTop: 6 }}>• 142 messages per minute</div></div>}
        <Head eyebrow="Identity" title="Your identity" />
        <div className="well mono">a1f3 09bc 77de 42a0<br />5e18 c3d9 0b6f 1127</div>
        <Head eyebrow="Defence" title="What was blocked" />
        <div className="card" style={{ margin: 0 }}><KV k="Forged announces" v="0" /><KV k="Flood rate-limited" v={String(c.flagged * 38)} /><KV k="Duplicates dropped (normal)" v={String(c.dedup)} /></div>
      </div>
    )
  } else {
    body = (
      <div className="ph-pad" style={{ paddingBottom: 90 }}>
        <h1>Lab</h1><div className="sub" style={{ lineHeight: 1.4 }}>Everything you need to prove BLE send and receive works.</div>
        <Head eyebrow="01 · Setup" title="Readiness" />
        <div className="card" style={{ margin: 0 }}>{['Native BLE module', 'Bluetooth permissions', 'Bluetooth adapter', 'Mesh radio', 'Scanner'].map((k) => <KV key={k} k={k} v="✓" />)}</div>
        <Head eyebrow="04 · Numbers" title="Counters" />
        <div className="card" style={{ margin: 0 }}><KV k="Packets sent" v={String(c.sent)} /><KV k="Relayed" v={String(c.relayed)} /><KV k="Duplicates dropped" v={String(c.dedup)} /><KV k="Simulator runs" v={String(c.labRuns)} /></div>
        <Head title="Mesh simulator · 4 virtual phones" note="Asha can only hear Bilal. Dara is three hops away." />
        <div className="well" style={{ textAlign: 'center', fontWeight: 600 }}>Asha ─ Bilal ─ Chen ─ Dara</div>
      </div>
    )
  }
  return (
    <div className="ph" aria-hidden="true">
      <div className="ph-box"><div className="ph-in">{body}<Dock at={at} /></div></div>
    </div>
  )
}

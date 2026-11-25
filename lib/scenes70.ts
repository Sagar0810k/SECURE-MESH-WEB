import * as THREE from 'three'

export type EnvId =
  | 'concourse' | 'rfBasin' | 'relayLattice' | 'idsSanctuary'
  | 'meshLab' | 'synthesis' | 'eveningStreet' | 'fieldTrail'

export type MoveType =
  | 'zoomIn' | 'zoomPan' | 'sweepLeft' | 'sweepRight' | 'liftUp' | 'dropDown' | 'orbit' | 'pullBack'
  | 'tiltZoom' | 'topTilt' | 'push' | 'zoomHold' | 'split' | 'dive' | 'liftSweep' | 'tiltSweep'
  | 'zoomOrbit' | 'pullLift' | 'liftTilt' | 'coaxial' | 'slowOrbit' | 'gentleZoom' | 'cta' | 'descend'

export type ModalKey =
  | 'chats' | 'radar' | 'framing' | 'loopback' | 'crypto' | 'multihop' | 'dedup' | 'ids' | 'lab'
  | 'sos' | 'specs' | 'limits'

/** Which real app screen the phone mockup shows. */
export type PhoneKey = 'chats' | 'start' | 'chat' | 'sos' | 'nearby' | 'guard' | 'lab'

export interface Scene70Config {
  id: number // 1..70
  tStart: number
  tEnd: number
  act: 0 | 1 | 2 | 3 | 4 | 5
  moveType: MoveType
  camPos: [number, number, number]
  lookAt: [number, number, number]
  envId: EnvId
  envFade: boolean // true → cross-fade from previous env during the first part of this scene
  moduleRef: string[] // real files in the Secure_Mesh repo
  title: string
  detail: string
  modalKey?: ModalKey
  phone: PhoneKey // app screen shown in the phone mockup (forward-filled)
}

export const SCENE_COUNT = 70
export const ACTS = ['Prologue', 'Act I · Nearby', 'Act II · Relay', 'Act III · Guard', 'Act IV · Lab', 'Act V · Everyday'] as const
export const ACT_JUMPS = [
  { scene: 1, label: 'Chats' }, { scene: 11, label: 'Nearby' }, { scene: 21, label: 'Relay' },
  { scene: 33, label: 'Guard' }, { scene: 45, label: 'Lab' },
] as const

// [title, move, moduleRef (comma list of real files), detail, modalKey?, fade?, phone?]
type Row = [string, MoveType, string, string, ModalKey?, boolean?, PhoneKey?]
const T = true
const U = undefined
const ROWS: Row[] = [
  // PROLOGUE 1–10 · concourse (people using it)
  ['No signal, still talking', 'zoomPan', 'ChatsScreen.tsx', 'No cell, no Wi-Fi, no server. SecureMesh passes messages phone to phone over Bluetooth Low Energy.', U, U, 'chats'],
  ['Everyone in range is a chat', 'sweepLeft', 'ChatsScreen.tsx, kit.tsx', 'Nearby phones appear as chats with signal bars and a hop trail. "Everyone nearby" is always there.', 'chats', U, 'chats'],
  ['Write it, see the cost', 'zoomIn', 'ChatScreen.tsx', 'The composer counts bytes live: how many adverts the message needs and about how long it takes on air.', 'chats', U, 'chat'],
  ['Sealed before it leaves', 'liftUp', 'EncryptionService.ts, PacketCodec.ts', 'Direct messages are sealed with the recipient\'s public key, then packed behind a 35-byte header.', 'crypto', U, 'chat'],
  ['Hop by hop', 'sweepRight', 'RelayManager.ts, MeshNode.ts', 'No line of sight? A phone in between relays the packet onward.', 'multihop', U, 'chat'],
  ['Delivered, with proof', 'orbit', 'ChatScreen.tsx, chatStore.ts', 'The sender watches queued, on air, delivered, with the round-trip time once the ACK returns.', U, U, 'chat'],
  ['The Nearby tab', 'sweepLeft', 'NearbyScreen.tsx, Radar.tsx', 'Closer to the centre means stronger signal. Hollow rings are reached through relays.', 'radar', U, 'nearby'],
  ['Start the mesh', 'tiltZoom', 'ChatsScreen.tsx, runtime/mesh.ts', 'One tap turns on scanning and advertising. Android asks for Nearby devices only, never Location.', U, U, 'start'],
  ['SOS to everyone', 'pullLift', 'ChatScreen.tsx, NotificationHost.tsx', 'SOS is a priority alert: a pulsing bubble, and a sticky notification on phones that hear it.', 'sos', U, 'sos'],
  ['Into the mesh', 'dive', 'BleRadio.ts, Radio.ts', 'Behind the screen is the real mechanism: Bluetooth advertisements, not connections.'],
  // ACT I 11–20 · rfBasin (Nearby)
  ['People become nodes', 'orbit', 'MeshNode.ts, runtime/mesh.ts', 'Each phone is a MeshNode with its own keys. The runtime boots it, loads identity and starts the radio.', U, T, 'nearby'],
  ['Discovery radar', 'topTilt', 'Radar.tsx, NearbyScreen.tsx', 'Peers show up within about 5 to 15 seconds. Tap one to open a chat.', 'radar'],
  ['Announces', 'sweepLeft', 'MeshNode.ts, BleRadio.ts', 'About every 25 seconds a phone announces its name and public key. A key that doesn\'t match its claimed ID is dropped as forged.', 'radar'],
  ['Adverts, not connections', 'zoomIn', 'framing.ts, bytes.ts', 'Packets are cut into 25-byte frames: magic byte, stream ID, index and total, then data. Up to 16 frames.', 'framing'],
  ['Device cards', 'sweepRight', 'NearbyScreen.tsx, kit.tsx', 'Name, ID, hop count, dBm and last-seen, plus one-tap Message and Ping.', 'radar', U, 'nearby'],
  ['Same code, two airs', 'split', 'LoopbackRadio.ts, BleRadio.ts', 'The same MeshNode runs on an in-memory air in tests and on real BLE on the phone.', 'loopback'],
  ['Edge of range', 'sweepLeft', 'kit.tsx, BleRadio.ts', 'As signal fades the bars drop and the link flickers. BLE adverts are lossy, so each one is repeated.'],
  ['Identity is a hash', 'orbit', 'identity.ts, SecurityScreen.tsx', 'Your mesh ID is a truncated SHA-512 of your public key, not your MAC address or phone number.', 'crypto', U, 'guard'],
  ['Link tuning', 'dropDown', 'LabScreen.tsx', 'Dwell per advert, repeat rounds and relay TTL are adjustable for the environment you are in.', 'lab', U, 'lab'],
  ['A connected cluster', 'sweepRight', 'MeshNode.ts', 'More phones, more possible paths between any two of them.'],
  // ACT II 21–32 · relayLattice (Relay)
  ['Sealed for one reader', 'zoomIn', 'EncryptionService.ts, identity.ts', 'X25519 keys and a fresh 24-byte nonce per message. XSalsa20-Poly1305 adds a 16-byte tamper check.', 'crypto', T, 'chat'],
  ['Honest randomness', 'sweepLeft', 'random.ts, SecurityScreen.tsx', 'Keys need a secure random source. Guard warns you if the phone\'s runtime doesn\'t have one.', 'crypto', U, 'guard'],
  ['Out of range', 'pullBack', 'RelayManager.ts', 'In the Lab simulator Asha only hears Bilal. Dara is three hops away.', 'multihop'],
  ['Hop 1', 'sweepRight', 'MeshNode.ts', 'A packet starts with TTL 7. Each relay lowers it and raises the hop count.', 'multihop'],
  ['Queue and jitter', 'zoomIn', 'RelayManager.ts', 'Relays wait a random 40 to 200 ms, and a phone\'s own messages jump ahead of relay jobs.', 'multihop'],
  ['Across the lattice', 'liftSweep', 'MeshNode.ts', 'The sealed payload stays sealed at every hop. Relays handle headers, not your words.', 'multihop'],
  ['A second copy', 'sweepLeft', 'DedupCache.ts', 'Two routes means the same 8-byte message ID arrives twice.'],
  ['Duplicate dropped', 'zoomHold', 'DedupCache.ts', 'A 2000-entry cache of message IDs drops repeats before they are re-broadcast.', 'dedup'],
  ['No broadcast storm', 'pullBack', 'DedupCache.ts, MeshNode.ts', 'Dedup and TTL together keep flooding bounded.', 'dedup'],
  ['Phones move', 'sweepRight', 'MeshNode.ts', 'Announces keep the peer table fresh as people walk in and out of range.'],
  ['The ACK returns', 'liftUp', 'chatStore.ts, ChatScreen.tsx', 'The recipient sends an ACK back through the mesh and the bubble flips to delivered.', U, U, 'chat'],
  ['The whole route', 'orbit', 'kit.tsx', 'The hop trail on each message shows how many relays carried it.', 'multihop'],
  // ACT III 33–44 · idsSanctuary (Guard)
  ['The Guard tab', 'push', 'SecurityScreen.tsx', 'Your identity, the ML defence engine, what was blocked, and a live events log.', 'ids', T, 'guard'],
  ['Telemetry', 'sweepLeft', 'TelemetryAggregator.ts', 'Per-sender sliding-window counters: packet rates, hop counts and signal strength samples.', 'ids'],
  ['Eleven features', 'sweepRight', 'FeatureExtractor.ts', 'Every 60 seconds each sender\'s counters become 11 normalised features.', 'ids'],
  ['A suspicious burst', 'zoomIn', 'RuleEngine.ts', 'Flooding stands out: a message rate above 60 per minute from one sender.', 'ids'],
  ['Five rules', 'sweepLeft', 'RuleEngine.ts', 'Flood, brute-force pairing, blackhole, replay and poor-link rules, each with evidence.', 'ids'],
  ['Random forest', 'liftUp', 'RandomForestEngine.ts, ids_model.json', '200 trees: 100 decide benign or malicious, 100 name the attack. All of it runs on the phone.', 'ids'],
  ['Hybrid verdict', 'zoomOrbit', 'HybridDecisionEngine.ts, IDSEngine.ts', 'Model score and rules fuse into Normal, Low, Suspicious, High or Critical. Persistence escalates.', 'ids'],
  ['Detections', 'sweepRight', 'SecurityScreen.tsx', 'Each detection lists attack type, ML confidence and evidence. High and Critical raise an alert.', 'ids', U, 'guard'],
  ['Bad radio is not an attack', 'sweepLeft', 'HybridDecisionEngine.ts', 'Noisy links with drops are suppressed unless the model is at least 70% sure.', 'ids'],
  ['What was blocked', 'pullBack', 'MeshNode.ts, SecurityScreen.tsx', 'Failed authentication, forged announces, stale or replayed packets, rate-limited floods.', U, U, 'guard'],
  ['Your identity, your call', 'orbit', 'identity.ts, SecurityScreen.tsx', 'Rename yourself, or reset to a brand-new keypair at any time.', U, U, 'guard'],
  ['Into the lab', 'push', 'LabScreen.tsx', 'Next: the tools for proving it works on real phones, and without any.'],
  // ACT IV 45–56 · meshLab (Lab)
  ['Readiness', 'descend', 'LabScreen.tsx', 'Native BLE module, permissions, adapter, radio and scanner, checked top to bottom.', 'lab', T, 'lab'],
  ['Tune the link', 'sweepRight', 'LabScreen.tsx', 'Dwell 100 to 1000 ms, 1 to 6 repeat rounds, relay TTL 1 to 10.', 'lab'],
  ['Raw sniffer', 'sweepLeft', 'LabScreen.tsx, BleRadio.ts', 'See every company-ID 0xFFFF advert the scanner hears, before any decoding.', 'lab'],
  ['Four virtual phones', 'orbit', 'sim.ts, LoopbackRadio.ts', 'Asha, Bilal, Chen and Dara in a line. Cut a link, add packet loss, send a DM across the chain.', 'lab'],
  ['Self-test', 'zoomIn', 'selftest.ts', 'Nine checks, no radio needed: random source, seal and tamper, codec, relay, forged announce and the 200-tree model.', 'lab'],
  ['Counters', 'liftUp', 'LabScreen.tsx, MeshNode.ts', 'Adverts sent and heard, relays, duplicates, decrypt failures, floods and more.', 'lab'],
  ['Live test', 'sweepRight', 'LabScreen.tsx', 'Announce, Ping all, Broadcast test, Stress x10, SOS.', 'lab'],
  ['Session recorder', 'sweepLeft', 'SessionRecorder.ts', 'Pick a label first (normal, flooding, replay, forged and more), then export .jsonl or .csv.', 'lab'],
  ['Logs feed the model', 'pullBack', 'SessionRecorder.ts, ids_model.json', 'Labelled sessions become the dataset for retraining the IDS model offline.'],
  ['Every packet, a verdict', 'tiltSweep', 'LabScreen.tsx', 'The live log marks each packet ok, dup, stale, flood, forged or decrypt_fail.'],
  ['Two phones, then three', 'liftUp', 'LabScreen.tsx', 'Two phones prove DMs. A third, out of range of the first, proves relaying.'],
  ['The rig', 'orbit', 'LabScreen.tsx', 'Diagnostics, simulator and logs, all inside the app itself.'],
  // ACT V 57–70
  ['One architecture', 'coaxial', 'runtime/mesh.ts, MeshNode.ts, IDSEngine.ts', 'Everything under runtime/ is plain TypeScript, so one MeshNode runs on the phone, in the simulator and in tests.', U, T],
  ['Tested', 'sweepRight', 'mesh.test.ts, crypto.test.ts, framing.test.ts, security.test.ts, node.test.ts', 'Jest covers crypto, framing, relay, replay protection and the IDS. Real radio range is tested on phones.'],
  ['Soft UI, no hues', 'sweepLeft', 'theme.ts, kit.tsx', 'Pearl greys and graphite, depth from one light source, and it respects Reduce Motion.', U, U, 'chats'],
  ['An evening street', 'pullLift', 'ChatsScreen.tsx', 'A street fair, patchy signal, and neighbours still reach each other.', U, T],
  ['When coverage drops', 'sweepRight', 'ChatScreen.tsx', 'Events, markets and neighbourhoods keep talking when the network doesn\'t.'],
  ['The trail', 'sweepLeft', 'RelayManager.ts', 'Hikers spread past one hop. Every phone in between relays for the group.', U, T],
  ['Every phone relays', 'orbit', 'MeshNode.ts, IDSEngine.ts', 'Each device forwards for others and guards its own traffic.'],
  ['The whole journey', 'pullBack', 'MeshNode.ts', 'From a tap in a crowd to relays, guard and lab, one continuous path.', U, T],
  ['Waypoints', 'liftTilt', 'MainScreen.tsx', 'Four tabs: Chats, Nearby, Lab, Guard.', U, U, 'chats'],
  ['Try it yourself', 'sweepRight', 'ChatsScreen.tsx, NearbyScreen.tsx, SecurityScreen.tsx, LabScreen.tsx', 'Open any feature from the cards, or fire a live simulation.', 'chats'],
  ['Replay anything', 'sweepLeft', 'sim.ts', 'Scrub back, rewatch a move, or run the simulations again.'],
  ['Honest limits', 'slowOrbit', 'app.json', 'Android 12 or newer, arm64. Early build. Read what it does and doesn\'t do yet.', 'limits'],
  ['Spec sheet', 'gentleZoom', 'package.json', 'Expo SDK 57, React Native 0.86, TypeScript, tweetnacl, Zustand.', 'specs'],
  ['Start anywhere', 'cta', 'MainScreen.tsx', 'Jump to any act and run it again.'],
]
if (ROWS.length !== SCENE_COUNT) throw new Error(`scenes70: expected 70 rows, got ${ROWS.length}`)

const envOf = (n: number): EnvId =>
  n <= 10 ? 'concourse' : n <= 20 ? 'rfBasin' : n <= 32 ? 'relayLattice' : n <= 44 ? 'idsSanctuary'
  : n <= 56 ? 'meshLab' : n <= 59 ? 'synthesis' : n <= 61 ? 'eveningStreet' : n <= 63 ? 'fieldTrail' : 'synthesis'
const actOf = (n: number) => (n <= 10 ? 0 : n <= 20 ? 1 : n <= 32 ? 2 : n <= 44 ? 3 : n <= 56 ? 4 : 5) as Scene70Config['act']

// Per-env home camera + focus (all envs share world origin and cross-fade in place).
const HOME: Record<EnvId, [[number, number, number], [number, number, number]]> = {
  concourse: [[0, 2, 10.5], [0, 1.2, 0]],
  rfBasin: [[0, 4, 10], [0, 0, 0]],
  relayLattice: [[0, 3, 11], [0, 0.5, 0]],
  idsSanctuary: [[0, 3.5, 10], [0, 0.5, 0]],
  meshLab: [[0, 4, 10], [0, 0, 0]],
  synthesis: [[0, 4, 13], [0, 1, 0]],
  eveningStreet: [[0, 2, 9], [0, 1.2, 0]],
  fieldTrail: [[0, 2.5, 10], [0, 1, 0]],
}

// Camera motion per move, applied to the previous scene's pose. The Catmull-Rom spline in CameraRig
// passes through these poses, so each move is a real directional glide rather than a jump.
interface Step { zoom?: number; dx?: number; dy?: number; dz?: number; orbit?: number; fy?: number }
const MOVES: Record<MoveType, Step> = {
  zoomIn: { zoom: 0.8 }, zoomPan: { zoom: 0.85, dx: 0.6 }, sweepLeft: { dx: -2.4 }, sweepRight: { dx: 2.4 },
  liftUp: { dy: 1.7, fy: 0.5 }, dropDown: { dy: -1.5 }, orbit: { orbit: 0.5 }, pullBack: { zoom: 1.28 },
  tiltZoom: { zoom: 0.85, dy: 1.1, fy: -0.8 }, topTilt: { dy: 3, fy: -0.4 }, push: { dz: -3.2 },
  zoomHold: { zoom: 0.72 }, split: { dx: 1.8 }, dive: { dz: -5, zoom: 0.9 }, liftSweep: { dy: 1.4, dx: 2 },
  tiltSweep: { dy: 0.9, fy: -0.5, dx: 2 }, zoomOrbit: { zoom: 0.85, orbit: 0.4 }, pullLift: { zoom: 1.15, dy: 1 },
  liftTilt: { dy: 1, fy: -0.4 }, coaxial: { dz: -1 }, slowOrbit: { orbit: 0.18 }, gentleZoom: { zoom: 0.93 },
  cta: { zoom: 1.02 }, descend: { dy: -1.8, fy: -0.3 },
}

function build(): Scene70Config[] {
  const p = new THREE.Vector3(), f = new THREE.Vector3(), rel = new THREE.Vector3()
  const out: Scene70Config[] = []
  let phone: PhoneKey = 'chats'
  ROWS.forEach(([title, moveType, refs, detail, modalKey, fade, ph], i) => {
    if (ph) phone = ph
    const n = i + 1, envId = envOf(n)
    const [H, F] = HOME[envId]
    const hp = new THREE.Vector3(...H), hf = new THREE.Vector3(...F)
    if (i === 0 || envOf(n - 1) !== envId) { p.copy(hp); f.copy(hf) }
    else { p.lerp(hp, 0.1); f.lerp(hf, 0.12) }
    const s = MOVES[moveType]
    rel.copy(p).sub(f).applyAxisAngle(new THREE.Vector3(0, 1, 0), (s.orbit ?? 0) * (n % 2 ? 1 : -1)).multiplyScalar(s.zoom ?? 1)
    const len = THREE.MathUtils.clamp(rel.length(), 3.5, 16)
    rel.setLength(len)
    f.add(new THREE.Vector3((s.dx ?? 0) * 0.6, (s.dy ?? 0) * 0.4 + (s.fy ?? 0), (s.dz ?? 0) * 0.8))
    p.copy(f).add(rel).add(new THREE.Vector3(s.dx ?? 0, s.dy ?? 0, s.dz ?? 0))
    out.push({
      id: n, tStart: i / SCENE_COUNT, tEnd: n / SCENE_COUNT, act: actOf(n), moveType,
      camPos: [p.x, p.y, p.z], lookAt: [f.x, f.y, f.z], envId, envFade: !!fade,
      moduleRef: refs.split(', '), title, detail, modalKey, phone,
    })
  })
  return out
}

export const SCENES: Scene70Config[] = build()
export const sceneIndexAt = (t: number) => Math.min(SCENE_COUNT - 1, Math.max(0, Math.floor(t * SCENE_COUNT)))

const sm = (u: number) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x) }

/** Env cross-fade weights at progress t. Fade scenes blend previous → current over the first 70% of the scene. */
export function envWeights(t: number, into: Record<EnvId, number>) {
  for (const k in into) into[k as EnvId] = 0
  const i = sceneIndexAt(t), u = t * SCENE_COUNT - i, s = SCENES[i]
  if (s.envFade && i > 0) {
    const w = sm(u / 0.7)
    into[s.envId] += w
    into[SCENES[i - 1].envId] += 1 - w
  } else into[s.envId] = 1
  return into
}

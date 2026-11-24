export type MoveType =
  | "zoom-in"
  | "sweep-left"
  | "sweep-right"
  | "orbit"
  | "lift-up"
  | "pull-back"
  | "tilt-zoom"
  | "drop-down"
  | "forward-zoom"
  | "sweep"
  | "push-forward"
  | "coaxial"
  | "forward"
  | "orbit-soft";

export interface Scene70Config {
  id: number;
  tStart: number;
  tEnd: number;
  moveType: MoveType;
  camPos: [number, number, number];
  camPos2: [number, number, number];
  lookAt: [number, number, number];
  envId: string;
  title: string;
  detail: string;
  modalKey?: string;
}

export const SCENES70: Scene70Config[] = [
  {
    id: 1,
    tStart: 0.0,
    tEnd: 0.014285714285714287,
    moveType: "zoom-in",
    camPos: [0, 0, -30],
    camPos2: [0, 0, -60],
    lookAt: [0, 0, 0],
    envId: "concourse",
    title: "Scene 01 — Concourse Zoom",
    detail: "Sunlit concourse, dead zone, traveller raises Secure_Mesh phone.",
  },
  {
    id: 2,
    tStart: 0.014285714285714287,
    tEnd: 0.02857142857142857,
    moveType: "sweep-left",
    camPos: [30, 0, -30],
    camPos2: [-30, 0, -30],
    lookAt: [0, 0, 0],
    envId: "concourse",
    title: "Scene 02 — Bench Sweep",
    detail: "Seated commuter on wooden bench, chat screen, BLE arc to friend.",
  },
  {
    id: 3,
    tStart: 0.02857142857142857,
    tEnd: 0.04285714285714286,
    moveType: "zoom-in",
    camPos: [0, 0, -30],
    camPos2: [0, 0, -60],
    lookAt: [0, 0, 0],
    envId: "concourse",
    title: "Scene 03 — Composer Zoom",
    detail: "Zoom into Composer.ts typing an offline check-in.",
  },
  {
    id: 4,
    tStart: 0.04285714285714286,
    tEnd: 0.05714285714285714,
    moveType: "lift-up",
    camPos: [0, 0, -30],
    camPos2: [0, 20, -30],
    lookAt: [0, 0, 0],
    envId: "concourse",
    title: "Scene 04 — Packet Lift",
    detail: "Lift up as packet rises from handset screen (PacketCodec.ts).",
  },
  {
    id: 5,
    tStart: 0.05714285714285714,
    tEnd: 0.07142857142857142,
    moveType: "sweep-right",
    camPos: [-30, 0, -30],
    camPos2: [30, 0, -30],
    lookAt: [0, 0, 0],
    envId: "concourse",
    title: "Scene 05 — Hop Trail",
    detail: "Sweep right following curved 3D HopTrail between sender and walker.",
  },
  {
    id: 6,
    tStart: 0.07142857142857142,
    tEnd: 0.08571428571428572,
    moveType: "orbit",
    camPos: [10, -8, -30],
    camPos2: [-10, 8, -30],
    lookAt: [0, 0, 0],
    envId: "concourse",
    title: "Scene 06 — Orbit Delivery",
    detail: "Orbit around walking commuter, MessageBubble delivery confirm.",
  },
];

import type { PhaseScore } from "./pose/score";
import type { FeatureId, Side, Stick } from "./types";

export type Pt = { x: number; y: number; v?: number };

const BONES: [number, number, FeatureId?][] = [
  [11, 12, "heading"],
  [11, 13, "elbowL"],
  [13, 15, "elbowL"],
  [12, 14, "elbowR"],
  [14, 16, "elbowR"],
  [11, 23, "forwardLean"],
  [12, 24, "forwardLean"],
  [23, 24, "sideLean"],
  [23, 25, "kneeL"],
  [25, 27, "kneeL"],
  [27, 31, "footForwardL"],
  [24, 26, "kneeR"],
  [26, 28, "kneeR"],
  [28, 32, "footBackR"],
];

function swapFeature(id: FeatureId): FeatureId {
  if (id === "kneeL") return "kneeR";
  if (id === "kneeR") return "kneeL";
  if (id === "elbowL") return "elbowR";
  if (id === "elbowR") return "elbowL";
  if (id === "wristForwardL") return "wristForwardR";
  if (id === "wristForwardR") return "wristForwardL";
  if (id === "footForwardL") return "footBackR";
  if (id === "footBackR") return "footForwardL";
  return id;
}

function scoreOf(id: FeatureId, side: Side, phaseScore: PhaseScore | null): number | null {
  if (!phaseScore) return null;
  const key = side === "left" ? swapFeature(id) : id;
  const part = phaseScore.parts.find((item) => item.id === key);
  return part ? part.score : null;
}

function colorFor(score: number | null): string {
  if (score === null) return "rgba(236, 231, 220, 0.9)";
  const t = Math.max(0, Math.min(1, score));
  const light = 46 + t * 40;
  return `hsl(160 8% ${light}%)`;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  points: Pt[],
  width: number,
  height: number,
  phaseScore: PhaseScore | null,
  side: Side,
  underlay?: CanvasImageSource,
): void {
  ctx.clearRect(0, 0, width, height);
  if (underlay) ctx.drawImage(underlay, 0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const limb = Math.max(8, width / 55);
  for (const [a, b, feature] of BONES) {
    const pa = points[a];
    const pb = points[b];
    if (!pa || !pb) continue;
    if ((pa.v ?? 1) < 0.35 || (pb.v ?? 1) < 0.35) continue;
    ctx.strokeStyle = colorFor(feature ? scoreOf(feature, side, phaseScore) : null);
    ctx.lineWidth = limb;
    ctx.beginPath();
    ctx.moveTo(pa.x * width, pa.y * height);
    ctx.lineTo(pb.x * width, pb.y * height);
    ctx.stroke();
  }
  for (const index of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = points[index];
    if (!p || (p.v ?? 1) < 0.35) continue;
    ctx.fillStyle = "rgba(20, 18, 16, 0.9)";
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, limb * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(236, 231, 220, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

const STICK_EDGES: [keyof Stick, keyof Stick][] = [
  ["head", "neck"],
  ["neck", "ls"],
  ["neck", "rs"],
  ["ls", "rs"],
  ["ls", "le"],
  ["le", "lw"],
  ["rs", "re"],
  ["re", "rw"],
  ["ls", "lh"],
  ["rs", "rh"],
  ["lh", "rh"],
  ["lh", "lk"],
  ["lk", "la"],
  ["rh", "rk"],
  ["rk", "ra"],
];

export function drawMannequin(
  ctx: CanvasRenderingContext2D,
  stick: Stick,
  width: number,
  height: number,
  mirror: boolean,
): void {
  ctx.clearRect(0, 0, width, height);
  const xs = Object.values(stick).map((p) => p[0]);
  const ys = Object.values(stick).map((p) => p[1]);
  const minX = Math.min(...xs) - 18;
  const maxX = Math.max(...xs) + 18;
  const minY = Math.min(...ys) - 16;
  const maxY = Math.max(...ys) + 16;
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.86;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const project = (x: number, y: number) => {
    const px = width / 2 + (mirror ? -1 : 1) * (x - cx) * scale;
    const py = height / 2 - (y - cy) * scale;
    return [px, py] as const;
  };

  ctx.strokeStyle = "rgba(236, 231, 220, 0.18)";
  ctx.lineWidth = 1;
  const floor = project(0, minY + 8)[1];
  ctx.beginPath();
  ctx.moveTo(width * 0.18, floor);
  ctx.lineTo(width * 0.82, floor);
  ctx.stroke();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(232, 196, 164, 0.95)";
  ctx.lineWidth = Math.max(4, scale * 0.16);
  ctx.beginPath();
  let started = false;
  for (const [a, b] of STICK_EDGES) {
    const pa = project(stick[a][0], stick[a][1]);
    const pb = project(stick[b][0], stick[b][1]);
    if (!started) {
      ctx.moveTo(pa[0], pa[1]);
      started = true;
    }
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
  }
  ctx.stroke();

  const head = project(stick.head[0], stick.head[1]);
  ctx.fillStyle = "rgba(196, 69, 45, 0.95)";
  ctx.beginPath();
  ctx.arc(head[0], head[1], Math.max(7, scale * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

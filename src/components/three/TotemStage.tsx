import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, ContactShadows, Environment, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { Totem } from "./Totem";
import { totemState, TOTEM_SECTIONS } from "./totem-store";
import { SEGMENT_CONFIG } from "./segment-config";

const TOTAL_H = 1.8;
const CAM_Z = 6, FOV = 30, HEADER = 72;
const VIEW_H = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360); // world height visible at z=0
// Anatomy close-ups: focal point (totem-local, meters), zoom and yaw. Order: tela, câmera/QR, pinpad, impressora, base.
const FOCUS = [
  { x: 0, y: 1.42, z: 2.1, ry: -0.12 },
  { x: 0.08, y: 1.38, z: 1.8, ry: -0.35 },
  { x: -0.16, y: 1.06, z: 2.3, ry: 0.4 },
  { x: 0, y: 1.02, z: 2.4, ry: -0.08 },
  { x: 0, y: 0.25, z: 1.5, ry: -0.65 },
];

// Channels: x/y = screen fraction of focal point, h = totem height / viewport height,
// fx/fy = focal point in totem-local meters, ry/rx rotation (unwrapped), op opacity, m mouse weight.
type Ch = { x: number; y: number; h: number; fx: number; fy: number; ry: number; rx: number; op: number; m: number };
type Key = { at: number; c: Ch; next: "hold" | "ease" | "linear"; arc: boolean };
const KEYS: (keyof Ch)[] = ["x", "y", "h", "fx", "fy", "ry", "rx", "op", "m"];
const ch = (p: Partial<Ch>): Ch => ({ x: 0.5, y: 0.5, h: 0.6, fx: 0, fy: TOTAL_H / 2, ry: -0.45, rx: 0, op: 1, m: 0, ...p });
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = THREE.MathUtils.clamp;

function buildTimeline(mobile: boolean): Key[] {
  const H = window.innerHeight, W = window.innerWidth, sy = window.scrollY;
  const sec = (id: string) => {
    const el = document.getElementById(id); if (!el) return null;
    const r = el.getBoundingClientRect(); const top = r.top + sy, bottom = top + r.height;
    let hs = top - 0.35 * H, he = bottom - 0.65 * H;
    if (he < hs) hs = he = (hs + he) / 2;
    // desktop: scene snaps with its top under the header; hold around that framing
    const snap = id === "inicio" ? 0 : Math.max(0, top - HEADER);
    if (!mobile) { hs = snap - 0.12 * H; he = snap + Math.max(0, r.height - (H - HEADER)) + 0.12 * H; }
    return { el, top, bottom, h: r.height, hs, he, snap };
  };
  // slot rect (viewport fractions) when the scene is settled at its snap point; totem = 88% of slot height, centred
  const slotAt = (id: string, snap: number) => {
    const a = document.querySelector<HTMLElement>(`[data-totem-slot="${id}"]`);
    if (!a) return null; const r = a.getBoundingClientRect(); if (!r.width || !r.height) return null;
    return { x: (r.left + r.width / 2) / W, y: (r.top + sy + r.height / 2 - snap) / H, h: ((id === "segmentos" ? 0.78 : 0.88) * r.height) / H };
  };
  const keys: Key[] = [];
  const hold = (hs: number, he: number, c: Ch, next: Key["next"] = "ease", arc = !mobile) => {
    keys.push({ at: hs, c, next: "hold", arc }); keys.push({ at: Math.max(he, hs + 1), c, next, arc });
  };
  const ini = sec("inicio"), sol = sec("solucoes"), ana = sec("anatomia"), seg = sec("segmentos"), pro = sec("produtos"), cli = sec("clientes");
  if (!ini || !sol || !ana || !seg || !pro || !cli) return [];

  const heroA = slotAt("inicio", 0);
  hold(0, Math.max(ini.he, 1), mobile
    ? ch({ x: 0.5, y: heroA?.y ?? 0.6, h: 0.55, ry: -0.45, m: 0 })
    : ch({ x: heroA?.x ?? 0.72, y: heroA?.y ?? 0.55, h: heroA?.h ?? 0.75, ry: -0.45, m: 1 }));

  if (mobile) hold(sol.hs, sol.he, ch({ x: 0.5, y: 0.3, h: 0.45, ry: -0.9, op: 0 }), "ease", false);
  else { const a = slotAt("solucoes", sol.snap); hold(sol.hs, sol.he, ch({ x: a?.x ?? 0.8, y: a?.y ?? 0.55, h: a?.h ?? 0.62, ry: -1.15 })); }

  // Anatomy (pinned): 6 slots (overview + 5 close-ups), each 55% hold / 45% transition.
  const aS = ana.top, aE = Math.max(ana.bottom - H, aS + 6);
  let ax = 0.5, ay = 0.52;
  if (!mobile) {
    const a = document.querySelector<HTMLElement>('[data-totem-slot="anatomia"]');
    let st: HTMLElement | null = a?.parentElement ?? null;
    while (st && getComputedStyle(st).position !== "sticky") st = st.parentElement;
    if (a && st) { const r = a.getBoundingClientRect(), sr = st.getBoundingClientRect(); ax = (r.left + r.width / 2) / W; ay = (r.top - sr.top + (parseFloat(getComputedStyle(st).top) || 0) + r.height / 2) / H; }
  }
  const baseH = mobile ? 0.6 : 0.85, slot = (aE - aS) / 6;
  const slots: Ch[] = [ch({ x: ax, y: ay, h: baseH, ry: -0.35, m: mobile ? 0 : 1 }),
    ...FOCUS.map((f) => { const z = mobile ? Math.min(f.z, 1.4) : f.z; return ch({ x: ax, y: ay, h: baseH * z, fx: f.x, fy: f.y, ry: f.ry }); })];
  slots.forEach((c, i) => hold(aS + i * slot, aS + i * slot + slot * 0.55, c, "ease", !mobile && i === 0));
  // keep last close-up until pin releases
  keys[keys.length - 1]!.at = aE;

  if (mobile) {
    const sa = slotAt("segmentos", seg.snap);
    hold(seg.hs, seg.he, ch({ x: sa?.x ?? 0.5, y: sa?.y ?? 0.42, h: Math.min(sa?.h ?? 0.35, 0.38), ry: -0.55 }), "ease", false);
    hold(pro.hs, pro.he, ch({ x: 0.5, y: 0.3, h: 0.3, ry: -0.4, op: 0 }), "hold", false);
    return keys;
  }
  const sa = slotAt("segmentos", seg.snap);
  hold(seg.hs, seg.he, ch({ x: sa?.x ?? 0.7, y: sa?.y ?? 0.55, h: sa?.h ?? 0.58, ry: -0.55 }));
  const pa = slotAt("produtos", pro.snap);
  const pc = ch({ x: pa?.x ?? 0.8, y: pa?.y ?? 0.55, h: pa?.h ?? 0.6, ry: -0.4 });
  // settle facing 3/4 at the snap, then spin a full turn as the user scrolls on through the scene
  const spinEnd = Math.max(pro.he, pro.snap + 2) + (cli.hs - Math.max(pro.he, pro.snap + 2)) * 0.5;
  keys.push({ at: pro.hs, c: pc, next: "hold", arc: true });
  keys.push({ at: pro.snap + 1, c: pc, next: "linear", arc: true });
  keys.push({ at: Math.max(spinEnd, pro.snap + 3), c: { ...pc, ry: -0.4 + Math.PI * 2 }, next: "ease", arc: true });
  keys.push({ at: Math.max(cli.hs, pro.he + 2), c: ch({ x: 0.92, y: 0.25, h: 0.25, ry: -0.4 + Math.PI * 2 + 0.6, op: 0 }), next: "hold", arc: true });
  return keys;
}

function sample(keys: Key[], s: number, out: Ch) {
  if (!keys.length) return;
  if (s <= keys[0]!.at) { Object.assign(out, keys[0]!.c); return; }
  const last = keys[keys.length - 1]!;
  if (s >= last.at) { Object.assign(out, last.c); return; }
  let i = 0; while (i < keys.length - 2 && s >= keys[i + 1]!.at) i++;
  const a = keys[i]!, b = keys[i + 1]!;
  if (a.next === "hold") { Object.assign(out, a.c); return; }
  const lt = clamp((s - a.at) / (b.at - a.at || 1), 0, 1);
  const e = a.next === "linear" ? lt : easeInOutCubic(lt);
  for (const k of KEYS) out[k] = a.c[k] + (b.c[k] - a.c[k]) * e;
  if (a.next === "ease" && a.arc && b.arc) { const w = Math.sin(Math.PI * lt); out.y -= 0.04 * w; out.rx += 0.06 * w; }
}

function useTotemKeyframes(mobile: boolean) {
  const data = useRef<{ keys: Key[]; secs: { id: string; top: number }[] }>({ keys: [], secs: [] });
  useEffect(() => {
    let raf = 0;
    const measure = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const sy = window.scrollY;
      data.current = { keys: buildTimeline(mobile), secs: TOTEM_SECTIONS.map((id) => ({ id, top: (document.getElementById(id)?.getBoundingClientRect().top ?? 1e9) + sy })) };
    }); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(document.body);
    window.addEventListener("resize", measure); window.addEventListener("load", measure);
    document.fonts?.ready.then(measure);
    const imgs = Array.from(document.images).filter((i) => !i.complete);
    imgs.forEach((i) => i.addEventListener("load", measure, { once: true }));
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("load", measure); imgs.forEach((i) => i.removeEventListener("load", measure)); };
  }, [mobile]);
  return data;
}

function Rig({ wrap, reduce, mobile }: { wrap: React.RefObject<HTMLDivElement | null>; reduce: boolean; mobile: boolean }) {
  const g = useRef<THREE.Group>(null);
  const floor = useRef<THREE.Group>(null);
  const floorRing = useRef<THREE.MeshBasicMaterial>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const tl = useTotemKeyframes(mobile);
  const target = useRef(ch({}));
  const c = useRef({ x: 0, y: 0, s: 1, ry: -0.45, rx: 0, op: 0, mx: 0, my: 0, intro: 0, init: false, lastOp: -1 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointer.current.x = e.clientX / window.innerWidth - 0.5; pointer.current.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05), t = state.clock.elapsedTime;
    const { keys, secs } = tl.current; if (!keys.length) return;
    const size = state.size, aspect = size.width / size.height, viewW = VIEW_H * aspect;
    const scroll = totemState.lenis ? totemState.lenis.scroll : window.scrollY;
    // section for screen/UI state (cached tops, no DOM reads)
    const probe = scroll + size.height * 0.5; let sec = "inicio";
    for (const s of secs) if (s.top <= probe) sec = s.id;
    totemState.section = sec;

    const T = target.current;
    if (reduce) {
      Object.assign(T, keys[0]!.c); T.m = 0;
      T.op = scroll < (keys[1]?.at ?? 0) + size.height * 0.3 ? 1 : 0;
    } else sample(keys, scroll, T);

    const s = (T.h * VIEW_H) / TOTAL_H;
    const tx = (T.x - 0.5) * viewW - T.fx * s;
    const ty = -(T.y - 0.5) * VIEW_H - T.fy * s;
    const k = c.current;
    if (!k.init) { Object.assign(k, { x: tx, y: ty, s, ry: T.ry, rx: T.rx, init: true }); }
    const L = reduce ? 30 : 10;
    k.x = THREE.MathUtils.damp(k.x, tx, L, dt); k.y = THREE.MathUtils.damp(k.y, ty, L, dt);
    k.s = THREE.MathUtils.damp(k.s, s, L, dt); k.ry = THREE.MathUtils.damp(k.ry, T.ry, L, dt);
    k.rx = THREE.MathUtils.damp(k.rx, T.rx, L, dt);
    k.op = reduce ? THREE.MathUtils.damp(k.op, T.op, 6, dt) : THREE.MathUtils.damp(k.op, T.op, L, dt);
    k.intro = THREE.MathUtils.damp(k.intro, 1, 3, dt);
    // additive layers: mouse tilt + idle float
    const mw = reduce || mobile ? 0 : T.m;
    k.mx = THREE.MathUtils.damp(k.mx, pointer.current.x * 2 * 0.12 * mw, 4, dt);
    k.my = THREE.MathUtils.damp(k.my, pointer.current.y * 2 * 0.06 * mw, 4, dt);
    const float = reduce ? 0 : Math.sin((t * Math.PI * 2) / 4) * 0.015 * T.h * VIEW_H;
    if (g.current) {
      g.current.position.set(k.x, k.y + float, 0);
      g.current.scale.setScalar(Math.max(k.s, 0.001));
      const anticipation = sec === "segmentos" && !reduce ? totemState.segmentPulse : 0;
      g.current.rotation.set(k.rx + k.my, k.ry + k.mx + anticipation * 0.3, 0);
      g.current.position.y += anticipation * 0.04 * k.s;
    }
    if (floor.current) floor.current.visible = sec === "segmentos" && !mobile && !reduce && k.op > 0.1;
    if (floorRing.current && floor.current?.visible) {
      const colors = ["#12B5A5", "#FF7A1A", "#B6F23A", "#C9A24A", "#2E6BFF", "#1F8A4C"];
      floorRing.current.color.lerp(new THREE.Color(colors[totemState.segment] ?? colors[0]), 1 - Math.exp(-4 * dt));
    }
    const op = k.op * k.intro;
    if (wrap.current && Math.abs(op - k.lastOp) > 0.01) { k.lastOp = op; wrap.current.style.opacity = op.toFixed(3); }
  });
  return <group ref={g}>
    <Totem live />
    {!mobile && <group ref={floor} visible={false}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}><ringGeometry args={[0.36, 0.37, 64]} /><meshBasicMaterial ref={floorRing} color="#12B5A5" transparent opacity={0.25} toneMapped={false} /></mesh>
    </group>}
    <ContactShadows frames={1} position={[0, 0.002, 0]} opacity={0.3} scale={1.8} blur={2.8} far={0.8} resolution={256} color="#0B1F3A" />
  </group>;
}

function Progress() {
  const { active, progress } = useProgress();
  const [done, setDone] = useState(false);
  useEffect(() => { if (!active && progress >= 100) { const id = setTimeout(() => setDone(true), 300); return () => clearTimeout(id); } return undefined; }, [active, progress]);
  if (done) return null;
  return <TotemLoader pct={Math.round(progress)} />;
}

export function TotemLoader({ pct }: { pct?: number }) {
  return <div className="pointer-events-none fixed right-[18%] top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
    <div className="size-16 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    <span className="text-[11px] font-bold tracking-[.2em] text-primary">{pct ?? 0}%</span>
  </div>;
}

export default function TotemStage() {
  const wrap = useRef<HTMLDivElement>(null);
  const [env] = useState(() => ({ reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches, mobile: window.innerWidth < 1024 }));
  const maxDpr = env.mobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);
  return <>
    <div ref={wrap} aria-hidden className="pointer-events-none fixed inset-0 z-30" style={{ opacity: 0 }}>
      <Canvas dpr={dpr} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: "high-performance" }} camera={{ position: [0, 0, CAM_Z], fov: FOV }} onCreated={({ gl }) => { gl.localClippingEnabled = true; }} style={{ pointerEvents: "none" }}>
        <PerformanceMonitor bounds={(r) => (r > 90 ? [50, 90] : [50, 60])} onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} />
        <AdaptiveDpr pixelated={false} />
        <ambientLight intensity={1} />
        <directionalLight position={[2.5, 4, 5]} intensity={3.6} color="#ffffff" />
        <directionalLight position={[-3, 2, 1]} intensity={1.3} color="#ffffff" />
        <directionalLight position={[-3, 2, -4]} intensity={1} color="#2F80ED" />
        <Environment resolution={256}>
          <Lightformer intensity={5} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer intensity={4} position={[4, 1, 3]} rotation-y={-Math.PI / 3} scale={[3, 6, 1]} />
          <Lightformer intensity={0.8} color="#2F80ED" position={[-5, 1, -2]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
          <Lightformer intensity={0.6} color="#3b5b9a" position={[0, -3, 2]} scale={[10, 2, 1]} />
        </Environment>
        <Suspense fallback={null}><Rig wrap={wrap} reduce={env.reduce} mobile={env.mobile} /></Suspense>
      </Canvas>
    </div>
    <Progress />
  </>;
}

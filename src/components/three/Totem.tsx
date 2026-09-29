import { useEffect, useMemo, useRef } from "react";
import { RoundedBox, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import logoWhite from "@/assets/vision/logo-white.png.asset.json";
import { drawScreen } from "./screen";
import { totemState } from "./totem-store";
import { SEGMENT_CONFIG } from "./segment-config";

export type Variant = "smart" | "slim" | "self" | "tablet" | "front" | "especial";

type Spec = { w: number; h: number; d: number; sw: number; sh: number; sy: number; vertical?: boolean; panel: string; hardware: boolean; counter?: boolean };
const SPECS: Record<Exclude<Variant, "tablet">, Spec> = {
  smart: { w: 0.55, h: 1.62, d: 0.3, sw: 0.476, sh: 0.268, sy: 1.4, panel: "#0E1A33", hardware: true },
  especial: { w: 0.55, h: 1.62, d: 0.3, sw: 0.476, sh: 0.268, sy: 1.4, panel: "#0f5a4c", hardware: true },
  self: { w: 0.55, h: 1.62, d: 0.3, sw: 0.476, sh: 0.268, sy: 1.4, panel: "#0E1A33", hardware: true, counter: true },
  slim: { w: 0.4, h: 1.62, d: 0.18, sw: 0.35, sh: 0.2, sy: 1.42, panel: "#0E1A33", hardware: false },
  front: { w: 0.62, h: 1.7, d: 0.2, sw: 0.44, sh: 0.78, sy: 1.14, vertical: true, panel: "#0E1A33", hardware: false },
};
const TILT = 0.11; // ~6.3° front panel inclination
export const LED = new THREE.Color("#2F80ED");
const SCANNER_LIGHT = new THREE.MeshBasicMaterial({ color: "#ff3333", toneMapped: false });

function useMaterials(panel: string) {
  return useMemo(() => ({
    panel: new THREE.MeshPhysicalMaterial({ color: panel, metalness: 0.6, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    body: new THREE.MeshPhysicalMaterial({ color: "#15171C", metalness: 0.55, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
    black: new THREE.MeshPhysicalMaterial({ color: "#050608", metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    matte: new THREE.MeshStandardMaterial({ color: "#0b0c10", roughness: 0.7, metalness: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: "#8a929c", roughness: 0.3, metalness: 0.95 }),
    key: new THREE.MeshStandardMaterial({ color: "#2b3038", roughness: 0.5, metalness: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0, roughness: 0.03, transmission: 0.08, transparent: true, opacity: 0.12, clearcoat: 1, envMapIntensity: 2.4 }),
    led: new THREE.MeshBasicMaterial({ color: LED.clone(), toneMapped: false }),
    qr: new THREE.MeshBasicMaterial({ color: "#2dff8a", toneMapped: false }),
    paper: new THREE.MeshStandardMaterial({ color: "#f7f7f2", roughness: 0.9, side: THREE.DoubleSide }),
  }), [panel]);
}

function useBodyGeometry(w: number, h: number, d: number) {
  return useMemo(() => {
    const b = 0.014, recede = h * Math.tan(TILT);
    const s = new THREE.Shape();
    s.moveTo(-d / 2 + b, b); s.lineTo(d / 2 - b, b); s.lineTo(d / 2 - b - recede, h - b); s.lineTo(-d / 2 + b, h - b); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 5, curveSegments: 8 });
    g.rotateY(-Math.PI / 2); g.translate(w / 2 - b, 0, 0);
    g.computeVertexNormals();
    return g;
  }, [w, h, d]);
}

function useScreenTexture(vertical: boolean) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = vertical ? 576 : 1024; c.height = vertical ? 1024 : 576;
    drawScreen(c, 0, "Seu atendimento começa aqui", vertical);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return { canvas: c, tex: t };
  }, [vertical]);
}

function Screen({ w, h, m, vertical, live, flowRef, staticFlow = 0 }: { w: number; h: number; m: ReturnType<typeof useMaterials>; vertical: boolean; live: boolean; flowRef: React.MutableRefObject<number>; staticFlow?: number }) {
  const screen = useScreenTexture(vertical);
  const previous = useScreenTexture(vertical);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: screen?.tex ?? null, toneMapped: false, color: new THREE.Color(live ? 0 : 1, live ? 0 : 1, live ? 0 : 1) }), [screen, live]);
  const previousMat = useMemo(() => new THREE.MeshBasicMaterial({ map: previous?.tex ?? null, toneMapped: false, transparent: true, opacity: 0, depthWrite: false }), [previous]);
  const key = useRef("");
  const oldSegment = useRef(-1);
  const power = useRef(0);
  useEffect(() => { if (screen && !live) { drawScreen(screen.canvas, staticFlow, "Seu atendimento começa aqui", vertical); screen.tex.needsUpdate = true; } }, [screen, live, staticFlow, vertical]);
  useFrame((st, dt) => {
    if (!live || !screen) return;
    power.current = Math.min(1, power.current + Math.min(dt, 0.05) * 0.9);
    const p = THREE.MathUtils.smoothstep(power.current, 0.15, 0.9) * 1.05;
    mat.color.setScalar(p);
    const segment = totemState.section === "segmentos" ? totemState.segment : -1;
    const phase = Math.floor(st.clock.elapsedTime / 2.4) % (SEGMENT_CONFIG[segment]?.screens.length ?? 2);
    const k = `${flowRef.current}|${totemState.label}|${segment}|${phase}`;
    if (segment !== oldSegment.current && segment >= 0 && previous) {
      previous.canvas.getContext("2d")?.drawImage(screen.canvas, 0, 0);
      previous.tex.needsUpdate = true;
      previousMat.opacity = 1;
    }
    if (k !== key.current) { key.current = k; drawScreen(screen.canvas, flowRef.current, totemState.label, vertical, segment, phase); screen.tex.needsUpdate = true; }
    if (segment >= 0) previousMat.opacity = Math.max(0, 1 - totemState.segmentProgress);
    else previousMat.opacity = 0;
    oldSegment.current = segment;
    void st;
  });
  return <group>
    <RoundedBox args={[w + 0.034, h + 0.034, 0.012]} radius={0.005} smoothness={4} material={m.black} position={[0, 0, 0.006]} />
    <mesh position={[0, 0, 0.0125]} material={mat}><planeGeometry args={[w, h]} /></mesh>
    {live && <mesh position={[0, 0, 0.0127]} material={previousMat}><planeGeometry args={[w, h]} /></mesh>}
    <mesh position={[0, 0, 0.0135]} material={m.glass}><planeGeometry args={[w + 0.02, h + 0.02]} /></mesh>
  </group>;
}

function Logo({ y, width }: { y: number; width: number }) {
  const tex = useTexture(logoWhite.url);
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 4;
  return <mesh position={[0, y, 0.009]}><planeGeometry args={[width, width / aspect]} /><meshBasicMaterial map={tex} transparent alphaTest={0.25} toneMapped={false} color="#ffffff" /></mesh>;
}

export function Totem({ variant = "smart", live = false, staticFlow = 0 }: { variant?: Variant; live?: boolean; staticFlow?: number }) {
  if (variant === "tablet") return <TabletTotem />;
  return <StandingTotem spec={SPECS[variant]} live={live} staticFlow={staticFlow} />;
}

function StandingTotem({ spec, live, staticFlow }: { spec: Spec; live: boolean; staticFlow: number }) {
  const { w, h, d, sw, sh, sy, vertical = false, hardware, counter } = spec;
  const m = useMaterials(spec.panel);
  const bodyGeo = useBodyGeometry(w, h, d);
  const paper = useRef<THREE.Group>(null);
  const paperLen = useRef(0);
  const flowRef = useRef(staticFlow);
  const base = 0.08;
  const panelZ = (d / 2) - (h / 2) * Math.tan(TILT);
  const skin = useRef<THREE.Mesh>(null);
  const originalHardware = useRef<THREE.Group>(null);
  const stripe = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.Mesh>(null);
  const modules = useRef<(THREE.Group | null)[]>([]);
  const revealPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -10), []);
  const moduleMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#F4F7FA", metalness: 0.6, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, opacity: 0, clippingPlanes: [revealPlane] }), [revealPlane]);
  const stripeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#12B5A5", transparent: true, opacity: 0, toneMapped: false }), []);
  const scanMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#12B5A5", transparent: true, opacity: 0, toneMapped: false }), []);
  const transition = useRef({ from: 0, to: 0, elapsed: 1.1, color: new THREE.Color(SPECS.smart.panel), accent: LED.clone() });
  const moduleKinds = ["biometric", "card", "wristband", "counter", "scanner", "nfc", "receipt", "face", "qr", "pinpad", "privacy", "ticket", "document", "a4", "speaker", "accessible"];
  useFrame((st, raw) => {
    const dt = Math.min(raw, 0.05); const t = st.clock.elapsedTime;
    if (live) {
      const s = totemState;
      flowRef.current = s.section === "anatomia" && s.step >= 0 ? [0, 1, 2, 3, 3][s.step] ?? 0 : s.section === "segmentos" ? 1 : Math.floor(t / 2.8) % 4;
      const tr = transition.current;
      if (s.segment !== tr.to) { tr.from = tr.to; tr.to = s.segment; tr.elapsed = 0; tr.color.copy(moduleMaterial.color); tr.accent.copy(stripeMaterial.color); }
      tr.elapsed = Math.min(1.1, tr.elapsed + dt);
      const progress = THREE.MathUtils.smoothstep(tr.elapsed / 1.1, 0, 1);
      const cfg = SEGMENT_CONFIG[tr.to] ?? SEGMENT_CONFIG[0];
      const active = s.section === "segmentos";
      if (cfg) {
        if (originalHardware.current) originalHardware.current.scale.setScalar(THREE.MathUtils.damp(originalHardware.current.scale.x, active ? 0.001 : 1, 12, dt));
        moduleMaterial.color.copy(tr.color).lerp(new THREE.Color(cfg.panel), progress);
        const panelColor = new THREE.Color(cfg.panel);
        const luminance = 0.2126 * panelColor.r + 0.7152 * panelColor.g + 0.0722 * panelColor.b;
        const lightPanel = luminance > 0.6;
        moduleMaterial.metalness = THREE.MathUtils.damp(moduleMaterial.metalness, lightPanel ? 0.1 : 0.55, 5, dt);
        moduleMaterial.roughness = THREE.MathUtils.damp(moduleMaterial.roughness, lightPanel ? 0.28 : 0.35, 5, dt);
        moduleMaterial.clearcoat = THREE.MathUtils.damp(moduleMaterial.clearcoat, lightPanel ? 1 : 0.6, 5, dt);
        moduleMaterial.clearcoatRoughness = THREE.MathUtils.damp(moduleMaterial.clearcoatRoughness, lightPanel ? 0.08 : 0.2, 5, dt);
        stripeMaterial.color.copy(tr.accent).lerp(new THREE.Color(cfg.accent), progress);
        scanMaterial.color.copy(stripeMaterial.color);
        const visible = active ? 1 : 0;
        moduleMaterial.opacity = THREE.MathUtils.damp(moduleMaterial.opacity, visible, 8, dt);
        stripeMaterial.opacity = THREE.MathUtils.damp(stripeMaterial.opacity, visible, 8, dt);
        scanMaterial.opacity = active && tr.elapsed < 1.1 ? Math.sin(Math.PI * tr.elapsed / 1.1) * 0.75 : 0;
        if (scan.current) scan.current.position.y = h / 2 - progress * (h - 0.04);
        if (skin.current) {
          skin.current.updateWorldMatrix(true, false);
          const point = skin.current.localToWorld(new THREE.Vector3(0, active ? h / 2 - progress * h : h, 0));
          const normal = new THREE.Vector3(0, 1, 0).transformDirection(skin.current.matrixWorld);
          revealPlane.setFromNormalAndCoplanarPoint(normal, point);
        }
        const mods = cfg.modules;
        modules.current.forEach((group, i) => { if (!group) return; const wanted = active && mods.includes(moduleKinds[i] ?? "") ? 1 : 0.001; const speed = wanted > group.scale.x ? 12 : 9; const scale = THREE.MathUtils.damp(group.scale.x, wanted * (1 + (wanted > group.scale.x && progress > 0.6 && progress < 0.85 ? 0.08 : 0)), speed, dt); group.scale.setScalar(scale); group.userData["restZ"] ??= group.position.z; group.position.z = THREE.MathUtils.damp(group.position.z, group.userData["restZ"] - (1 - Math.min(scale, 1)) * 0.06, speed, dt); group.visible = scale > 0.004; });
      }
      totemState.segmentProgress = progress;
      totemState.segmentPulse = active && tr.elapsed < 1.1 ? Math.sin(Math.PI * tr.elapsed / 1.1) : 0;
      const on = THREE.MathUtils.smoothstep(t, 0.6, 1.8);
      m.led.color.copy(active ? stripeMaterial.color : LED).multiplyScalar(on * (1.1 + 0.5 * Math.sin(t * 1.6)));
    }
    paperLen.current = THREE.MathUtils.damp(paperLen.current, flowRef.current === 3 ? 0.13 : 0.001, 3, dt);
    if (paper.current) paper.current.scale.y = paperLen.current;
  });
  const P = (y: number) => y - h / 2; // absolute height -> panel local
  return <group>
    {/* base + feet */}
    <RoundedBox args={[w + 0.1, 0.05, d + 0.16]} radius={0.012} smoothness={4} material={m.body} position={[0, 0.055, 0]} />
    <RoundedBox args={[w + 0.104, 0.007, d + 0.164]} radius={0.003} smoothness={2} material={m.led} position={[0, 0.074, 0]} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[(x! * (w + 0.04)) / 2, 0.015, (z! * (d + 0.1)) / 2]} material={m.steel}><cylinderGeometry args={[0.022, 0.026, 0.03, 20]} /></mesh>)}
    <group position={[0, base, 0]}>
      <mesh geometry={bodyGeo} material={m.body} />
      {/* side LED strip */}
      <mesh position={[w / 2 + 0.002, h / 2, panelZ - 0.03]} rotation={[-TILT, 0, 0]} material={m.led}><boxGeometry args={[0.006, h * 0.86, 0.008]} /></mesh>
      {/* inclined front panel, everything on it lives in panel-local coords */}
      <group position={[0, h / 2, panelZ + 0.002]} rotation={[-TILT, 0, 0]}>
        <RoundedBox args={[w - 0.012, h - 0.02, 0.014]} radius={0.006} smoothness={4} material={m.panel} />
        {live && <>
          <RoundedBox ref={skin} args={[w - 0.013, h - 0.021, 0.0145]} radius={0.006} smoothness={4} material={moduleMaterial} position={[0, 0, 0.001]} />
          <mesh ref={stripe} material={stripeMaterial} position={[w * 0.43, 0, 0.009]}><boxGeometry args={[0.019, h * 0.87, 0.004]} /></mesh>
          <mesh ref={scan} material={scanMaterial} position={[0, h / 2, 0.015]}><planeGeometry args={[w - 0.025, 0.027]} /></mesh>
        </>}
        <group position={[0, P(sy), 0.007]}><Screen w={sw} h={sh} m={m} vertical={vertical} live={live} flowRef={flowRef} staticFlow={staticFlow} /></group>
        {/* camera bar */}
        <group position={[0, P(sy) + sh / 2 + 0.045, 0.009]}>
          <RoundedBox args={[0.13, 0.036, 0.016]} radius={0.006} smoothness={3} material={m.black} />
          <mesh position={[-0.02, 0, 0.009]} rotation={[Math.PI / 2, 0, 0]} material={m.matte}><cylinderGeometry args={[0.009, 0.009, 0.004, 24]} /></mesh>
          <mesh position={[0.025, 0, 0.009]} material={m.led}><circleGeometry args={[0.003, 12]} /></mesh>
        </group>
        {hardware && <group ref={originalHardware}>
          {/* pinpad */}
          <group position={[-w * 0.3, P(1.0), 0.02]}>
            <RoundedBox args={[0.1, 0.14, 0.03]} radius={0.008} smoothness={3} material={m.matte} />
            <mesh position={[0, 0.047, 0.016]} material={m.black}><planeGeometry args={[0.07, 0.022]} /></mesh>
            {Array.from({ length: 12 }).map((_, i) => <RoundedBox key={i} args={[0.019, 0.014, 0.006]} radius={0.002} smoothness={2} material={i === 9 ? m.qr : m.key} position={[-0.024 + (i % 3) * 0.024, 0.015 - Math.floor(i / 3) * 0.02, 0.017]} />)}
          </group>
          {/* QR reader */}
          <group position={[w * 0.3, P(1.1), 0.018]}>
            <RoundedBox args={[0.07, 0.095, 0.026]} radius={0.007} smoothness={3} material={m.matte} />
            <mesh position={[0, 0.005, 0.0135]} material={m.black}><planeGeometry args={[0.05, 0.05]} /></mesh>
            <mesh position={[0, -0.034, 0.0137]} material={m.qr}><planeGeometry args={[0.03, 0.005]} /></mesh>
          </group>
          {/* ticket printer + paper */}
          <group position={[0, P(1.02), 0.01]}>
            <RoundedBox args={[0.15, 0.045, 0.022]} radius={0.006} smoothness={3} material={m.black} />
            <mesh position={[0, -0.004, 0.0115]} material={m.matte}><planeGeometry args={[0.095, 0.006]} /></mesh>
            <group ref={paper} position={[0, -0.006, 0.013]} rotation={[0.35, 0, 0]} scale={[1, 0.001, 1]}>
              <mesh position={[0, -0.5, 0]} material={m.paper}><planeGeometry args={[0.078, 1]} /></mesh>
            </group>
          </group>
          {/* receipt slot */}
          <group position={[0, P(0.72), 0.01]}>
            <RoundedBox args={[0.15, 0.04, 0.02]} radius={0.006} smoothness={3} material={m.black} />
            <mesh position={[0, -0.003, 0.0105]} material={m.matte}><planeGeometry args={[0.1, 0.005]} /></mesh>
          </group>
        </group>}
        <Logo y={P(vertical ? 0.42 : 0.36)} width={w * 0.5} />
        {live && moduleKinds.map((kind, i) => <group key={kind} ref={(el) => { modules.current[i] = el; }} scale={0.001} position={kind === "counter" ? [w * 0.55, P(0.9), 0.05] : kind === "face" ? [0, P(1.58), 0.026] : kind === "a4" ? [0, P(0.77), 0.034] : kind === "privacy" ? [-w * 0.3, P(1), 0.05] : kind === "accessible" ? [0, P(0.48), 0.028] : kind === "speaker" ? [w * 0.3, P(0.8), 0.02] : kind === "scanner" ? [w * 0.75, P(0.94), 0.05] : kind === "biometric" ? [w * 0.3, P(1.1), 0.047] : kind === "wristband" ? [0, P(0.96), 0.047] : kind === "document" ? [0, P(0.75), 0.03] : kind === "nfc" ? [-w * 0.3, P(1.1), 0.048] : kind === "ticket" || kind === "receipt" ? [0, P(1.02), 0.048] : kind === "card" || kind === "pinpad" ? [-w * 0.3, P(1), 0.05] : [w * 0.3, P(1.1), 0.05]}>
          {kind === "counter" ? <><RoundedBox args={[0.42, 0.038, 0.35]} radius={0.009} smoothness={3} material={m.body} position={[0.17, 0, 0.1]} /><mesh material={m.black} position={[0.17, 0.021, 0.1]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[0.15,0.12]} /></mesh></> : kind === "privacy" ? <RoundedBox args={[0.13,0.17,0.075]} radius={0.01} smoothness={3} material={m.body} /> : kind === "a4" || kind === "document" ? <><RoundedBox args={[kind === "a4" ? 0.25 : 0.19,0.065,0.14]} radius={0.006} smoothness={3} material={m.body} /><mesh position={[0,-0.04,0.075]} material={m.paper}><planeGeometry args={[kind === "a4" ? 0.18 : 0.13,0.085]} /></mesh></> : kind === "face" ? <><mesh material={stripeMaterial} position={[0,0,0.001]}><ringGeometry args={[0.02,0.026,32]} /></mesh><mesh material={m.black}><circleGeometry args={[0.019,32]} /></mesh></> : kind === "accessible" ? <mesh material={stripeMaterial}><circleGeometry args={[0.035,32]} /></mesh> : kind === "speaker" ? <group>{[-1,0,1].map(n=><mesh key={n} position={[n*0.018,0,0]} material={m.black}><circleGeometry args={[0.005,12]} /></mesh>)}</group> : kind === "wristband" ? <><RoundedBox args={[0.16,0.04,0.02]} radius={0.005} smoothness={3} material={m.black} /><mesh position={[0,-0.055,0.016]} material={m.paper}><planeGeometry args={[0.065,0.11]} /></mesh></> : <><RoundedBox args={[0.085,0.08,0.024]} radius={0.006} smoothness={3} material={m.black} /><mesh material={kind === "scanner" ? SCANNER_LIGHT : stripeMaterial} position={[0,-0.024,0.014]}><planeGeometry args={[0.048,0.006]} /></mesh></>}
        </group>)}
      </group>
      {counter && <group position={[w / 2 + 0.2, 0.92, 0.02]}>
        <RoundedBox args={[0.4, 0.035, 0.34]} radius={0.01} smoothness={3} material={m.body} />
        <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.black}><planeGeometry args={[0.2, 0.14]} /></mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.led}><planeGeometry args={[0.16, 0.003]} /></mesh>
        <mesh position={[0.17, -0.47, -0.12]} material={m.steel}><boxGeometry args={[0.03, 0.9, 0.03]} /></mesh>
      </group>}
    </group>
  </group>;
}

function TabletTotem() {
  const m = useMaterials("#0E1A33");
  const flowRef = useRef(0);
  return <group>
    <RoundedBox args={[0.4, 0.035, 0.3]} radius={0.01} smoothness={4} material={m.body} position={[0, 0.02, 0]} />
    <mesh position={[0, 0.5, 0]} material={m.body}><cylinderGeometry args={[0.03, 0.035, 0.95, 32]} /></mesh>
    <mesh position={[0, 0.2, 0.031]} material={m.led}><boxGeometry args={[0.004, 0.3, 0.004]} /></mesh>
    <group position={[0, 1.02, 0.03]} rotation={[-0.55, 0, 0]}>
      <RoundedBox args={[0.34, 0.24, 0.025]} radius={0.012} smoothness={4} material={m.panel} />
      <group position={[0, 0, 0.012]}><Screen w={0.29} h={0.18} m={m} vertical={false} live={false} flowRef={flowRef} /></group>
    </group>
  </group>;
}

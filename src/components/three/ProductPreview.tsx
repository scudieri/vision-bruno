import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { Totem, type Variant } from "./Totem";

/** Static render of a Vision kiosk variant (renders on demand, not every frame). */
export default function ProductPreview({ variant }: { variant: Variant }) {
  const wide = variant === "self";
  return <Canvas frameloop="demand" dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ position: [wide ? 1.5 : 1.3, 1.25, wide ? 3.3 : 2.9], fov: 34 }} onCreated={({ camera }) => camera.lookAt(wide ? 0.15 : 0, 0.86, 0)}>
    <ambientLight intensity={1} />
    <directionalLight position={[2, 4, 4]} intensity={3.4} />
    <directionalLight position={[-3, 2, 1]} intensity={1.3} color="#ffffff" />
    <directionalLight position={[-3, 2, -3]} intensity={1} color="#2F80ED" />
    <Environment resolution={64}>
      <Lightformer intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
      <Lightformer intensity={0.8} color="#2F80ED" position={[-5, 1, -2]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
    </Environment>
    <Suspense fallback={null}>
      <group rotation-y={-0.45}><Totem variant={variant} staticFlow={1} /></group>
    </Suspense>
    <ContactShadows position={[0, 0.002, 0]} opacity={0.3} scale={2.5} blur={2.8} far={1} frames={1} resolution={256} color="#0B1F3A" />
  </Canvas>;
}

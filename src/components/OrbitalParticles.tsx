import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function OrbitalRings() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.12;
    groupRef.current.rotation.x += delta * 0.04;
  });

  const rings = useMemo(
    () =>
      [
        { radius: 1.9, tube: 0.018, rot: [0.4, 0.2, 0.1] as [number, number, number] },
        { radius: 2.45, tube: 0.014, rot: [1.1, 0.5, 0.3] as [number, number, number] },
        { radius: 3.05, tube: 0.012, rot: [0.2, 1.0, 0.4] as [number, number, number] },
      ] as const,
    []
  );

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={ring.rot}>
          <torusGeometry args={[ring.radius, ring.tube, 16, 96]} />
          <meshStandardMaterial
            color="#6366f1"
            emissive="#4f46e5"
            emissiveIntensity={0.85}
            metalness={0.35}
            roughness={0.35}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}
      {/* Orbital nodes */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        const r = 2.2 + (i % 3) * 0.35;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a * 0.7) * 0.4, Math.sin(a) * r]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#7c3aed"
              emissiveIntensity={1.4}
              metalness={0.2}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.25} color="#64748b" />
      <pointLight position={[6, 8, 8]} intensity={1.2} color="#a5b4fc" />
      <pointLight position={[-8, -4, 4]} intensity={0.6} color="#8b5cf6" />
      <Stars radius={80} depth={40} count={1800} factor={3} saturation={0} fade speed={0.4} />
      <OrbitalRings />
    </>
  );
}

function ParticlesFallback() {
  return (
    <div
      className="absolute inset-0 bg-[#0A0F1F]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.12) 0%, transparent 45%)",
      }}
      aria-hidden
    />
  );
}

type OrbitalParticlesProps = {
  className?: string;
};

/** Full-bleed WebGL layer: neon rings + stars for hero backgrounds */
export default function OrbitalParticles({ className }: OrbitalParticlesProps) {
  return (
    <ErrorBoundary fallback={<ParticlesFallback />}>
      <div className={className}>
        <Canvas
          camera={{ position: [0, 0, 7.5], fov: 45 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <Scene />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}

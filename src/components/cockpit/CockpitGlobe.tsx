import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const chainNodes: { chain: string; lat: number; lon: number; color: string }[] = [
  { chain: "ethereum", lat: 51.5, lon: -0.13, color: "#627EEA" },
  { chain: "polygon", lat: 40.7, lon: -74.0, color: "#8247E5" },
  { chain: "arbitrum", lat: 48.85, lon: 2.35, color: "#28A0F0" },
  { chain: "solana", lat: 37.77, lon: -122.4, color: "#14F195" },
  { chain: "tron", lat: 39.9, lon: 116.4, color: "#FF0013" },
  { chain: "ton", lat: 55.75, lon: 37.6, color: "#0088CC" },
];

function latLonToXYZ(lat: number, lon: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

function Globe() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshPhongMaterial color="#1a4d8c" emissive="#0a1f3a" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.82, 64, 64]} />
        <meshBasicMaterial color="#2266aa" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      {chainNodes.map((n) => (
        <mesh key={n.chain} position={latLonToXYZ(n.lat, n.lon, 1.85)}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color={n.color} emissive={n.color} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

function GlobeFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
      <div className="w-32 h-32 rounded-full border border-primary/20 animate-pulse" />
    </div>
  );
}

export default function CockpitGlobe() {
  return (
    <ErrorBoundary fallback={<GlobeFallback />}>
      <div className="w-full h-full min-h-[200px]">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.3} color="#404060" />
          <pointLight position={[5, 5, 5]} intensity={0.8} />
          <Stars radius={80} depth={40} count={1000} factor={2} saturation={0} fade speed={0.3} />
          <Globe />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} enableDamping />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}

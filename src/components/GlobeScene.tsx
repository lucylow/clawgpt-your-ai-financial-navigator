import { useRef, forwardRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function GlobeWireframe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  const nodePositions: [number, number, number][] = [
    [0.5, 0.8, 1.2],
    [-0.9, 0.3, 1.1],
    [0.2, -1.1, 0.9],
    [1.3, 0.1, -0.5],
    [-0.3, 1.2, -0.7],
    [-1.0, -0.8, -0.6],
  ];

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshPhongMaterial
          color="#1a4d8c"
          emissive="#0a1f3a"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.52, 64, 64]} />
        <meshBasicMaterial
          color="#2266aa"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
      {nodePositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#00aaff" emissive="#0044aa" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

function GlobeFallback() {
  return (
    <div className="fixed inset-0 -z-10 bg-background flex items-center justify-center">
      <div className="w-48 h-48 rounded-full border border-primary/20 animate-pulse" />
    </div>
  );
}

export default function GlobeScene() {
  return (
    <ErrorBoundary fallback={<GlobeFallback />}>
      <div className="fixed inset-0 -z-10">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.3} color="#404060" />
          <pointLight position={[5, 5, 5]} intensity={1} />
          <Stars radius={100} depth={50} count={2000} factor={2} saturation={0} fade speed={0.5} />
          <GlobeWireframe />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            enableDamping
          />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}

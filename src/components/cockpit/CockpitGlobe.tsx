import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COCKPIT_CHAIN_NODES } from "@/config/cockpitChainNodes";
import { cn } from "@/lib/utils";

function latLonToXYZ(lat: number, lon: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

function nodeRadiusForAllocation(chainId: string, allocation: Record<string, number> | undefined): number {
  const values = Object.values(allocation ?? {});
  const max = values.length > 0 ? Math.max(...values, 1e-9) : 1;
  const v = allocation?.[chainId] ?? 0;
  const t = max > 0 ? v / max : 0;
  return 0.035 + t * 0.085;
}

type GlobeProps = {
  allocation?: Record<string, number>;
};

function Globe({ allocation }: GlobeProps) {
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
      {COCKPIT_CHAIN_NODES.map((n) => {
        const r = nodeRadiusForAllocation(n.id, allocation);
        return (
          <mesh key={n.id} position={latLonToXYZ(n.lat, n.lon, 1.85)}>
            <sphereGeometry args={[r, 16, 16]} />
            <meshStandardMaterial color={n.color} emissive={n.color} emissiveIntensity={1.5} />
          </mesh>
        );
      })}
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

type CockpitGlobeProps = {
  /** Chain → USD notional; drives node size on the globe. */
  allocation?: Record<string, number>;
  className?: string;
};

export default function CockpitGlobe({ allocation, className }: CockpitGlobeProps) {
  const legend = useMemo(() => {
    const entries = COCKPIT_CHAIN_NODES.map((n) => ({
      id: n.id,
      label: n.label,
      color: n.color,
      value: allocation?.[n.id],
    }));
    const max = Math.max(...entries.map((e) => e.value ?? 0), 1);
    return entries.map((e) => ({
      ...e,
      intensity: max > 0 && e.value != null ? e.value / max : 0,
    }));
  }, [allocation]);

  return (
    <ErrorBoundary fallback={<GlobeFallback />}>
      <div className={cn("relative w-full h-full min-h-[200px]", className)}>
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <ambientLight intensity={0.3} color="#404060" />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <Stars radius={80} depth={40} count={1000} factor={2} saturation={0} fade speed={0.3} />
            <Globe allocation={allocation} />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} enableDamping />
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Multi-chain footprint</p>
          <p className="text-xs text-foreground/90">Node size reflects relative notional by chain</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap gap-x-3 gap-y-1 px-3 pb-2">
          {legend.map((row) => (
            <span key={row.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: row.color,
                  opacity: 0.35 + row.intensity * 0.65,
                  boxShadow: row.intensity > 0.2 ? `0 0 6px ${row.color}` : undefined,
                }}
              />
              <span className="text-foreground/80">{row.label}</span>
            </span>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}

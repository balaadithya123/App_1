import React, { Component, ReactNode, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";
import { ShieldCheck, Zap, Wrench, Hammer, Sparkles, CheckCircle2, Shield } from "lucide-react";

// WebGL Error Boundary to prevent crashes on non-WebGL devices
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("WebGL Canvas failed or is unsupported, using fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// --------------------------------------------------
// Floating Ambient Particle Dust Field
// --------------------------------------------------
function ParticleDust({ count = 45 }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorA = new THREE.Color("#10b981"); // Emerald
    const colorB = new THREE.Color("#3b82f6"); // Blue

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;

      const mixedColor = Math.random() > 0.5 ? colorA : colorB;
      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --------------------------------------------------
// 3D Central Verified Glassmorphic Shield Core
// --------------------------------------------------
function GlassShield3D({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const outerGlowRingRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Silky smooth pointer tilt lerping
      const targetX = (state.pointer.y * Math.PI) / 9;
      const targetY = (state.pointer.x * Math.PI) / 7;

      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        targetX,
        4,
        delta
      );
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetY + state.clock.getElapsedTime() * 0.25,
        4,
        delta
      );

      // Scale boost on hover
      const targetScale = isHovered ? 1.22 : 1.12;
      groupRef.current.scale.x = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 6, delta);
      groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, targetScale, 6, delta);
      groupRef.current.scale.z = THREE.MathUtils.damp(groupRef.current.scale.z, targetScale, 6, delta);
    }

    if (outerGlowRingRef.current) {
      outerGlowRingRef.current.rotation.z -= delta * 0.35;
    }

    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* Outer Glowing Energy Halo */}
      <mesh ref={outerGlowRingRef} position={[0, 0, -0.25]}>
        <ringGeometry args={[1.75, 1.88, 64]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Secondary Dynamic Ambient Halo */}
      <mesh position={[0, 0, -0.3]}>
        <ringGeometry args={[2.0, 2.05, 48]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer Glassmorphic Rounded Box Shield Body */}
      <RoundedBox args={[2.3, 2.7, 0.38]} radius={0.32} smoothness={10}>
        <meshPhysicalMaterial
          color="#09090b"
          roughness={0.12}
          metalness={0.88}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          reflectivity={0.95}
          transmission={0.15}
        />
      </RoundedBox>

      {/* Inner Metallic Bevel Frame */}
      <RoundedBox args={[2.1, 2.5, 0.42]} radius={0.28} smoothness={10} position={[0, 0, 0.02]}>
        <meshStandardMaterial
          color="#18181b"
          roughness={0.25}
          metalness={0.75}
        />
      </RoundedBox>

      {/* Central Glowing Shield Emblem Mesh */}
      <group position={[0, 0.4, 0.24]}>
        <mesh ref={innerMeshRef}>
          <octahedronGeometry args={[0.35, 1]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* Crisply Integrated Crisp Glass Badge Overlay */}
      <Html
        transform
        position={[0, -0.15, 0.25]}
        distanceFactor={3.2}
        className="pointer-events-none select-none flex flex-col items-center justify-center text-white"
        style={{ transition: "all 0.3s ease-out" }}
      >
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-xl rounded-2xl border border-emerald-500/50 shadow-2xl text-center w-52">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 mb-2 shadow-lg">
            <ShieldCheck size={26} className="animate-pulse" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
            Aadhaar Verified Pro
          </span>
          <span className="text-xs font-black text-white mt-0.5 tracking-tight">
            100% Direct Connection
          </span>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full shadow-inner">
            <Sparkles size={11} className="text-amber-400" />
            <span>0% Commission Cut</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// --------------------------------------------------
// 3D Orbital Skill Badges with Smooth Sine Levitation
// --------------------------------------------------
function OrbitalNode({
  position,
  icon: Icon,
  label,
  badgeColor,
  delay = 0,
}: {
  position: [number, number, number];
  icon: React.ElementType;
  label: string;
  badgeColor: string;
  delay?: number;
}) {
  const nodeGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (nodeGroupRef.current) {
      const time = state.clock.getElapsedTime() + delay;
      const targetY = position[1] + Math.sin(time * 1.6) * 0.18;
      nodeGroupRef.current.position.y = THREE.MathUtils.damp(
        nodeGroupRef.current.position.y,
        targetY,
        4,
        delta
      );
      nodeGroupRef.current.rotation.y = Math.sin(time * 0.9) * 0.15;
    }
  });

  return (
    <group ref={nodeGroupRef} position={position}>
      <Float speed={2.2} rotationIntensity={0.2} floatIntensity={0.4}>
        {/* Metallic Node Base Sphere */}
        <mesh>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial
            color="#18181b"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        <Html
          transform
          position={[0, 0, 0.42]}
          distanceFactor={3.6}
          className="pointer-events-none select-none"
        >
          <div className="flex items-center gap-2 bg-white/95 text-[#09090B] px-3.5 py-1.5 rounded-full shadow-xl border border-zinc-200/90 text-xs font-black whitespace-nowrap backdrop-blur-md">
            <div className={`p-1 rounded-full ${badgeColor} text-white shadow-xs`}>
              <Icon size={12} />
            </div>
            <span>{label}</span>
          </div>
        </Html>
      </Float>
    </group>
  );
}

// --------------------------------------------------
// High Quality 2D Graphic Fallback
// --------------------------------------------------
function FallbackGraphic() {
  return (
    <div className="w-full h-full min-h-[360px] flex items-center justify-center p-6 bg-gradient-to-b from-zinc-900 to-black text-white rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18)_0,transparent_70%)]" />
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg animate-bounce">
          <ShieldCheck size={36} />
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
          Govt ID & Aadhaar Verified
        </span>
        <h3 className="text-xl font-extrabold text-white">
          Verified Neighborhood Network
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
          Direct WhatsApp & phone connection with zero platform markup.
        </p>
        <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-400">
          <CheckCircle2 size={15} />
          <span>100% Commission-Free</span>
        </div>
      </div>
    </div>
  );
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

export default function Hero3DCanvas() {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    setIsSupported(checkWebGLSupport());
  }, []);

  if (!isSupported) {
    return <FallbackGraphic />;
  }

  return (
    <div
      className="w-full h-[360px] sm:h-[450px] relative rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <WebGLErrorBoundary fallback={<FallbackGraphic />}>
        <Canvas
          camera={{ position: [0, 0, 6.8], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          {/* Lighting Rig */}
          <ambientLight intensity={0.85} />
          <directionalLight position={[8, 10, 6]} intensity={1.6} color="#ffffff" />
          <directionalLight position={[-8, -8, -4]} intensity={0.7} color="#10b981" />
          <directionalLight position={[0, -6, 5]} intensity={0.4} color="#3b82f6" />
          <pointLight position={[0, 3, 2]} intensity={1.5} color="#10b981" />

          {/* Floating Ambient Particle Dust */}
          <ParticleDust count={50} />

          {/* Central Glassmorphic Shield */}
          <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.4}>
            <GlassShield3D isHovered={isHovered} />
          </Float>

          {/* Orbiting Trade Skill Badges */}
          <OrbitalNode
            position={[-2.5, 1.4, 0.4]}
            icon={Zap}
            label="Electrician"
            badgeColor="bg-amber-500"
            delay={0}
          />
          <OrbitalNode
            position={[2.6, 1.3, 0.2]}
            icon={Wrench}
            label="Plumber"
            badgeColor="bg-blue-500"
            delay={1.1}
          />
          <OrbitalNode
            position={[-2.4, -1.3, 0.3]}
            icon={Hammer}
            label="Carpenter"
            badgeColor="bg-orange-500"
            delay={2.2}
          />
          <OrbitalNode
            position={[2.5, -1.2, 0.5]}
            icon={Sparkles}
            label="AC & Appliances"
            badgeColor="bg-emerald-500"
            delay={3.3}
          />

          {/* Ground Soft Shadow */}
          <ContactShadows
            position={[0, -2.4, 0]}
            opacity={0.5}
            scale={8.5}
            blur={2.8}
            far={4.5}
            color="#000000"
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}

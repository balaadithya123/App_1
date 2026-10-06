import React, { Component, ReactNode, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";
import { ShieldCheck, Zap, Wrench, Hammer, CheckCircle2, Sparkles } from "lucide-react";

// WebGL Error Boundary to prevent crashes on non-WebGL devices/environments
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
    console.warn("WebGL Canvas failed or is unsupported, using 2D fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 3D Central Verified Pro Shield Mesh
function Shield3DModel() {
  const meshRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Gentle floating rotation & pointer tilt
      const targetX = (state.pointer.y * Math.PI) / 8;
      const targetY = (state.pointer.x * Math.PI) / 6;

      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetX,
        delta * 3
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetY + state.clock.getElapsedTime() * 0.2,
        delta * 3
      );
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= delta * 0.4;
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]} scale={1.15}>
      {/* Outer Glow Ring */}
      <mesh ref={outerRingRef} position={[0, 0, -0.2]}>
        <ringGeometry args={[1.6, 1.7, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Main Shield Rounded Box */}
      <RoundedBox args={[2.2, 2.6, 0.35]} radius={0.3} smoothness={8}>
        <meshPhysicalMaterial
          color="#09090b"
          roughness={0.15}
          metalness={0.85}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </RoundedBox>

      {/* Inner Metallic Bevel Edge */}
      <RoundedBox args={[2.0, 2.4, 0.4]} radius={0.25} smoothness={8} position={[0, 0, 0.02]}>
        <meshStandardMaterial
          color="#18181b"
          roughness={0.3}
          metalness={0.7}
        />
      </RoundedBox>

      {/* Embedded HTML Overlay Badge inside 3D Scene */}
      <Html
        transform
        position={[0, 0, 0.22]}
        distanceFactor={3.2}
        className="pointer-events-none select-none flex flex-col items-center justify-center text-white"
      >
        <div className="flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-emerald-500/40 shadow-2xl text-center w-48">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mb-2 shadow-lg animate-pulse">
            <ShieldCheck size={28} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
            Govt ID Verified
          </span>
          <span className="text-[11px] font-extrabold text-white mt-0.5">
            100% Direct Pro
          </span>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-white/10 px-2.5 py-1 rounded-full">
            <Sparkles size={11} className="text-amber-400" />
            <span>0% Commission</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// 3D Orbital Floating Skill Nodes
function OrbitalNode({
  position,
  icon: Icon,
  label,
  color,
  delay = 0,
}: {
  position: [number, number, number];
  icon: React.ElementType;
  label: string;
  color: string;
  delay?: number;
}) {
  const nodeRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (nodeRef.current) {
      const time = state.clock.getElapsedTime() + delay;
      nodeRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.15;
      nodeRef.current.rotation.y = Math.sin(time * 0.8) * 0.2;
    }
  });

  return (
    <group ref={nodeRef} position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.6}>
        <mesh>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshStandardMaterial
            color="#09090b"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        <Html
          transform
          position={[0, 0, 0.48]}
          distanceFactor={3.5}
          className="pointer-events-none select-none"
        >
          <div className="flex items-center gap-2 bg-white/95 text-[#09090B] px-3 py-1.5 rounded-full shadow-lg border border-zinc-200 text-xs font-black whitespace-nowrap">
            <div className={`p-1 rounded-full ${color} text-white`}>
              <Icon size={12} />
            </div>
            <span>{label}</span>
          </div>
        </Html>
      </Float>
    </group>
  );
}

// Fallback Graphic Component for Non-WebGL environments
function FallbackGraphic() {
  return (
    <div className="w-full h-full min-h-[340px] flex items-center justify-center p-6 bg-gradient-to-b from-zinc-900 to-black text-white rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0,transparent_70%)]" />
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

// Helper to test if WebGL context creation works
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

  useEffect(() => {
    setIsSupported(checkWebGLSupport());
  }, []);

  if (!isSupported) {
    return <FallbackGraphic />;
  }

  return (
    <div className="w-full h-[360px] sm:h-[440px] relative rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing">
      <WebGLErrorBoundary fallback={<FallbackGraphic />}>
        <Canvas
          camera={{ position: [0, 0, 6.5], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          {/* Ambient & Directional Lighting */}
          <ambientLight intensity={0.9} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-10, -10, -5]} intensity={0.6} color="#10b981" />
          <pointLight position={[0, 4, 2]} intensity={1.2} color="#10b981" />

          {/* Floating Central Badge */}
          <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.5}>
            <Shield3DModel />
          </Float>

          {/* Floating Skill Nodes Orbiting Around Shield */}
          <OrbitalNode
            position={[-2.4, 1.4, 0.5]}
            icon={Zap}
            label="Electrician"
            color="bg-amber-500"
            delay={0}
          />
          <OrbitalNode
            position={[2.5, 1.2, 0.2]}
            icon={Wrench}
            label="Plumber"
            color="bg-blue-500"
            delay={1.2}
          />
          <OrbitalNode
            position={[-2.3, -1.3, 0.3]}
            icon={Hammer}
            label="Carpenter"
            color="bg-orange-500"
            delay={2.4}
          />
          <OrbitalNode
            position={[2.4, -1.2, 0.6]}
            icon={Sparkles}
            label="Technician"
            color="bg-emerald-500"
            delay={3.6}
          />

          {/* Contact Shadow for Ground Depth */}
          <ContactShadows
            position={[0, -2.4, 0]}
            opacity={0.45}
            scale={8}
            blur={2.5}
            far={4}
            color="#000000"
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}

import { useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { RoundedBox, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

interface Phone3DProps {
  screenshotUrl: string | null;
  angle?: "front" | "left" | "right" | "flat";
  frameColor?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

// iPhone proportions normalized
const PHONE_W = 1;
const PHONE_H = 2.05;
const PHONE_D = 0.1;
const CORNER_R = 0.1;
const BEZEL = 0.035;
const SCREEN_W = PHONE_W - BEZEL * 2;
const SCREEN_H = PHONE_H - BEZEL * 3;

// Camera configs per angle
const angleConfigs: Record<string, { pos: [number, number, number]; rot?: [number, number, number] }> = {
  front: { pos: [0, 0, 3] },
  left: { pos: [-1.2, 0.3, 2.5] },
  right: { pos: [1.2, 0.3, 2.5] },
  flat: { pos: [0, 2.5, 1.2] },
};

const PhoneModel = ({ screenshotUrl, frameColor = "#2a2a2a" }: { screenshotUrl: string | null; frameColor: string }) => {
  const textureRef = useRef<THREE.Texture | null>(null);

  // Load screenshot texture
  const screenTexture = useMemo(() => {
    if (screenshotUrl) {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(screenshotUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      textureRef.current = tex;
      return tex;
    }
    // Placeholder gradient
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(0.35, "#93c5fd");
    grad.addColorStop(0.65, "#c4b5fd");
    grad.addColorStop(1, "#d8b4fe");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(71, 85, 105, 0.8)";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Insert your", canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillText("Screenshot", canvas.width / 2, canvas.height / 2 + 25);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [screenshotUrl]);

  return (
    <group>
      {/* Phone body */}
      <RoundedBox args={[PHONE_W, PHONE_H, PHONE_D]} radius={CORNER_R} smoothness={6}>
        <meshStandardMaterial color={frameColor} metalness={0.85} roughness={0.25} />
      </RoundedBox>

      {/* Screen */}
      <mesh position={[0, -BEZEL * 0.5, PHONE_D / 2 + 0.001]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={screenTexture} />
      </mesh>

      {/* Glass reflection overlay */}
      <mesh position={[0, -BEZEL * 0.5, PHONE_D / 2 + 0.002]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.08}
          color="#ffffff"
          roughness={0}
          metalness={0}
          clearcoat={1}
        />
      </mesh>

      {/* Dynamic Island */}
      <mesh position={[0, PHONE_H / 2 - BEZEL * 3, PHONE_D / 2 + 0.003]}>
        <planeGeometry args={[0.25, 0.055]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Power button */}
      <mesh position={[PHONE_W / 2 + 0.012, 0.15, 0]}>
        <boxGeometry args={[0.015, 0.15, 0.035]} />
        <meshStandardMaterial color={frameColor} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Volume buttons */}
      <mesh position={[-PHONE_W / 2 - 0.012, 0.3, 0]}>
        <boxGeometry args={[0.015, 0.06, 0.035]} />
        <meshStandardMaterial color={frameColor} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[-PHONE_W / 2 - 0.012, 0.12, 0]}>
        <boxGeometry args={[0.015, 0.1, 0.035]} />
        <meshStandardMaterial color={frameColor} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[-PHONE_W / 2 - 0.012, -0.05, 0]}>
        <boxGeometry args={[0.015, 0.1, 0.035]} />
        <meshStandardMaterial color={frameColor} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
};

export const Phone3D = ({
  screenshotUrl,
  angle = "front",
  frameColor = "#2a2a2a",
  width,
  height,
  className = "",
}: Phone3DProps) => {
  const config = angleConfigs[angle] ?? angleConfigs.front!;

  return (
    <div className={className} style={{ width: width ?? "100%", height: height ?? "100%" }}>
      <Canvas
        camera={{ position: config.pos, fov: 30, near: 0.1, far: 100 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1} />
        <directionalLight position={[-2, 2, -3]} intensity={0.3} />
        <pointLight position={[0, 0, 3]} intensity={0.2} />

        <PhoneModel screenshotUrl={screenshotUrl} frameColor={frameColor} />

        <ContactShadows
          position={[0, -PHONE_H / 2 - 0.05, 0]}
          opacity={0.25}
          scale={3}
          blur={2.5}
        />

        <Environment preset="studio" />
      </Canvas>
    </div>
  );
};

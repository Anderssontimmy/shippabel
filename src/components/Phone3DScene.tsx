import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";

// --- Types ---

export interface PhoneInstance {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotationY: number;
  rotationZ: number;
  screenshotUrl: string | null;
  frameColor: string;
}

interface Phone3DSceneProps {
  phones: PhoneInstance[];
  bgColor: string;
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
}

// Phone dimensions
const PW = 0.65;
const PH = 1.35;
const PD = 0.06;
const BZ = 0.02;
const SW = PW - BZ * 2;
const SH = PH - BZ * 3;
const CR = 0.08;

// Rounded rect shape helper
function createRoundedRectShape(w: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// --- Single Phone ---

const PhoneMesh = ({ phone, isSelected }: { phone: PhoneInstance; isSelected: boolean }) => {
  const [screenTexture, setScreenTexture] = useState<THREE.Texture>(() => {
    // Default placeholder
    const c = document.createElement("canvas");
    c.width = 400; c.height = 860;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, "#7dd3fc"); g.addColorStop(0.4, "#93c5fd");
    g.addColorStop(0.7, "#c4b5fd"); g.addColorStop(1, "#d8b4fe");
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(71,85,105,0.8)";
    ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Insert your", c.width / 2, c.height / 2 - 12);
    ctx.fillText("Screenshot", c.width / 2, c.height / 2 + 25);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    return t;
  });

  // Load screenshot as texture when URL changes
  useEffect(() => {
    if (!phone.screenshotUrl) return;
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      setScreenTexture(t);
    };
    img.src = phone.screenshotUrl;
  }, [phone.screenshotUrl]);

  const bodyGeom = useMemo(() => {
    const shape = createRoundedRectShape(PW, PH, CR);
    const geom = new THREE.ExtrudeGeometry(shape, { depth: PD, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 });
    geom.center();
    return geom;
  }, []);

  const rY = (phone.rotationY * Math.PI) / 180;
  const rZ = (phone.rotationZ * Math.PI) / 180;

  return (
    <group
      position={[phone.x * 2.5, phone.y * 2, 0]}
      rotation={[0, rY, rZ]}
      scale={phone.scale}
      userData={{ phoneId: phone.id }}
    >
      {/* Body */}
      <mesh geometry={bodyGeom}>
        <meshStandardMaterial color={phone.frameColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Screen */}
      <mesh position={[0, -BZ * 0.3, PD / 2 + 0.005]}>
        <planeGeometry args={[SW, SH]} />
        <meshBasicMaterial map={screenTexture} />
      </mesh>

      {/* Dynamic Island */}
      <mesh position={[0, PH / 2 - BZ * 3, PD / 2 + 0.006]}>
        <planeGeometry args={[0.16, 0.035]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <lineSegments position={[0, 0, PD / 2 + 0.01]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(PW + 0.04, PH + 0.04)]} />
          <lineBasicMaterial color="#3b82f6" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
};

// --- Mouse interaction ---

const Interaction = ({ onSelect, onMove }: { onSelect: (id: string | null) => void; onMove: (id: string, x: number, y: number) => void }) => {
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragging = useRef<string | null>(null);

  useEffect(() => {
    const el = gl.domElement;

    const mouse = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };

    const findPhone = (m: THREE.Vector2): string | null => {
      raycaster.setFromCamera(m, camera);
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        let o: THREE.Object3D | null = hit.object;
        while (o) { if (o.userData?.phoneId) return o.userData.phoneId as string; o = o.parent; }
      }
      return null;
    };

    const down = (e: MouseEvent) => {
      const id = findPhone(mouse(e));
      onSelect(id);
      if (id) dragging.current = id;
    };

    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = -((e.clientY - r.top) / r.height) * 2 + 1;
      onMove(dragging.current, x, y);
    };

    const up = () => { dragging.current = null; };

    el.addEventListener("mousedown", down);
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseup", up);
    return () => { el.removeEventListener("mousedown", down); el.removeEventListener("mousemove", move); el.removeEventListener("mouseup", up); };
  }, [camera, gl, scene, raycaster, onSelect, onMove]);

  return null;
};

// --- Main Scene ---

export const Phone3DScene = ({ phones, bgColor, width, height, selectedId, onSelect, onMove }: Phone3DSceneProps) => (
  <div style={{ width, height }}>
    <Canvas
      camera={{ position: [0, 0, 4], fov: 35 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      dpr={[1, 2]}
      style={{ background: bgColor }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 5]} intensity={1.2} />
      <directionalLight position={[-2, 1, -2]} intensity={0.3} />
      <pointLight position={[0, 0, 4]} intensity={0.2} />

      {phones.map((p) => (
        <PhoneMesh key={p.id} phone={p} isSelected={p.id === selectedId} />
      ))}

      <Interaction onSelect={onSelect} onMove={onMove} />
    </Canvas>
  </div>
);

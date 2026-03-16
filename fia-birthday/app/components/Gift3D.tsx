"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sparkles, Text, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { GLTF, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import LetterItem from "./LetterItem";
import ScriptItem from "./ScriptItem";
import PolaroidItem from "./PolaroidItem";
import CassetteItem from "./CassetteItem";
import ChildhoodGothicItem from "./ChildhoodGothicItem";

const normalizeAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const dampAngle = (current: number, target: number, lambda: number, delta: number) => {
  const diff = normalizeAngle(target - current);
  return current + diff * (1 - Math.exp(-lambda * delta));
};

const baseMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#c81e1e"),
  roughness: 0.45,
  metalness: 0.05,
  transparent: true,
});

const lidMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#c81e1e"),
  roughness: 0.45,
  metalness: 0.05,
  transparent: true,
  opacity: 1,
});

const openBoxMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#b61a1a"),
  roughness: 0.55,
  metalness: 0.04,
  side: THREE.FrontSide,
  transparent: true,
  opacity: 0,
});

const innerCavityMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#4d1424"),
  emissive: new THREE.Color("#0a0a0a"),
  emissiveIntensity: 0.6,
  roughness: 0.95,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0,
});

const tagMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#f7f5ee"),
  roughness: 0.7,
  metalness: 0.05,
});

const stringMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#d8c9b6"),
  roughness: 0.6,
});

type GiftGLTF = GLTF & {
  nodes: {
    Gift: Mesh;
    NurbsPath: Mesh;
    NurbsPath001: Mesh;
    ribbons: Mesh;
    topribbons: Mesh;
  };
  materials: {
    Palette: MeshStandardMaterial;
  };
};

type PresentModelProps = {
  isOpen: boolean;
  onOpen: () => void;
};

function PresentModel({ isOpen, onOpen }: PresentModelProps) {
  const groupRef = useRef<Group | null>(null);
  const closedGroupRef = useRef<Group | null>(null);
  const closedBowRef = useRef<Group | null>(null);
  const openGroupRef = useRef<Group | null>(null);
  const lidSlideRef = useRef<Group | null>(null);
  const clickRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const openProgress = useRef(0);
  const hasInitialFacing = useRef(false);
  const { nodes, materials } = useGLTF("/models/gift.gltf") as GiftGLTF;
  const rotationSpeed = useMemo(() => 0.35, []);
  const openYaw = useMemo(() => {
    const tagNormal = new THREE.Vector3(Math.sin(1.6), 0, Math.cos(2.6));
    const cameraDir = new THREE.Vector3(2.02, 0, 2.02).normalize();
    const numerator = tagNormal.x * cameraDir.z - tagNormal.z * cameraDir.x;
    const denominator = tagNormal.x * cameraDir.x + tagNormal.z * cameraDir.z;
    return Math.atan2(numerator, denominator) - Math.PI;
  }, []);
  const lidData = useMemo(() => {
    const geometry = nodes.Gift.geometry;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) {
      return null;
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const thickness = Math.max(size.y * 0.08, 0.09);
    return {
      center,
      box,
      size,
      thickness,
    };
  }, [nodes]);
  const bowOffsets = useMemo(() => {
    if (!lidData) {
      return null;
    }
    const pivot = new THREE.Vector3(
      lidData.center.x,
      lidData.box.max.y,
      lidData.box.min.z
    );
    const toOffset = (pos: THREE.Vector3) => pos.sub(pivot);
    return {
      topRibbon: toOffset(new THREE.Vector3(0.01, 0.67, -0.01)),
      bowLeft: toOffset(new THREE.Vector3(-0.5, 0.4, -0.18)),
      bowRight: toOffset(new THREE.Vector3(-0.09, 0.4, 0.52)),
      pivot,
    };
  }, [lidData]);
  const openSideRibbonMaterial = useMemo(() => {
    const mat = materials.Palette.clone();
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;
    return mat;
  }, [materials]);
  const openRibbonClipPlane = useMemo(() => new THREE.Plane(), []);
  const openRibbonClipLocal = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    []
  );
  const closedBowMaterial = useMemo(() => {
    const mat = materials.Palette.clone();
    mat.transparent = true;
    mat.opacity = 1;
    return mat;
  }, [materials]);
  const closedRibbonMaterial = useMemo(() => {
    const mat = materials.Palette.clone();
    mat.transparent = false;
    mat.opacity = 1;
    return mat;
  }, [materials]);
  const lastOpenProgress = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      openProgress.current = THREE.MathUtils.damp(
        openProgress.current,
        isOpen ? 1 : 0,
        isOpen ? 4 : 7,
        delta
      );
      if (!hasInitialFacing.current) {
        groupRef.current.rotation.y = openYaw;
        hasInitialFacing.current = true;
      }
      if (lidData) {
        const cutY = lidData.size.y / 2 - lidData.thickness * 0.2;
        openRibbonClipLocal.constant = cutY;
        openRibbonClipPlane
          .copy(openRibbonClipLocal)
          .applyMatrix4(groupRef.current.matrixWorld);
        openSideRibbonMaterial.clippingPlanes = [openRibbonClipPlane];
        closedRibbonMaterial.clippingPlanes =
          openProgress.current > 0.02 ? [openRibbonClipPlane] : null;
      }
      if (openProgress.current < 0.02) {
        groupRef.current.rotation.y += delta * rotationSpeed;
      } else {
        groupRef.current.rotation.y = dampAngle(
          groupRef.current.rotation.y,
          openYaw,
          5,
          delta
        );
      }
      groupRef.current.rotation.x =
        -0.32 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.1) * 0.06 - 0.05;
    }

    const crossfadeStart = 0.06;
    const crossfadeEnd = 0.18;
    const crossfadeT = THREE.MathUtils.clamp(
      (openProgress.current - crossfadeStart) / (crossfadeEnd - crossfadeStart),
      0,
      1
    );
    const isClosing = openProgress.current < lastOpenProgress.current;
    lastOpenProgress.current = openProgress.current;

    if (closedGroupRef.current) {
      closedGroupRef.current.visible = openProgress.current < crossfadeEnd;
    }
    const bowOpacity =
      1 - THREE.MathUtils.smoothstep(openProgress.current, 0.0, 0.006);
    closedBowMaterial.opacity = bowOpacity;
    if (closedBowRef.current) {
      closedBowRef.current.visible = bowOpacity > 0.25;
    }
    if (openGroupRef.current) {
      openGroupRef.current.visible = isClosing
        ? openProgress.current > 0.14
        : openProgress.current > crossfadeStart;
    }
    if (closedGroupRef.current) {
      closedGroupRef.current.visible = isClosing
        ? true
        : openProgress.current < crossfadeEnd;
    }

    if (lidSlideRef.current && bowOffsets) {
      const closedPos = bowOffsets.pivot;
      const lift = (lidData?.size.y ?? 1) * 0.5;
      const openPos = new THREE.Vector3(
        bowOffsets.pivot.x,
        bowOffsets.pivot.y + lift,
        bowOffsets.pivot.z - (lidData?.size.z ?? 1) * 0.5
      );
      lidSlideRef.current.position.lerpVectors(
        closedPos,
        openPos,
        openProgress.current
      );
      const ease = 1 - Math.pow(1 - openProgress.current, 3);
      lidSlideRef.current.rotation.set(-ease * Math.PI * 0.65, 0, 0);
      lidSlideRef.current.visible = true;
    }

    lidMaterial.opacity = 1;
    lidMaterial.transparent = false;

    const reflectStrength = THREE.MathUtils.smoothstep(
      openProgress.current,
      0.1,
      0.55
    );
    baseMaterial.roughness = THREE.MathUtils.lerp(0.45, 0.14, reflectStrength);
    baseMaterial.metalness = THREE.MathUtils.lerp(0.05, 0.45, reflectStrength);
    lidMaterial.roughness = THREE.MathUtils.lerp(0.45, 0.16, reflectStrength);
    lidMaterial.metalness = THREE.MathUtils.lerp(0.05, 0.4, reflectStrength);
    openBoxMaterial.roughness = THREE.MathUtils.lerp(0.55, 0.2, reflectStrength);
    openBoxMaterial.metalness = THREE.MathUtils.lerp(0.04, 0.32, reflectStrength);

    const baseOpacity = 1 - crossfadeT;
    const openOpacity = crossfadeT;
    if (isClosing) {
      const closingOpenOpacity = THREE.MathUtils.smoothstep(
        openProgress.current,
        0.1,
        0.25
      );
      baseMaterial.opacity = 1;
      baseMaterial.transparent = false;
      openBoxMaterial.opacity = closingOpenOpacity;
      innerCavityMaterial.opacity = closingOpenOpacity;
      openBoxMaterial.transparent = closingOpenOpacity < 0.999;
      innerCavityMaterial.transparent = closingOpenOpacity < 0.999;
    } else {
      const isCrossfading = crossfadeT > 0.02 && crossfadeT < 0.98;
      baseMaterial.opacity = isCrossfading ? baseOpacity : 1;
      openBoxMaterial.opacity = isCrossfading ? openOpacity : openOpacity > 0.5 ? 1 : 0;
      innerCavityMaterial.opacity = isCrossfading ? openOpacity : openOpacity > 0.5 ? 1 : 0;
      baseMaterial.transparent = isCrossfading;
      openBoxMaterial.transparent = isCrossfading;
      innerCavityMaterial.transparent = isCrossfading;
    }
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    clickRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!clickRef.current || isOpen) {
      clickRef.current = null;
      return;
    }

    const dx = event.clientX - clickRef.current.x;
    const dy = event.clientY - clickRef.current.y;
    const distance = Math.hypot(dx, dy);
    const elapsed = performance.now() - clickRef.current.time;
    clickRef.current = null;

    if (distance <= 8 && elapsed < 400) {
      onOpen();
    }
  };

  return (
    <group
      ref={groupRef}
      scale={1.35}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Caixa fechada (antes do clique) */}
      <group ref={closedGroupRef}>
        <mesh geometry={nodes.Gift.geometry} material={baseMaterial}>
          {/* Lacos do presente fechado (com fade no fechamento) */}
          <group ref={closedBowRef}>
            <mesh
              geometry={nodes.NurbsPath.geometry}
                material={closedBowMaterial}
              position={[-0.1, 0.4, -0.18]}
              scale={0.49}
            />
            <mesh
              geometry={nodes.NurbsPath001.geometry}
                material={closedBowMaterial}
              position={[-0.09, 0.4, 0.52]}
              rotation={[-Math.PI, 1.39, -Math.PI]}
              scale={0.49}
            />
            <mesh
              geometry={nodes.topribbons.geometry}
                material={closedBowMaterial}
              position={[0.01, 0.67, -0.01]}
              rotation={[0, -Math.PI / 4, 0]}
              scale={0.49}
            />
          </group>
          <mesh
            geometry={nodes.ribbons.geometry}
            material={closedRibbonMaterial}
            scale={0.49}
          />
        </mesh>
      </group>
      {/* Caixa aberta (depois do clique) */}
      {lidData && (
        <group ref={openGroupRef} position={lidData.center} visible={false}>
          <mesh
            material={openBoxMaterial}
            position={[0, -lidData.size.y / 2 + lidData.thickness / 2, 0]}
          >
            <boxGeometry
              args={[
                lidData.size.x * 1.02,
                lidData.thickness,
                lidData.size.z * 1.02,
              ]}
            />
          </mesh>
          <mesh material={innerCavityMaterial} position={[0, 0, 0]}>
            <boxGeometry
              args={[
                Math.max(lidData.size.x - lidData.thickness * 2 - 0.06, 0.2),
                Math.max(lidData.size.y - lidData.thickness * 2 - 0.06, 0.2),
                Math.max(lidData.size.z - lidData.thickness * 2 - 0.06, 0.2),
              ]}
            />
          </mesh>
          <group scale={[1.02, 1.02, 1.02]}>
            <mesh
              geometry={nodes.ribbons.geometry}
                material={openSideRibbonMaterial}
              scale={0.49}
            />
          </group>
          <mesh
            material={openBoxMaterial}
            position={[lidData.size.x / 2 - lidData.thickness / 2.5, 0, 0]}
          >
            <boxGeometry
              args={[
                lidData.thickness,
                lidData.size.y,
                lidData.size.z * 1.02,
              ]}
            />
          </mesh>
          <mesh
            material={openBoxMaterial}
            position={[-lidData.size.x / 2 + lidData.thickness / 2.5, 0, 0]}
          >
            <boxGeometry
              args={[
                lidData.thickness,
                lidData.size.y,
                lidData.size.z * 1.02,
              ]}
            />
          </mesh>
          <mesh
            material={openBoxMaterial}
            position={[0, 0, lidData.size.z / 2 - lidData.thickness / 2.5]}
          >
            <boxGeometry
              args={[
                lidData.size.x * 1.02,
                lidData.size.y,
                lidData.thickness,
              ]}
            />
          </mesh>
          <mesh
            material={openBoxMaterial}
            position={[0, 0, -lidData.size.z / 2 + lidData.thickness / 2.5]}
          >
            <boxGeometry
              args={[
                lidData.size.x * 1.02,
                lidData.size.y,
                lidData.thickness,
              ]}
            />
          </mesh>
        </group>
      )}
      {/* Tampa que desliza ao abrir */}
      {lidData && (
        <group
          ref={lidSlideRef}
          position={
            bowOffsets
              ? [bowOffsets.pivot.x, bowOffsets.pivot.y, bowOffsets.pivot.z]
              : [0, 0, 0]
          }
        >
          <mesh
            material={lidMaterial}
            position={[0, lidData.thickness * -0.3, lidData.size.z / 2]}
          >
            <boxGeometry
              args={[
                lidData.size.x * 1.02,
                lidData.thickness,
                lidData.size.z * 1.02,
              ]}
            />
          </mesh>
          {bowOffsets && (
            <>
              <mesh
                geometry={nodes.NurbsPath.geometry}
                material={materials.Palette}
                position={bowOffsets.bowLeft}
                scale={0.49}
              />
              <mesh
                geometry={nodes.NurbsPath001.geometry}
                material={materials.Palette}
                position={bowOffsets.bowRight}
                rotation={[-Math.PI, 1.39, -Math.PI]}
                scale={0.49}
              />
              <mesh
                geometry={nodes.topribbons.geometry}
                material={materials.Palette}
                position={bowOffsets.topRibbon}
                rotation={[0, -Math.PI / 4, 0]}
                scale={0.49}
              />
            </>
          )}
        </group>
      )}
      {/* Etiqueta frontal (sempre visivel) */}
      <group position={[0.5, 0.03, 0.27]} rotation={[0.3, 1.6, 0]}>
        <mesh material={tagMaterial}>
          <boxGeometry args={[0.45, 0.25, 0.03]} />
        </mesh>
        <mesh
          material={stringMaterial}
          position={[0, 0.6, 0.015]}
          rotation={[Math.PI / 2, 0, 0]}
        >
        </mesh>
        <Text
          position={[0, 0, 0.025]}
          fontSize={0.075}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          lineHeight={1.2}
          maxWidth={0.62}
        >
          {"De: Lucas\nPara: Fia"}
        </Text>
      </group>
    </group>
  );
}

useGLTF.preload("/models/gift.gltf");

function CameraRig({
  isOpen,
  controlsRef,
  openTarget,
}: {
  isOpen: boolean;
  controlsRef: RefObject<OrbitControlsImpl>;
  openTarget: THREE.Vector3;
}) {
  const { camera } = useThree();
  const openOffset = useMemo(() => new THREE.Vector3(1.9, 3.2, 1.8), []);
  const desiredPosition = useMemo(() => new THREE.Vector3(), []);
  const hasSettled = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasSettled.current = false;
    }
  }, [isOpen]);

  useFrame((_, delta) => {
    if (!isOpen) {
      return;
    }
    desiredPosition.copy(openTarget).add(openOffset);
    if (!hasSettled.current) {
      camera.position.lerp(desiredPosition, 1 - Math.exp(-3 * delta));
      if (camera.position.distanceTo(desiredPosition) < 0.02) {
        hasSettled.current = true;
      }
    }
    camera.lookAt(openTarget);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(openTarget, 1 - Math.exp(-6 * delta));
      controlsRef.current.update();
    }
  });

  return null;
}

export default function Gift3D() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const letterFocus = useMemo(() => new THREE.Vector3(0.3, 1.2, 0.4), []);
  const activeItem = "childhood";
  const openAudioRef = useRef<HTMLAudioElement | null>(null);
  const closeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const openAudio = new Audio("/audio/open-chest.mp3");
    const closeAudio = new Audio("/audio/close-chest.mp3");
    openAudio.preload = "auto";
    closeAudio.preload = "auto";
    openAudio.volume = 0.25;
    closeAudio.volume = 0.25;
    openAudioRef.current = openAudio;
    closeAudioRef.current = closeAudio;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowAction(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      controlsRef.current?.reset();
    }
  }, [isOpen]);

  const playChestSound = (audioRef: React.MutableRefObject<HTMLAudioElement | null>) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const clip = audio.cloneNode(true) as HTMLAudioElement;
    clip.volume = audio.volume;
    clip.play().catch((error) => {
      console.error("Chest audio play failed", error);
    });
  };

  return (
    <div className="gift-canvas">
      {/* Botao inferior (abre/fecha) */}
      <button
        className={`gift-action ${isOpen ? "gift-action-open" : ""} ${
          showAction ? "" : "gift-action-hidden"
        }`}
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            controlsRef.current?.reset();
            playChestSound(closeAudioRef);
            return;
          }
          setIsOpen(true);
          playChestSound(openAudioRef);
        }}
      >
        {isOpen ? "Fechar o presente..." : "Abrir o presente..."}
      </button>
      <Canvas
        camera={{ position: [3.6, 2.6, 4.1], fov: 35, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ localClippingEnabled: true }}
      >
        <CameraRig isOpen={isOpen} controlsRef={controlsRef} openTarget={letterFocus} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 5]} intensity={isOpen ? 1.55 : 1.05} />
        <pointLight
          position={[0.2, 1.8, 2.6]}
          intensity={isOpen ? 1.6 : 0}
          color="#fff3e6"
        />
        <pointLight position={[-3, 1.5, -2]} intensity={0.7} />

        {/* Particulas so quando o presente esta aberto */}
        {isOpen && (
          <Sparkles
            count={40}
            size={2.2}
            speed={0.4}
            opacity={0.6}
            color="#f9ead2"
            scale={[1.5, 1.1, 1.5]}
            position={[0, 0.55, 0]}
          />
        )}
        <Suspense fallback={null}>
          <PresentModel
            isOpen={isOpen}
            onOpen={() => {
              if (!isOpen) {
                setIsOpen(true);
                playChestSound(openAudioRef);
              }
            }}
          />
        </Suspense>
        {activeItem === "letter" && (
          <LetterItem isOpen={isOpen} focusPosition={letterFocus} />
        )}
        {activeItem === "childhood" && (
          <ChildhoodGothicItem isOpen={isOpen} focusPosition={letterFocus} />
        )}
        {activeItem === "script" && (
          <ScriptItem isOpen={isOpen} focusPosition={letterFocus} />
        )}
        {activeItem === "polaroids" && (
          <PolaroidItem isOpen={isOpen} focusPosition={letterFocus} />
        )}
        {activeItem === "cassettes" && (
          <CassetteItem isOpen={isOpen} focusPosition={letterFocus} />
        )}
        <OrbitControls
          ref={controlsRef}
          enableZoom={isOpen}
          enableRotate={!isOpen}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          zoomSpeed={0.6}
          minDistance={isOpen ? 1.6 : 3.1}
          maxDistance={isOpen ? 5.5 : 7}
        />
      </Canvas>
    </div>
  );
}

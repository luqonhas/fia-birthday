"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sparkles, Text, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { GLTF, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

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
  const closedBowMaterial = useMemo(() => {
    const mat = materials.Palette.clone();
    mat.transparent = true;
    mat.opacity = 1;
    return mat;
  }, [materials]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      openProgress.current = THREE.MathUtils.damp(
        openProgress.current,
        isOpen ? 1 : 0,
        4,
        delta
      );
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
      openGroupRef.current.visible = openProgress.current > crossfadeStart;
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
    const isCrossfading = crossfadeT > 0.02 && crossfadeT < 0.98;
    baseMaterial.opacity = isCrossfading ? baseOpacity : 1;
    openBoxMaterial.opacity = isCrossfading ? openOpacity : openOpacity > 0.5 ? 1 : 0;
    innerCavityMaterial.opacity = isCrossfading ? openOpacity : openOpacity > 0.5 ? 1 : 0;
    baseMaterial.transparent = isCrossfading;
    openBoxMaterial.transparent = isCrossfading;
    innerCavityMaterial.transparent = isCrossfading;
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
            material={materials.Palette}
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
              material={materials.Palette}
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
}: {
  isOpen: boolean;
  controlsRef: RefObject<OrbitControlsImpl>;
}) {
  const { camera } = useThree();
  const closedPosition = useMemo(
    () => new THREE.Vector3(3.6, 2.6, 4.1),
    []
  );
  const openPosition = useMemo(() => new THREE.Vector3(2.2, 4.4, 2.2), []);
  const target = useMemo(() => new THREE.Vector3(0, 0.3, 0), []);

  useFrame((_, delta) => {
    if (!isOpen) {
      return;
    }
    camera.position.lerp(openPosition, 1 - Math.exp(-3 * delta));
    camera.lookAt(target);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(target, 1 - Math.exp(-3 * delta));
      controlsRef.current.update();
    }
  });

  return null;
}

export default function Gift3D() {
  const [isOpen, setIsOpen] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className="gift-canvas">
      {/* Texto antes de abrir */}
      {!isOpen && <div className="gift-hint">Clique para abrir o presente...</div>}
      {isOpen && (
        <button
          className="gift-close"
          type="button"
          onClick={() => {
            setIsOpen(false);
            controlsRef.current?.reset();
          }}
        >
          Fechar presente
        </button>
      )}
      <Canvas
        camera={{ position: [3.6, 2.6, 4.1], fov: 35, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ localClippingEnabled: true }}
      >
        <CameraRig isOpen={isOpen} controlsRef={controlsRef} />
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
            onOpen={() => setIsOpen(true)}
          />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          enableZoom
          enableRotate={!isOpen}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          zoomSpeed={0.6}
          minDistance={3.1}
          maxDistance={7}
        />
      </Canvas>
    </div>
  );
}

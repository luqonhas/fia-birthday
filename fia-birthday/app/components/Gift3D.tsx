"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, useGLTF } from "@react-three/drei";
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
  transparent: true,
});

const lidMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#c81e1e"),
  roughness: 0.45,
  transparent: true,
  opacity: 1,
});

const openBoxMaterial = Object.assign(new THREE.MeshStandardMaterial(), {
  color: new THREE.Color("#b61a1a"),
  roughness: 0.55,
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
          6,
          delta
        );
        if (openProgress.current > 0.7) {
          groupRef.current.rotation.y = openYaw;
        }
      }
      groupRef.current.rotation.x =
        -0.32 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.1) * 0.06 - 0.05;
    }

    if (closedGroupRef.current) {
      closedGroupRef.current.visible = openProgress.current < 0.2;
    }
    if (openGroupRef.current) {
      openGroupRef.current.visible = openProgress.current > 0.05;
    }

    if (lidSlideRef.current && bowOffsets) {
      const closedPos = bowOffsets.pivot;
      const lift = (lidData?.size.y ?? 1) * 2.1;
      const openPos = new THREE.Vector3(
        bowOffsets.pivot.x,
        bowOffsets.pivot.y + lift,
        bowOffsets.pivot.z - (lidData?.size.z ?? 1) * 0.15
      );
      lidSlideRef.current.position.lerpVectors(
        closedPos,
        openPos,
        openProgress.current
      );
      const ease = 1 - Math.pow(1 - openProgress.current, 3);
      lidSlideRef.current.rotation.set(-ease * Math.PI * 0.65, 0, 0);
      lidSlideRef.current.visible = openProgress.current < 0.65;
    }

    const fadeStart = 0.35;
    const fadeWindow = 0.3;
    const fadeProgress = Math.max(
      0,
      (openProgress.current - fadeStart) / fadeWindow
    );
    lidMaterial.opacity = 1 - Math.min(1, fadeProgress);

    baseMaterial.opacity = 1 - openProgress.current;
    openBoxMaterial.opacity = openProgress.current;
    innerCavityMaterial.opacity = openProgress.current;
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
      <group ref={closedGroupRef}>
        <mesh geometry={nodes.Gift.geometry} material={baseMaterial}>
          <mesh
            geometry={nodes.NurbsPath.geometry}
            material={materials.Palette}
            position={[-0.5, 0.4, -0.18]}
            scale={0.49}
          />
          <mesh
            geometry={nodes.NurbsPath001.geometry}
            material={materials.Palette}
            position={[-0.09, 0.4, 0.52]}
            rotation={[-Math.PI, 1.39, -Math.PI]}
            scale={0.49}
          />
          <mesh
            geometry={nodes.ribbons.geometry}
            material={materials.Palette}
            scale={0.49}
          />
          <mesh
            geometry={nodes.topribbons.geometry}
            material={materials.Palette}
            position={[0.01, 0.67, -0.01]}
            rotation={[0, -Math.PI / 4, 0]}
            scale={0.49}
          />
        </mesh>
      </group>
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
            position={[lidData.size.x / 2 - lidData.thickness / 2, 0, 0]}
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
            position={[-lidData.size.x / 2 + lidData.thickness / 2, 0, 0]}
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
            position={[0, 0, lidData.size.z / 2 - lidData.thickness / 2]}
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
            position={[0, 0, -lidData.size.z / 2 + lidData.thickness / 2]}
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
      <group position={[0.50, 0.03, 0.27]} rotation={[.3, 1.6, 0]}>
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
      <Canvas
        camera={{ position: [3.6, 2.6, 4.1], fov: 35, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ localClippingEnabled: true }}
      >
        <CameraRig isOpen={isOpen} controlsRef={controlsRef} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[6, 8, 5]} intensity={1.05} />
        <pointLight position={[-3, 1.5, -2]} intensity={0.7} />

        <Suspense fallback={null}>
          <PresentModel isOpen={isOpen} onOpen={() => setIsOpen(true)} />
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

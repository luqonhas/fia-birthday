"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";
import * as THREE from "three";

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

function PresentModel() {
  const groupRef = useRef<Group | null>(null);
  const { nodes, materials } = useGLTF("/models/gift.gltf") as GiftGLTF;
  const rotationSpeed = useMemo(() => 0.35, []);
  const giftMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial();
    material.color = new THREE.Color("#c81e1e");
    material.roughness = 0.45;
    return material;
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.rotation.x =
        -0.18 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.1) * 0.06 - 0.05;
    }
  });

  return (
    <group ref={groupRef} scale={1.35}>
      <mesh geometry={nodes.Gift.geometry} material={giftMaterial}>
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
  );
}

useGLTF.preload("/models/gift.gltf");

export default function Gift3D() {
  return (
    <div className="gift-canvas">
      <Canvas camera={{ position: [3.6, 2.6, 4.1], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[6, 8, 5]} intensity={1.05} />
        <pointLight position={[-3, 1.5, -2]} intensity={0.7} />

        <Suspense fallback={null}>
          <PresentModel />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
        />
      </Canvas>
    </div>
  );
}

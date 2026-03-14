"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type ScriptItemProps = {
  isOpen: boolean;
  focusPosition: THREE.Vector3;
};

export default function ScriptItem({ isOpen, focusPosition }: ScriptItemProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const scriptGroupRef = useRef<THREE.Group | null>(null);
  const letterGroupRef = useRef<THREE.Group | null>(null);
  const progress = useRef(0);
  const scriptProgress = useRef(0);
  const letterProgress = useRef(0);
  const openStartRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);
  const { camera } = useThree();

  const startPos = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const endPos = useMemo(() => focusPosition.clone(), [focusPosition]);
  const scriptEnd = useMemo(() => new THREE.Vector3(-0.35, 0.05, 0), []);
  const scriptStart = useMemo(
    () => new THREE.Vector3(-0.35, -0.42, 0.05),
    []
  );
  const scriptOvershoot = useMemo(() => new THREE.Vector3(-0.35, 0.12, 0), []);
  const letterEnd = useMemo(() => new THREE.Vector3(0.68, 0.02, 0.05), []);
  const letterStart = useMemo(
    () => new THREE.Vector3(0.68, -0.5, 0.03),
    []
  );
  const letterOvershoot = useMemo(() => new THREE.Vector3(0.68, 0.09, 0.05), []);
  const tiltQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0.34, -0.04)),
    []
  );
  const floatEuler = useMemo(() => new THREE.Euler(), []);
  const floatQuat = useMemo(() => new THREE.Quaternion(), []);

  const sheetSize = useMemo(() => new THREE.Vector3(1.25, 1.82, 0.01), []);
  const scriptUp = useMemo(() => new THREE.Vector3(), []);
  const letterUp = useMemo(() => new THREE.Vector3(), []);
  const sheetOffsets = useMemo(
    () => [
      new THREE.Vector3(0.0, 0.0, 0.0),
      new THREE.Vector3(-0.015, -0.012, -0.012),
      new THREE.Vector3(-0.03, -0.03, -0.03),
    ],
    []
  );

  const scriptTitle = useMemo(() => "Roteiro: Epifania", []);
  const letterText = useMemo(
    () =>
      "você é uma pessoa completamente criativa,\n" +
      "que enxerga o mundo de um jeito diferente...\n\n" +
      "e a forma como você se expressa\n" +
      "é impossível não sentir exatamente isso.\n\n" +
      "você já é uma diretora com oscar\n" +
      "na sua própria vida,\n" +
      "só não sacou isso ainda.",
    []
  );

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current = [];
    if (!isOpen) {
      isActiveRef.current = false;
      progress.current = 0;
      scriptProgress.current = 0;
      letterProgress.current = 0;
      openStartRef.current = null;
      return;
    }

    const activationTimer = window.setTimeout(() => {
      isActiveRef.current = true;
    }, 1000);
    timeoutsRef.current.push(activationTimer);

    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [isOpen]);

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }
    const target = isActiveRef.current ? 1 : 0;
    const lambda = isActiveRef.current ? 4 : 6;
    progress.current = THREE.MathUtils.damp(progress.current, target, lambda, delta);
    const t = progress.current;
    const eased = THREE.MathUtils.smoothstep(t, 0, 1);
    groupRef.current.position.lerpVectors(startPos, endPos, eased);
    const time = state.clock.elapsedTime;
    const floatY = Math.sin(time * 1.2) * 0.025;
    const floatX = Math.sin(time * 0.7) * 0.012;
    groupRef.current.position.y += floatY;
    groupRef.current.position.x += floatX;
    floatEuler.set(Math.sin(time * 1.1) * 0.02, 0, Math.sin(time * 0.9) * 0.02);
    floatQuat.setFromEuler(floatEuler);
    groupRef.current.quaternion
      .copy(camera.quaternion)
      .multiply(tiltQuat)
      .multiply(floatQuat);
    groupRef.current.scale.setScalar(0.88 + t * 0.12);
    groupRef.current.visible = t > 0.01;

    if (!scriptGroupRef.current || !letterGroupRef.current) {
      return;
    }

    if (!isActiveRef.current) {
      scriptGroupRef.current.visible = false;
      letterGroupRef.current.visible = false;
      return;
    }

    if (openStartRef.current === null) {
      openStartRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - openStartRef.current;
    const scriptTarget = THREE.MathUtils.clamp(elapsed / 1.35, 0, 1);
    const letterTarget = THREE.MathUtils.clamp((elapsed - 0.9) / 1.15, 0, 1);

    scriptProgress.current = THREE.MathUtils.damp(
      scriptProgress.current,
      scriptTarget,
      6,
      delta
    );
    letterProgress.current = THREE.MathUtils.damp(
      letterProgress.current,
      letterTarget,
      6,
      delta
    );

    const scriptEase = THREE.MathUtils.smoothstep(scriptProgress.current, 0, 1);
    const letterEase = THREE.MathUtils.smoothstep(letterProgress.current, 0, 1);
    const scriptOvershootT = THREE.MathUtils.clamp(
      (scriptProgress.current - 0.75) / 0.25,
      0,
      1
    );
    const letterOvershootT = THREE.MathUtils.clamp(
      (letterProgress.current - 0.78) / 0.22,
      0,
      1
    );

    scriptUp.lerpVectors(scriptStart, scriptOvershoot, scriptEase);
    scriptGroupRef.current.position.lerpVectors(
      scriptUp,
      scriptEnd,
      scriptOvershootT
    );
    scriptGroupRef.current.scale.setScalar(0.92 + scriptEase * 0.08);
    scriptGroupRef.current.rotation.z = -0.05 + (1 - scriptEase) * 0.08;
    scriptGroupRef.current.visible = scriptProgress.current > 0.02;

    letterUp.lerpVectors(letterStart, letterOvershoot, letterEase);
    letterGroupRef.current.position.lerpVectors(
      letterUp,
      letterEnd,
      letterOvershootT
    );
    letterGroupRef.current.scale.setScalar(0.92 + letterEase * 0.08);
    letterGroupRef.current.rotation.z = 0.04 + (1 - letterEase) * -0.07;
    letterGroupRef.current.visible = letterProgress.current > 0.02;
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={scriptGroupRef} position={scriptEnd} rotation={[0, 0, -0.05]}>
        {sheetOffsets.map((offset, index) => (
          <mesh
            key={`sheet-${index}`}
            position={[offset.x, offset.y, offset.z]}
            castShadow={false}
            receiveShadow={false}
          >
            <boxGeometry args={[sheetSize.x, sheetSize.y, sheetSize.z]} />
            <meshStandardMaterial
              color={index === 0 ? "#f7f4ed" : "#ece7de"}
              roughness={0.9}
              metalness={0.02}
            />
          </mesh>
        ))}

        <mesh
          position={[sheetSize.x * -0.43, sheetSize.y * 0.43, 0.08]}
          rotation={[0, 0, 0.6]}
        >
          <boxGeometry args={[0.08, 0.02, 0.01]} />
          <meshStandardMaterial color="#b7b7b7" roughness={0.25} metalness={0.1} />
        </mesh>

        <mesh position={[-sheetSize.x * 0.26, -sheetSize.y * 0.4, 0.05]}>
          <boxGeometry args={[0.42, 0.16, 0.02]} />
          <meshStandardMaterial color="#f1d7a6" roughness={0.7} />
        </mesh>

        <Text
          position={[0, 0.08, sheetSize.z * 0.6]}
          fontSize={0.04}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.1}
        >
          {scriptTitle}
        </Text>
      </group>

      <group ref={letterGroupRef} position={letterEnd} rotation={[0, 0, 0.04]}>
        <mesh position={[-0.35, -0.08, -0.03]} renderOrder={1}>
          <planeGeometry args={[0.5, 1.0]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.06} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.1, 1.1, 0.01]} />
          <meshStandardMaterial
            color="#f8f5ef"
            roughness={0.9}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Text
          position={[0, 0.42, 0.04]}
          fontSize={0.055}
          color="#1a1a1a"
          anchorX="center"
          anchorY="top"
          lineHeight={1.3}
          maxWidth={0.9}
        >
          {letterText}
        </Text>
      </group>
    </group>
  );
}

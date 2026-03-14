"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type LetterItemProps = {
  isOpen: boolean;
  focusPosition: THREE.Vector3;
};

export default function LetterItem({ isOpen, focusPosition }: LetterItemProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const progress = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);
  const { camera } = useThree();

  const startPos = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const endPos = useMemo(() => focusPosition.clone(), [focusPosition]);
  const tiltQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0.2, -0.06)),
    []
  );
  const floatEuler = useMemo(() => new THREE.Euler(), []);
  const floatQuat = useMemo(() => new THREE.Quaternion(), []);
  const letterText = useMemo(
    () =>
      "Sofia,\n\n" +
      "talvez seja um pouco estranho receber um site de aniversário.\n\n" +
      "mas você também é uma pessoa estranhamente incrível...\n\n" +
      "então, achei justo fazer algo diferente pra você.",
    []
  );

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current = [];
    if (!isOpen) {
      isActiveRef.current = false;
      progress.current = 0;
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
    const floatY = Math.sin(time * 1.2) * 0.03;
    const floatX = Math.sin(time * 0.7) * 0.01;
    groupRef.current.position.y += floatY;
    groupRef.current.position.x += floatX;
    floatEuler.set(Math.sin(time * 1.1) * 0.02, 0, Math.sin(time * 0.9) * 0.03);
    floatQuat.setFromEuler(floatEuler);
    groupRef.current.quaternion
      .copy(camera.quaternion)
      .multiply(tiltQuat)
      .multiply(floatQuat);
    groupRef.current.scale.setScalar(0.85 + t * 0.12);
    groupRef.current.visible = t > 0.01;

  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <boxGeometry args={[1.8, 1.25, 0.06]} />
        <meshStandardMaterial
          color="#f8f5ef"
          roughness={0.9}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Text
        position={[0, 0.5, 0.04]}
        fontSize={0.07}
        color="#1a1a1a"
        anchorX="center"
        anchorY="top"
        lineHeight={1.35}
        maxWidth={1.45}
      >
        {letterText}
      </Text>
    </group>
  );
}

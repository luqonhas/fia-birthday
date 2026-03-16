"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type LetterItemProps = {
  isOpen: boolean;
  focusPosition: THREE.Vector3;
};

export default function LetterItem({ isOpen, focusPosition }: LetterItemProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const flagGroupRef = useRef<THREE.Group | null>(null);
  const flagMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const progress = useRef(0);
  const flagProgress = useRef(0);
  const openStartRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);
  const { camera } = useThree();
  const flagTexture = useTexture("/images/slyterin-flag.svg");

  const startPos = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const endPos = useMemo(
    () => focusPosition.clone().add(new THREE.Vector3(0.28, 0, 0)),
    [focusPosition]
  );
  const flagSize = useMemo(() => {
    const height = 1.5;
    const width = height * (266 / 850);
    return new THREE.Vector2(width, height);
  }, []);
  const flagEnd = useMemo(() => new THREE.Vector3(-1.05, 0.02, 0.06), []);
  const flagStart = useMemo(() => new THREE.Vector3(-0.55, -0.08, -0.08), []);
  const flagBaseRotation = useMemo(() => new THREE.Euler(0, 0, -0.12), []);
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
      "mas você também não é uma pessoa completamente normal...\n\n" +
      "então, achei justo fazer algo diferente pra você.",
    []
  );

  useEffect(() => {
    flagTexture.colorSpace = THREE.SRGBColorSpace;
    flagTexture.needsUpdate = true;
  }, [flagTexture]);

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current = [];
    if (!isOpen) {
      isActiveRef.current = false;
      progress.current = 0;
      flagProgress.current = 0;
      openStartRef.current = null;
      if (flagGroupRef.current) {
        flagGroupRef.current.visible = false;
      }
      if (flagMaterialRef.current) {
        flagMaterialRef.current.opacity = 0;
      }
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
    if (openStartRef.current === null && isOpen) {
      openStartRef.current = state.clock.elapsedTime;
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

    if (flagGroupRef.current && flagMaterialRef.current && openStartRef.current !== null) {
      const elapsed = state.clock.elapsedTime - openStartRef.current;
      const flagTarget = elapsed > 3 ? 1 : 0;
      flagProgress.current = THREE.MathUtils.damp(
        flagProgress.current,
        flagTarget,
        4,
        delta
      );
      const flagT = THREE.MathUtils.clamp(flagProgress.current, 0, 1);
      const eased = THREE.MathUtils.smoothstep(flagT, 0, 1);
      flagGroupRef.current.position.lerpVectors(flagStart, flagEnd, eased);
      const sway = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
      const lift = Math.sin(state.clock.elapsedTime * 1.1) * 0.01;
      flagGroupRef.current.position.y += lift;
      flagGroupRef.current.rotation.set(
        flagBaseRotation.x,
        flagBaseRotation.y,
        flagBaseRotation.z + sway
      );
      flagGroupRef.current.visible = flagT > 0.01;
      flagGroupRef.current.scale.setScalar(0.92 + eased * 0.08);
      flagMaterialRef.current.opacity = 1;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group
        ref={flagGroupRef}
        position={flagEnd}
        visible={false}
      >
        <mesh>
          <planeGeometry args={[flagSize.x, flagSize.y]} />
          <meshStandardMaterial
            ref={flagMaterialRef}
            map={flagTexture}
            transparent
            opacity={0}
            roughness={0.8}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
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

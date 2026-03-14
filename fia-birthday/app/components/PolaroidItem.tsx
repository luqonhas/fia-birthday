"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type PolaroidItemProps = {
  isOpen: boolean;
  focusPosition: THREE.Vector3;
};

type PolaroidPose = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
};

export default function PolaroidItem({ isOpen, focusPosition }: PolaroidItemProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const polaroidRefs = useRef<Array<THREE.Group | null>>([]);
  const topTapeRef = useRef<THREE.Group | null>(null);
  const bottomTapeRef = useRef<THREE.Group | null>(null);
  const progress = useRef(0);
  const openStartRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);
  const { camera } = useThree();

  const startPos = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const endPos = useMemo(() => focusPosition.clone(), [focusPosition]);
  const tiltQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16, 0.24, -0.03)),
    []
  );
  const floatEuler = useMemo(() => new THREE.Euler(), []);
  const floatQuat = useMemo(() => new THREE.Quaternion(), []);

  const polaroidPoses = useMemo<PolaroidPose[]>(
    () => [
      {
        position: new THREE.Vector3(-0.7, 0.15, 0.08),
        rotation: new THREE.Euler(0, 0, -0.14),
      },
      {
        position: new THREE.Vector3(-0.22, 0.38, 0.05),
        rotation: new THREE.Euler(0, 0, 0.08),
      },
      {
        position: new THREE.Vector3(0.28, 0.12, 0.1),
        rotation: new THREE.Euler(0, 0, -0.05),
      },
      {
        position: new THREE.Vector3(0.72, 0.32, 0.02),
        rotation: new THREE.Euler(0, 0, 0.12),
      },
    ],
    []
  );

  const polaroidStart = useMemo(
    () => polaroidPoses.map((pose) => pose.position.clone().add(new THREE.Vector3(0, -0.6, 0))),
    [polaroidPoses]
  );

  const topTapePos = useMemo(() => new THREE.Vector3(0, 0.92, 0.12), []);
  const bottomTapePos = useMemo(() => new THREE.Vector3(0, -0.64, 0.12), []);
  const tapeStartOffset = useMemo(() => new THREE.Vector3(0, -0.5, 0), []);

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current = [];
    if (!isOpen) {
      isActiveRef.current = false;
      progress.current = 0;
      openStartRef.current = null;
      return;
    }

    const activationTimer = window.setTimeout(() => {
      isActiveRef.current = true;
    }, 900);
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
    const floatY = Math.sin(time * 1.1) * 0.02;
    const floatX = Math.sin(time * 0.8) * 0.01;
    groupRef.current.position.y += floatY;
    groupRef.current.position.x += floatX;
    floatEuler.set(Math.sin(time * 0.9) * 0.02, 0, Math.sin(time * 0.7) * 0.02);
    floatQuat.setFromEuler(floatEuler);
    groupRef.current.quaternion
      .copy(camera.quaternion)
      .multiply(tiltQuat)
      .multiply(floatQuat);
    groupRef.current.scale.setScalar(0.88 + t * 0.12);
    groupRef.current.visible = t > 0.01;

    if (!isActiveRef.current) {
      polaroidRefs.current.forEach((ref) => {
        if (ref) {
          ref.visible = false;
        }
      });
      if (topTapeRef.current) {
        topTapeRef.current.visible = false;
      }
      if (bottomTapeRef.current) {
        bottomTapeRef.current.visible = false;
      }
      return;
    }

    if (openStartRef.current === null) {
      openStartRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - openStartRef.current;

    polaroidRefs.current.forEach((ref, index) => {
      if (!ref) {
        return;
      }
      const delay = index * 0.22;
      const localT = THREE.MathUtils.clamp((elapsed - delay) / 1.2, 0, 1);
      const easedT = THREE.MathUtils.smoothstep(localT, 0, 1);
      ref.position.lerpVectors(polaroidStart[index], polaroidPoses[index].position, easedT);
      ref.rotation.set(0, 0, polaroidPoses[index].rotation.z);
      ref.scale.setScalar(0.9 + easedT * 0.1);
      ref.visible = localT > 0.02;
    });

    const topTapeT = THREE.MathUtils.clamp((elapsed - 1.1) / 1.0, 0, 1);
    const bottomTapeT = THREE.MathUtils.clamp((elapsed - 2.1) / 1.0, 0, 1);
    if (topTapeRef.current) {
      const easedTop = THREE.MathUtils.smoothstep(topTapeT, 0, 1);
      topTapeRef.current.position.lerpVectors(
        topTapePos.clone().add(tapeStartOffset),
        topTapePos,
        easedTop
      );
      topTapeRef.current.rotation.z = -0.05 + (1 - easedTop) * 0.08;
      topTapeRef.current.visible = topTapeT > 0.02;
    }
    if (bottomTapeRef.current) {
      const easedBottom = THREE.MathUtils.smoothstep(bottomTapeT, 0, 1);
      bottomTapeRef.current.position.lerpVectors(
        bottomTapePos.clone().add(tapeStartOffset),
        bottomTapePos,
        easedBottom
      );
      bottomTapeRef.current.rotation.z = 0.03 + (1 - easedBottom) * -0.08;
      bottomTapeRef.current.visible = bottomTapeT > 0.02;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {polaroidPoses.map((pose, index) => (
        <group
          key={`polaroid-${index}`}
          ref={(node) => {
            polaroidRefs.current[index] = node;
          }}
          position={pose.position}
        >
          <mesh>
            <boxGeometry args={[0.7, 0.85, 0.03]} />
            <meshStandardMaterial color="#f6f2ea" roughness={0.9} metalness={0.02} />
          </mesh>
          <mesh position={[0, 0.08, 0.02]}>
            <planeGeometry args={[0.58, 0.52]} />
            <meshStandardMaterial color="#d7d7d7" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.26, 0.02]}>
            <planeGeometry args={[0.58, 0.16]} />
            <meshStandardMaterial color="#f6f2ea" roughness={0.9} />
          </mesh>
        </group>
      ))}

      <group ref={topTapeRef} position={topTapePos}>
        <mesh>
          <boxGeometry args={[1.55, 0.16, 0.02]} />
          <meshStandardMaterial color="#f1d7a6" roughness={0.7} />
        </mesh>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.045}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.35}
        >
          {"você sorri de um jeito que muda o ambiente..."}
        </Text>
      </group>

      <group ref={bottomTapeRef} position={bottomTapePos}>
        <mesh>
          <boxGeometry args={[1.25, 0.16, 0.02]} />
          <meshStandardMaterial color="#f1d7a6" roughness={0.7} />
        </mesh>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.045}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.1}
        >
          {"... eu sou maluco no seu sorriso"}
        </Text>
      </group>
    </group>
  );
}

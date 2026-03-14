"use client";

import { Text } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type CassetteItemProps = {
  isOpen: boolean;
  focusPosition: THREE.Vector3;
};

type CassettePose = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  color: string;
  label: string;
  accent: string;
  trackSrc?: string;
};

export default function CassetteItem({ isOpen, focusPosition }: CassetteItemProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const cassetteRefs = useRef<Array<THREE.Group | null>>([]);
  const topTapeRef = useRef<THREE.Group | null>(null);
  const progress = useRef(0);
  const openStartRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);
  const focusIndexRef = useRef<number | null>(null);
  const focusAmounts = useRef<number[]>([]);
  const audioRefs = useRef<Array<HTMLAudioElement | null>>([]);
  const playingIndexRef = useRef<number | null>(null);
  const { camera } = useThree();

  const startPos = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const endPos = useMemo(() => focusPosition.clone(), [focusPosition]);
  const tiltQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16, 0.22, -0.03)),
    []
  );
  const floatEuler = useMemo(() => new THREE.Euler(), []);
  const floatQuat = useMemo(() => new THREE.Quaternion(), []);

  const cassettePoses = useMemo<CassettePose[]>(
    () => [
      {
        position: new THREE.Vector3(0.12, 0.42, 0.08),
        rotation: new THREE.Euler(0, 0, -0.12),
        color: "#1f3b8f",
        accent: "#f7f0e6",
        label: "Fita 01",
        trackSrc: "",
      },
      {
        position: new THREE.Vector3(-0.16, -0.02, 0.05),
        rotation: new THREE.Euler(0, 0, 0.08),
        color: "#3a1d2b",
        accent: "#f3d7b0",
        label: "Fita 02",
        trackSrc: "",
      },
      {
        position: new THREE.Vector3(0.1, -0.52, 0.1),
        rotation: new THREE.Euler(0, 0, 0.14),
        color: "#0e2f2a",
        accent: "#f4e6d6",
        label: "Fita 03",
        trackSrc: "",
      },
    ],
    []
  );

  const cassetteStart = useMemo(
    () =>
      cassettePoses.map((pose) =>
        pose.position.clone().add(new THREE.Vector3(0, -0.65, 0))
      ),
    [cassettePoses]
  );

  const topTapePos = useMemo(() => new THREE.Vector3(0, 0.98, 0.12), []);
  const tapeStartOffset = useMemo(() => new THREE.Vector3(0, -0.5, 0), []);

  const stopAllAudio = () => {
    audioRefs.current.forEach((audio) => {
      if (!audio) {
        return;
      }
      audio.pause();
      audio.currentTime = 0;
    });
    playingIndexRef.current = null;
  };

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current = [];
    if (!isOpen) {
      isActiveRef.current = false;
      progress.current = 0;
      openStartRef.current = null;
      focusIndexRef.current = null;
      stopAllAudio();
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

  useEffect(() => {
    focusAmounts.current = cassettePoses.map(() => 0);
    audioRefs.current = cassettePoses.map((pose) => {
      if (!pose.trackSrc) {
        return null;
      }
      const audio = new Audio(pose.trackSrc);
      audio.preload = "auto";
      return audio;
    });
  }, [cassettePoses]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>, index: number) => {
    event.stopPropagation();
    focusIndexRef.current = focusIndexRef.current === index ? null : index;

    const audio = audioRefs.current[index];
    if (!audio) {
      return;
    }

    if (playingIndexRef.current === index) {
      if (audio.paused) {
        audio.play().catch((error) => {
          console.error("Audio play failed", error);
        });
      } else {
        audio.pause();
        playingIndexRef.current = null;
      }
      return;
    }

    stopAllAudio();
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error("Audio play failed", error);
    });
    playingIndexRef.current = index;
  };

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
    groupRef.current.scale.setScalar(0.9 + t * 0.1);
    groupRef.current.visible = t > 0.01;

    if (!isActiveRef.current) {
      cassetteRefs.current.forEach((ref) => {
        if (ref) {
          ref.visible = false;
        }
      });
      if (topTapeRef.current) {
        topTapeRef.current.visible = false;
      }
      return;
    }

    if (openStartRef.current === null) {
      openStartRef.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - openStartRef.current;

    cassetteRefs.current.forEach((ref, index) => {
      if (!ref) {
        return;
      }
      const delay = index * 0.28;
      const localT = THREE.MathUtils.clamp((elapsed - delay) / 1.3, 0, 1);
      const easedT = THREE.MathUtils.smoothstep(localT, 0, 1);
      ref.position.lerpVectors(cassetteStart[index], cassettePoses[index].position, easedT);
      const focusTarget = focusIndexRef.current === index ? 1 : 0;
      const focusValue = THREE.MathUtils.damp(
        focusAmounts.current[index] ?? 0,
        focusTarget,
        6,
        delta
      );
      focusAmounts.current[index] = focusValue;
      ref.position.z += focusValue * 0.2;
      ref.position.y += focusValue * 0.04;
      ref.rotation.set(
        0,
        0,
        THREE.MathUtils.lerp(cassettePoses[index].rotation.z, 0, focusValue)
      );
      ref.scale.setScalar(0.92 + easedT * 0.08 + focusValue * 0.12);
      ref.visible = localT > 0.02;
    });

    const topTapeT = THREE.MathUtils.clamp((elapsed - 1.2) / 1.1, 0, 1);
    if (topTapeRef.current) {
      const easedTop = THREE.MathUtils.smoothstep(topTapeT, 0, 1);
      topTapeRef.current.position.lerpVectors(
        topTapePos.clone().add(tapeStartOffset),
        topTapePos,
        easedTop
      );
      topTapeRef.current.rotation.z = -0.04 + (1 - easedTop) * 0.08;
      topTapeRef.current.visible = topTapeT > 0.02;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {cassettePoses.map((pose, index) => (
        <group
          key={`cassette-${index}`}
          ref={(node) => {
            cassetteRefs.current[index] = node;
          }}
          position={pose.position}
          onPointerDown={(event) => handlePointerDown(event, index)}
        >
          <mesh>
            <boxGeometry args={[1.05, 0.62, 0.12]} />
            <meshStandardMaterial color={pose.color} roughness={0.75} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.06, 0.065]}>
            <planeGeometry args={[0.85, 0.28]} />
            <meshStandardMaterial color={pose.accent} roughness={0.6} />
          </mesh>
          <Text
            position={[0, 0.06, 0.068]}
            fontSize={0.045}
            color="#1a1a1a"
            anchorX="center"
            anchorY="middle"
            maxWidth={0.78}
          >
            {pose.label}
          </Text>
          <mesh position={[-0.27, -0.07, 0.065]}>
            <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
          </mesh>
          <mesh position={[0.27, -0.07, 0.065]}>
            <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.18, 0.065]}>
            <planeGeometry args={[0.6, 0.12]} />
            <meshStandardMaterial color="#0f0f0f" roughness={0.8} />
          </mesh>
        </group>
      ))}

      <group ref={topTapeRef} position={topTapePos}>
        <mesh>
          <boxGeometry args={[1.85, 0.16, 0.02]} />
          <meshStandardMaterial color="#f1d7a6" roughness={0.7} />
        </mesh>
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.045}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.7}
        >
          {"algumas músicas me lembram quando estive com você"}
        </Text>
      </group>
    </group>
  );
}

"use client";

import { Text, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type ChildhoodGothicItemProps = {
  isOpen: boolean;
  focusPosition: THREE.Vector3;
};

type Pose = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
};

export default function ChildhoodGothicItem({
  isOpen,
  focusPosition,
}: ChildhoodGothicItemProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const paperRefs = useRef<Array<THREE.Group | null>>([]);
  const polaroidRefs = useRef<Array<THREE.Group | null>>([]);
  const focusIndexRef = useRef<number | null>(null);
  const focusAmounts = useRef<number[]>([]);
  const progress = useRef(0);
  const openStartRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);
  const { camera } = useThree();
  const polaroidTextures = useTexture([
    "/images/data.jpeg",
    "/images/radical.jpeg",
    "/images/era-agua.jpeg",
  ]);
  useEffect(() => {
    polaroidTextures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });
  }, [polaroidTextures]);

  const startPos = useMemo(() => new THREE.Vector3(0, 0.2, 0), []);
  const endPos = useMemo(() => focusPosition.clone(), [focusPosition]);
  const tiltQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0.22, -0.05)),
    []
  );
  const floatEuler = useMemo(() => new THREE.Euler(), []);
  const floatQuat = useMemo(() => new THREE.Quaternion(), []);

  const paperTexts = useMemo(
    () => [
      "tem algo em você que ainda é muito criança.",
      "daquelas que ri alto\n\nque se empolga\n\ne que às vezes fala umas coisas\ncompletamente absurdas.",
      "e talvez seja por isso que você seja tão divertida.",
    ],
    []
  );

  const paperPoses = useMemo<Pose[]>(
    () => [
      { position: new THREE.Vector3(0.1, 0.52, 0.12), rotation: new THREE.Euler(0, 0, -0.02) },
      { position: new THREE.Vector3(0, -0.03, 0.12), rotation: new THREE.Euler(0, 0, 0.02) },
      { position: new THREE.Vector3(0.2, -0.6, 0.12), rotation: new THREE.Euler(0, 0, -0.01) },
    ],
    []
  );

  const paperOrigin = useMemo(() => new THREE.Vector3(0, -0.85, -0.12), []);

  const polaroidPoses = useMemo<Pose[]>(
    () => [
      { position: new THREE.Vector3(-0.93, 0.3, 0.2), rotation: new THREE.Euler(0, 0, 0.2) },
      { position: new THREE.Vector3(.8, -0.1, .2), rotation: new THREE.Euler(0, 0, -.2) },
      { position: new THREE.Vector3(-0.8, -0.5, .25), rotation: new THREE.Euler(0, 0, -0.1) },
    ],
    []
  );

  const polaroidStarts = useMemo(
    () =>
      polaroidPoses.map((pose) =>
        pose.position.clone().add(new THREE.Vector3(0, -0.4, 0.04))
      ),
    [polaroidPoses]
  );

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current = [];
    if (!isOpen) {
      isActiveRef.current = false;
      progress.current = 0;
      openStartRef.current = null;
      focusIndexRef.current = null;
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

  useEffect(() => {
    focusAmounts.current = polaroidPoses.map(() => 0);
  }, [polaroidPoses]);

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
    const floatY = Math.sin(time * 1.05) * 0.02;
    const floatX = Math.sin(time * 0.75) * 0.01;
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

    if (!isActiveRef.current || openStartRef.current === null) {
      paperRefs.current.forEach((ref) => {
        if (ref) {
          ref.visible = false;
        }
      });
      polaroidRefs.current.forEach((ref) => {
        if (ref) {
          ref.visible = false;
        }
      });
      return;
    }

    const elapsed = state.clock.elapsedTime - openStartRef.current;
    const paperDelay = 2.1;
    const paperDuration = 0.9;

    paperRefs.current.forEach((ref, index) => {
      if (!ref) {
        return;
      }
      const localT = THREE.MathUtils.clamp((elapsed - index * paperDelay) / paperDuration, 0, 1);
      const easedT = THREE.MathUtils.smoothstep(localT, 0, 1);
      ref.position.lerpVectors(paperOrigin, paperPoses[index].position, easedT);
      ref.rotation.set(0, 0, THREE.MathUtils.lerp(0, paperPoses[index].rotation.z, easedT));
      ref.scale.setScalar(0.92 + easedT * 0.08);
      ref.visible = localT > 0.02;
    });

    const polaroidBaseDelay = paperDelay * (paperPoses.length - 1) + paperDuration + 2.0;
    const polaroidDelay = 1.05;
    const polaroidDuration = 0.9;

    polaroidRefs.current.forEach((ref, index) => {
      if (!ref) {
        return;
      }
      const localT = THREE.MathUtils.clamp(
        (elapsed - (polaroidBaseDelay + index * polaroidDelay)) / polaroidDuration,
        0,
        1
      );
      const easedT = THREE.MathUtils.smoothstep(localT, 0, 1);
      ref.position.lerpVectors(polaroidStarts[index], polaroidPoses[index].position, easedT);
      const focusTarget = focusIndexRef.current === index ? 1 : 0;
      const focusValue = THREE.MathUtils.damp(
        focusAmounts.current[index] ?? 0,
        focusTarget,
        6,
        delta
      );
      focusAmounts.current[index] = focusValue;
      ref.position.lerp(new THREE.Vector3(0, 0.05, 0.22), focusValue);
      ref.rotation.set(0, 0, THREE.MathUtils.lerp(polaroidPoses[index].rotation.z, 0, focusValue));
      ref.scale.setScalar(0.9 + easedT * 0.1 + focusValue * 0.65);
      ref.visible = localT > 0.02;
    });
  });

  const handlePolaroidClick = (event: ThreeEvent<PointerEvent>, index: number) => {
    event.stopPropagation();
    focusIndexRef.current = focusIndexRef.current === index ? null : index;
  };

  return (
    <group ref={groupRef} visible={false}>
      {paperTexts.map((text, index) => (
        <group
          key={`paper-${index}`}
          ref={(node) => {
            paperRefs.current[index] = node;
          }}
          position={paperPoses[index].position}
        >
          <mesh>
            <boxGeometry
              args={[
                1.5,
                index === 1 ? 0.65 : index === 0 ? 0.24 : 0.3,
                0.04,
              ]}
            />
            <meshStandardMaterial color="#f8f5ef" roughness={0.9} metalness={0.05} />
          </mesh>
          <Text
            position={[0, index === 0 ? 0.03 : index === 2 ? 0.04 : 0.21, 0.04]}
            fontSize={0.055}
            color="#1a1a1a"
            anchorX="center"
            anchorY="top"
            lineHeight={1.3}
            maxWidth={1.3}
          >
            {text}
          </Text>
        </group>
      ))}

      {polaroidPoses.map((pose, index) => (
        <group
          key={`child-polaroid-${index}`}
          ref={(node) => {
            polaroidRefs.current[index] = node;
          }}
          position={pose.position}
          onPointerDown={(event) => handlePolaroidClick(event, index)}
        >
          <mesh>
            <boxGeometry args={[0.7, 0.85, 0.03]} />
            <meshStandardMaterial color="#f6f2ea" roughness={0.9} metalness={0.02} />
          </mesh>
          <mesh position={[0, 0.08, 0.02]}>
            <planeGeometry args={[0.58, 0.52]} />
            <meshStandardMaterial
              map={polaroidTextures[index]}
              roughness={0.8}
              metalness={0}
            />
          </mesh>
          <mesh position={[0, -0.26, 0.02]}>
            <planeGeometry args={[0.58, 0.16]} />
            <meshStandardMaterial color="#f6f2ea" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

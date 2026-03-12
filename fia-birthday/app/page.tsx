"use client";

import { useEffect, useRef, useState } from "react";
import Gift3D from "./components/Gift3D";

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const particleSeeds = Array.from({ length: 40 }).map((_, i) => {
  const rand = mulberry32(1234 + i);
  return {
    id: i,
    left: `${rand() * 100}%`,
    top: `${rand() * 100}%`,
    delay: `${rand() * 10}s`,
    duration: `${15 + rand() * 10}s`,
  };
});

export default function Home() {
  const lines = [
    "algumas pessoas merecem mais do que um simples presente",
    "então eu resolvi construir um pequeno pedaço da internet pra você",
    "um presente digital para uma garota nada convencional",
  ];

  // Temporary toggle to jump straight to the 3D gift while testing.
  const skipIntroForTests = true;

  const [index, setIndex] = useState(0);
  const [hideText, setHideText] = useState(false);
  const [showGift, setShowGift] = useState(skipIntroForTests);
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStart = () => {
    setStarted(true);
    setIndex(0);
    setHideText(false);
    setShowGift(false);

    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error("Audio play failed", error);
    });
  };

  useEffect(() => {
    if (!started) {
      return;
    }

    if (index < lines.length - 1) {
      const timer = setTimeout(() => {
        setIndex((prev) => prev + 1);
      }, 5000);

      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setHideText(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [index, lines.length, started]);

  useEffect(() => {
    if (!started || !hideText) {
      return;
    }

    const timer = setTimeout(() => {
      setShowGift(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [hideText, started]);

  return (
    <main className="relative flex h-screen items-center justify-center overflow-hidden bg-black text-white">
      <audio ref={audioRef} src="/audio/moog-city.mp3" preload="auto" />
      <div className="particle-field">
        {particleSeeds.map((particle) => (
          <span
            key={particle.id}
            className="particle"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
      {!showGift && (
        <>
          {!started && (
            <div className="start-overlay">
              <button className="start-button" onClick={handleStart}>
                Começar experiência
              </button>
            </div>
          )}
          {started && (
            <div
              className={`intro-text relative z-10 max-w-3xl text-center px-6 ${
                hideText ? "intro-text-hidden" : ""
              }`}
            >
              <h1
                key={index}
                className="animate-fade text-3xl font-light leading-snug md:text-5xl"
              >
                {lines[index]}
              </h1>
            </div>
          )}
        </>
      )}

      {showGift && (
        <div className="gift-stage">
          <Gift3D />
        </div>
      )}
    </main>
  );
}

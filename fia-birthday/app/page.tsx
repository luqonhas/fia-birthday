"use client";

import { useEffect, useRef, useState } from "react";
import { useGLTF, useProgress } from "@react-three/drei";
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

const startSparkles = [
  { id: 0, left: "18%", top: "20%", delay: "0s" },
  { id: 1, left: "35%", top: "10%", delay: "0.2s" },
  { id: 2, left: "62%", top: "18%", delay: "0.4s" },
  { id: 3, left: "78%", top: "30%", delay: "0.1s" },
  { id: 4, left: "22%", top: "60%", delay: "0.3s" },
  { id: 5, left: "48%", top: "72%", delay: "0.5s" },
  { id: 6, left: "70%", top: "62%", delay: "0.15s" },
  { id: 7, left: "52%", top: "40%", delay: "0.35s" },
];

export default function Home() {
  const lines = [
    "algumas pessoas merecem mais do que um presente qualquer",
    "então eu resolvi construir um pequeno pedaço da internet pra você",
    "um presente digital para uma garota nada convencional",
  ];

  // Temporary toggle to jump straight to the 3D gift while testing.
  const skipIntroForTests = false;

  const [index, setIndex] = useState(0);
  const [isLineFading, setIsLineFading] = useState(false);
  const [firstLineActive, setFirstLineActive] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [showGift, setShowGift] = useState(skipIntroForTests);
  const [started, setStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hideStartOverlay, setHideStartOverlay] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [particlesActive, setParticlesActive] = useState(false);
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [preloadRequested, setPreloadRequested] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimersRef = useRef<number[]>([]);
  const isLineFadingRef = useRef(false);
  const { active: loadingActive, progress: loadingProgress } = useProgress();

  const preloadAssets = () => {
    useGLTF.preload("/models/gift.gltf");
    const audio = audioRef.current;
    audio?.load();
  };

  const handleStart = () => {
    if (isStarting || started) {
      return;
    }
    startTimersRef.current.forEach((timer) => clearTimeout(timer));
    startTimersRef.current = [];
    preloadAssets();
    setPreloadRequested(true);
    setIsStarting(true);
    setHideStartOverlay(false);
    setMinDelayPassed(false);
    setAssetsReady(false);
    setAudioReady(false);
    setShowSoundPrompt(false);
    setParticlesActive(true);
    setIndex(0);
    setFirstLineActive(false);
    setIsLineFading(false);
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

    const fadeOverlayTimer = window.setTimeout(() => {
      setHideStartOverlay(true);
    }, 1300);
    const soundShowTimer = window.setTimeout(() => {
      setShowSoundPrompt(true);
    }, 1900);
    const soundHideTimer = window.setTimeout(() => {
      setShowSoundPrompt(false);
      setMinDelayPassed(true);
    }, 5600);
    startTimersRef.current = [fadeOverlayTimer, soundShowTimer, soundHideTimer];
  };

  useEffect(() => {
    if (!started || hideText || isLineFadingRef.current || !firstLineActive) {
      return;
    }

    const lineHoldMs = 3400;
    const lineFadeMs = 1600;

    let fadeTimer: number | undefined;
    const holdTimer = window.setTimeout(() => {
      isLineFadingRef.current = true;
      setIsLineFading(true);
      fadeTimer = window.setTimeout(() => {
        if (index < lines.length - 1) {
          setIndex((prev) => prev + 1);
        } else {
          setHideText(true);
        }
        isLineFadingRef.current = false;
        setIsLineFading(false);
      }, lineFadeMs);
    }, lineHoldMs);

    return () => {
      clearTimeout(holdTimer);
      if (fadeTimer) {
        clearTimeout(fadeTimer);
      }
    };
  }, [firstLineActive, hideText, index, lines.length, started]);

  useEffect(() => {
    if (!started || !hideText) {
      return;
    }

    const timer = setTimeout(() => {
      setShowGift(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [hideText, started]);

  useEffect(() => {
    return () => {
      startTimersRef.current.forEach((timer) => clearTimeout(timer));
      startTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!preloadRequested) {
      return;
    }
    if (!loadingActive && (loadingProgress >= 100 || loadingProgress === 0)) {
      setAssetsReady(true);
    }
  }, [loadingActive, loadingProgress, preloadRequested]);

  useEffect(() => {
    if (!preloadRequested) {
      return;
    }
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const handleReady = () => setAudioReady(true);
    if (audio.readyState >= 2) {
      setAudioReady(true);
      return;
    }
    audio.addEventListener("canplaythrough", handleReady, { once: true });
    audio.addEventListener("loadeddata", handleReady, { once: true });
    return () => {
      audio.removeEventListener("canplaythrough", handleReady);
      audio.removeEventListener("loadeddata", handleReady);
    };
  }, [preloadRequested]);

  useEffect(() => {
    if (!isStarting) {
      return;
    }
    if (!minDelayPassed || !assetsReady || !audioReady) {
      return;
    }
    setStarted(true);
    setIsStarting(false);
    setShowSoundPrompt(false);
    const activateTimer = window.setTimeout(() => {
      setFirstLineActive(true);
    }, 120);
    startTimersRef.current.push(activateTimer);
  }, [assetsReady, audioReady, isStarting, minDelayPassed]);

  return (
    <main className="relative flex h-screen items-center justify-center overflow-hidden bg-black text-white">
      <audio ref={audioRef} src="/audio/moog-city2.mp3" preload="auto" />
      <div className={`particle-field ${particlesActive ? "particle-field-active" : ""}`}>
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
            <div
              className={`start-overlay ${hideStartOverlay ? "start-overlay-fade" : ""}`}
            >
              <button
                className={`start-button ${isStarting ? "start-button-pressed" : ""}`}
                onClick={handleStart}
                type="button"
              >
                Começar experiência
              </button>
              {isStarting && (
                <div className="start-sparkles" aria-hidden="true">
                  {startSparkles.map((sparkle) => (
                    <span
                      key={sparkle.id}
                      className="start-sparkle"
                      style={{
                        left: sparkle.left,
                        top: sparkle.top,
                        animationDelay: sparkle.delay,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {showSoundPrompt && (
            <div className="sound-prompt">aumente o som...</div>
          )}
          {started && (
            <div
              className={`intro-text relative z-10 max-w-3xl text-center px-6 ${
                hideText ? "intro-text-hidden" : ""
              }`}
            >
              <h1
                className={`intro-line text-3xl font-light leading-snug md:text-5xl ${
                  !firstLineActive ? "intro-line-start" : ""
                } ${isLineFading || hideText ? "intro-line-fadeout" : ""}`}
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

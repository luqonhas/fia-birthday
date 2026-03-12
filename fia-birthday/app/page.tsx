"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const lines = [
    "algumas pessoas merecem mais do que um simples presente",
    "então eu resolvi construir um pequeno pedaço da internet pra você",
    "um presente digital para uma garota nada convencional",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev < lines.length - 1 ? prev + 1 : prev));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative flex h-screen items-center justify-center overflow-hidden bg-black text-white">

      {/* PARTICLES */}
      <div className="particle-field">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* TEXT */}
      <div className="relative z-10 max-w-3xl text-center px-6">
        <h1
          key={index}
          className="animate-fade text-3xl font-light leading-snug md:text-5xl"
        >
          {lines[index]}
        </h1>
      </div>
    </main>
  );
}
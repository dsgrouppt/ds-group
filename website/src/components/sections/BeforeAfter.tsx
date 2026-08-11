"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

interface BeforeAfterProps {
  beforeImage?: string;
  afterImage?: string;
  projectName?: string;
  location?: string;
  duration?: string;
}

export function BeforeAfter({
  beforeImage,
  afterImage,
  projectName,
  location,
  duration,
}: BeforeAfterProps) {
  const [value, setValue] = useState(50);

  return (
    <section className="py-36 bg-paper" id="antes-depois">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-16">
          <div className="eyebrow">Antes e Depois</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">
            Arraste para ver a transformação.
          </h2>
        </Reveal>

        <Reveal index={1}>
          <div className="ba-slider">
            <div className="ba-after ph dark">
              <PlaceholderMedia
                variant="dark"
                src={afterImage}
                className="absolute inset-0"
              />
            </div>
            <div className="ba-before" style={{ width: `${value}%` }}>
              <div style={{ width: "calc(100vw - 12vw)", maxWidth: 1280, height: "100%", position: "relative" }}>
                <PlaceholderMedia
                  variant="light"
                  src={beforeImage}
                  className="absolute inset-0"
                />
              </div>
            </div>
            <span className="ba-tag before">Antes</span>
            <span className="ba-tag after">Depois</span>
            <div className="ba-handle" style={{ left: `${value}%` }} />
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="ba-range"
              aria-label="Comparar antes e depois"
            />
          </div>
          {(projectName || location || duration) && (
            <div className="flex justify-between flex-wrap gap-2 mt-6 text-[.82rem] text-graphite">
              {projectName ? <span><b className="font-display font-medium text-ink">{projectName}</b></span> : <span />}
              <span>{[location, duration].filter(Boolean).join(" · ")}</span>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

const MARKERS = [
  { location: [19.076, 72.8777] as [number, number], size: 0.08 },
  { location: [28.6139, 77.209] as [number, number], size: 0.06 },
  { location: [18.5204, 73.8567] as [number, number], size: 0.04 },
  { location: [13.0827, 80.2707] as [number, number], size: 0.04 },
  { location: [25.2048, 55.2708] as [number, number], size: 0.05 },
  { location: [40.7128, -74.006] as [number, number], size: 0.05 },
  { location: [51.5074, -0.1278] as [number, number], size: 0.045 },
  { location: [52.52, 13.405] as [number, number], size: 0.04 },
  { location: [1.3521, 103.8198] as [number, number], size: 0.04 },
  { location: [35.6762, 139.6503] as [number, number], size: 0.04 },
  { location: [31.2304, 121.4737] as [number, number], size: 0.035 },
  { location: [-33.8688, 151.2093] as [number, number], size: 0.035 },
  { location: [55.7558, 37.6173] as [number, number], size: 0.03 },
  { location: [-23.5505, -46.6333] as [number, number], size: 0.035 },
  { location: [6.5244, 3.3792] as [number, number], size: 0.03 },
  { location: [-1.2921, 36.8219] as [number, number], size: 0.03 },
];

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const rafRef = useRef(0);
  const phiRef = useRef(1.2);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);

  useEffect(() => {
    // Create canvas manually to avoid React StrictMode conflicts
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    const bufferSize = (container.offsetWidth || 680) *
      Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 2);
    canvas.width = bufferSize;
    canvas.height = bufferSize;
    canvas.className = "h-full w-full cursor-grab";
    canvas.style.transition = "opacity 1s";
    canvas.style.opacity = "0";
    canvas.style.filter = "invert(1) brightness(0.88)";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const size = container.offsetWidth || 680;

    // Lighter rendering on small screens: budget Android devices are the
    // typical visitor, and full-res WebGL here costs real battery/jank.
    const isSmall = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, isSmall ? 1 : 2);

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: 1.2,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: isSmall ? 16000 : 40000,
      mapBrightness: 12,
      mapBaseBrightness: 0,
      baseColor: [0.19, 0.12, 0.0],              // Inverts → land = #0B1D3A navy
      markerColor: [0.17, 0.34, 0.74],        // Blue (inverts → artha gold)
      glowColor: [0.02, 0.06, 0.15],          // Match navy (inverts → white, blends)
      markers: MARKERS,
      opacity: 1,
    });
    globeRef.current = globe;

    // Fade in
    requestAnimationFrame(() => { canvas.style.opacity = "1"; });

    function animate() {
      if (!pointerInteracting.current) {
        phiRef.current += 0.002;
      }
      globe.update({
        phi: phiRef.current + pointerMovement.current,
        width: size * 2,
        height: size * 2,
      });
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    // Pointer events
    const onDown = (e: PointerEvent) => {
      pointerInteracting.current = e.clientX - pointerMovement.current;
      canvas.style.cursor = "grabbing";
    };
    const onUp = () => {
      pointerInteracting.current = null;
      canvas.style.cursor = "grab";
    };
    const onMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        pointerMovement.current = (e.clientX - pointerInteracting.current) / 200;
      }
    };
    const onTouch = (e: TouchEvent) => {
      if (pointerInteracting.current !== null && e.touches[0]) {
        pointerMovement.current = (e.touches[0].clientX - pointerInteracting.current) / 100;
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerout", onUp);
    canvas.addEventListener("mousemove", onMove as EventListener);
    canvas.addEventListener("touchmove", onTouch as EventListener);

    const onResize = () => {
      const newSize = container.offsetWidth || 680;
      globe.update({ width: newSize * 2, height: newSize * 2 });
    };
    window.addEventListener("resize", onResize);

   return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerout", onUp);
      canvas.removeEventListener("mousemove", onMove as EventListener);
      canvas.removeEventListener("touchmove", onTouch as EventListener);
      globe.destroy();
      
      // FIX: Strictly check if the container is still the direct parent
      if (canvas && canvas.parentNode === container) {
        container.removeChild(canvas);
      }
      
      canvasRef.current = null;
      globeRef.current = null;
    };
  }, []);

  return (
    <div
      className="relative mx-auto w-full"
      style={{ maxWidth: 680, aspectRatio: "1 / 1" }}
    >
      {/* Luminous glow behind globe */}
      <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(100,170,255,0.1)_0%,rgba(60,130,230,0.06)_40%,rgba(37,99,235,0.02)_65%,transparent_80%)]" />
      <div className="absolute inset-[8%] rounded-full shadow-[0_0_80px_25px_rgba(100,170,255,0.06),0_0_180px_80px_rgba(37,99,235,0.03)]" />

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative h-full w-full"
      />
    </div>
  );
}

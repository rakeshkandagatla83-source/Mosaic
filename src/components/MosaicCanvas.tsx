"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasEngine, TileData, MosaicConfig } from "./useCanvasEngine";

export default function MosaicCanvas({
  tiles,
  config,
  highlightedPosition,
}: {
  tiles: TileData[];
  config: MosaicConfig;
  highlightedPosition?: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialFitDone = useRef(false);
  const [hoveredTile, setHoveredTile] = useState<{ tile: TileData; x: number; y: number } | null>(null);
  // Timeout ref so the card stays visible when cursor moves from canvas → card
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    draw,
    handleZoom,
    handlePan,
    handlePointerDown,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    fitToViewport,
    getTileAtCoordinate,
  } = useCanvasEngine({ tiles, config, canvasRef, highlightedPosition });

  // — Resize & initial fit —
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.scale(dpr, dpr);
          if (!initialFitDone.current && width > 0) {
            fitToViewport();
            initialFitDone.current = true;
          }
        }
      }
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    return () => resizeObserver.disconnect();
  }, [fitToViewport]);

  // Keyboard reset viewport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fitToViewport();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fitToViewport]);

  // rAF draw loop
  useEffect(() => {
    let id: number;
    const loop = () => { draw(); id = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(id);
  }, [draw]);

  // —— Hover hit-testing ——
  const scheduleHoverClear = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredTile(null), 120);
  };
  const cancelHoverClear = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePan(e);
    if (e.buttons === 0) {
      const tile = getTileAtCoordinate(e.clientX, e.clientY);
      if (tile && tile.name) {
        cancelHoverClear();
        setHoveredTile({ tile, x: e.clientX, y: e.clientY });
      } else {
        scheduleHoverClear();
      }
    } else {
      cancelHoverClear();
      setHoveredTile(null);
    }
  };

  // —— Web Share API ——
  const handleShare = async (tile: TileData) => {
    const shareData = {
      title: `${tile.name} is in the Mosaic!`,
      text: `Find ${tile.name}'s photo in the Mosaic Collective portrait — 89.6FM Mirchi One "Spread the Smile"`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Desktop fallback — copy link
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch {
      // User dismissed share sheet — no action needed
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none cursor-grab active:cursor-grabbing"
        onWheel={handleZoom}
        onMouseMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onPointerLeave={() => { handlePointerUp(); scheduleHoverClear(); }}
      />

      {/* — Portrait Card Tooltip — */}
      {hoveredTile && (
        <div
          className="absolute z-50"
          style={{
            left: hoveredTile.x,
            top: hoveredTile.y,
            transform: "translate(-50%, calc(-100% - 20px))",
            pointerEvents: "none",
          }}
          onMouseEnter={cancelHoverClear}
          onMouseLeave={scheduleHoverClear}
        >
          {/* Card itself is interactive so share button works */}
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-100"
            style={{ width: 200, pointerEvents: "auto" }}
          >
            {/* Portrait image — 3:4 */}
            <div className="w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: "3/4" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hoveredTile.tile.imageUrl}
                alt={hoveredTile.tile.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name + share row */}
            <div className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="font-semibold text-neutral-900 text-sm leading-snug truncate flex-1">
                {hoveredTile.tile.name}
              </div>

              {/* Share button */}
              <button
                onClick={() => handleShare(hoveredTile.tile)}
                title="Share this photo"
                className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 hover:bg-blue-100 active:scale-95 flex items-center justify-center transition-all"
              >
                {/* Share icon (native OS share symbol) */}
                <svg
                  className="w-4 h-4 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>

          {/* Triangle tail */}
          <div
            className="mx-auto"
            style={{
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "9px solid white",
            }}
          />
        </div>
      )}
    </div>
  );
}

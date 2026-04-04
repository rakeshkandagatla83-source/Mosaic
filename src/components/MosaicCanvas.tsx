"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasEngine, TileData, MosaicConfig } from "./useCanvasEngine";

export default function MosaicCanvas({ tiles, config }: { tiles: TileData[], config: MosaicConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialFitDone = useRef(false);
  const [hoveredTile, setHoveredTile] = useState<{ tile: TileData, x: number, y: number } | null>(null);

  const { 
    draw, 
    handleZoom, 
    handlePan, 
    handlePointerDown, 
    handlePointerUp, 
    handleTouchStart, 
    handleTouchMove,
    fitToViewport,
    getTileAtCoordinate
  } = useCanvasEngine({
    tiles,
    config,
    canvasRef,
  });

  // Handle Resize and Canvas Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Resize Observer for responsive canvas
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        // Only update if dimensions actually changed to avoid loop
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }

          if (!initialFitDone.current && width > 0) {
            fitToViewport();
            initialFitDone.current = true;
          }
        }
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, [fitToViewport]);

  // Adjust viewport automatically if the active grid scales up to accept more tiles
  useEffect(() => {
    if (initialFitDone.current) {
      fitToViewport();
    }
  }, [config.gridCols, config.gridRows, fitToViewport]);


  // Keyboard shortcut listener for Ctrl+0 or Cmd+0 to reset viewport
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

  // Sync draw loop
  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      draw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePan(e);
    
    // Phase 5 Hit testing
    if (e.buttons === 0) {
      const tile = getTileAtCoordinate(e.clientX, e.clientY);
      // Only show hover state for actual authenticated unique tiles which possess metadata
      if (tile && tile.name) {
        setHoveredTile({ tile, x: e.clientX, y: e.clientY });
      } else {
        setHoveredTile(null);
      }
    } else {
      setHoveredTile(null); // hide on drag
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none cursor-grab active:cursor-grabbing"
        onWheel={handleZoom}
        onMouseMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onPointerLeave={() => { handlePointerUp(); setHoveredTile(null); }}
      />

      {/* Interactive Tooltip Engine */}
      {hoveredTile && (
        <div 
          className="absolute pointer-events-none bg-black/95 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl z-50 transform -translate-x-1/2 -translate-y-full mb-4 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: hoveredTile.x, top: hoveredTile.y - 15 }}
        >
          <div className="flex items-center gap-4 min-w-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hoveredTile.tile.imageUrl} alt="User contribution" className="w-14 h-14 rounded-xl border-2 border-white/10 shadow-inner object-cover" />
            <div>
              <div className="font-bold text-white text-base leading-tight">{hoveredTile.tile.name}</div>
              <div className="text-neutral-400 font-mono text-xs mt-1">{hoveredTile.tile.mobileNumber}</div>
            </div>
          </div>
          
          {/* Tooltip triangle tail */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/95"></div>
        </div>
      )}
    </div>
  );
}

import { useRef, useCallback, useEffect } from "react";
import { useImageCache } from "./useImageCache";

export interface TileData {
  position: number;
  imageUrl?: string;
  avgColor?: string;
  name?: string;
  mobileNumber?: string;
}

export interface MosaicConfig {
  gridCols: number;
  gridRows: number;
  tileSize: number;
  masterImage?: HTMLImageElement | null;
}

interface CanvasEngineProps {
  tiles: TileData[];
  config: MosaicConfig;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  highlightedPosition?: number | null;
}

export function useCanvasEngine({ tiles, config, canvasRef, highlightedPosition }: CanvasEngineProps) {
  const scale = useRef(1);
  const offset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastTouch = useRef<{ x: number, y: number, dist?: number } | null>(null);
  const targetFlyTransform = useRef<{ scale: number, x: number, y: number } | null>(null);

  // -------------------------------------------------------------------
  // Store tiles, config, and highlightedPosition in refs so that the
  // draw() callback never needs them in its dependency array.
  // This prevents the animation loop from restarting (and blinking)
  // every time the parent re-renders due to unrelated state changes
  // like the search bar input.
  // -------------------------------------------------------------------
  const tilesRef = useRef<TileData[]>(tiles);
  const configRef = useRef<MosaicConfig>(config);
  const highlightedPositionRef = useRef<number | null | undefined>(highlightedPosition);

  // Keep refs in sync with prop changes (silently, no re-render)
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { highlightedPositionRef.current = highlightedPosition; }, [highlightedPosition]);

  const { getImage } = useImageCache();

  // draw() has NO reactive deps — it reads everything from refs.
  // The rAF loop in MosaicCanvas.tsx will NEVER restart due to parent re-renders.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = configRef.current;
    const tiles = tilesRef.current;
    const highlighted = highlightedPositionRef.current;

    const { gridCols } = config;
    const baseTileSize = config.tileSize || 20;
    const tileSize = baseTileSize * scale.current;

    const dpr = window.devicePixelRatio || 1;
    const logicalW = canvas.width / dpr;
    const logicalH = canvas.height / dpr;

    // Lerp animation toward fly-to target
    if (targetFlyTransform.current) {
      const t = targetFlyTransform.current;
      const lerpSpeed = 0.06;
      scale.current += (t.scale - scale.current) * lerpSpeed;
      offset.current.x += (t.x - offset.current.x) * lerpSpeed;
      offset.current.y += (t.y - offset.current.y) * lerpSpeed;

      if (Math.abs(t.scale - scale.current) < 0.005 && Math.abs(t.x - offset.current.x) < 1.0) {
        targetFlyTransform.current = null;
      }
    }

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, logicalW, logicalH);

    function isVisible(x: number, y: number, size: number) {
      if (!canvas) return false;
      return x + size > 0 && y + size > 0 && x < canvas.width / dpr && y < canvas.height / dpr;
    }

    // Compute master image slice dimensions
    let mSliceW = 0;
    let mSliceH = 0;
    if (config.masterImage) {
      mSliceW = config.masterImage.width / config.gridCols;
      mSliceH = config.masterImage.height / config.gridRows;
    }

    const currentTileSize = baseTileSize * scale.current;

    for (const tile of tiles) {
      const col = tile.position % gridCols;
      const row = Math.floor(tile.position / gridCols);

      const x = col * currentTileSize + offset.current.x;
      const y = row * currentTileSize + offset.current.y;

      if (!isVisible(x, y, currentTileSize)) continue;

      const img = getImage(tile.imageUrl);
      const drawSize = currentTileSize + 0.5; // +0.5 eliminates sub-pixel gaps

      if (scale.current < 0.3 || !img || !img.complete) {
        ctx.fillStyle = tile.avgColor || "#ffffff";
        ctx.fillRect(x, y, drawSize, drawSize);
      } else {
        ctx.drawImage(img, x, y, drawSize, drawSize);

        // Mosaic master-image overlay blend
        if (config.masterImage) {
          ctx.globalAlpha = 0.85;
          ctx.globalCompositeOperation = "hard-light";
          ctx.drawImage(
            config.masterImage,
            col * mSliceW, row * mSliceH, mSliceW, mSliceH,
            x, y, drawSize, drawSize
          );
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = "source-over";
        }
      }

      // Blue highlight border for the searched tile
      if (highlighted !== null && highlighted !== undefined && tile.position === highlighted) {
        const borderWidth = Math.max(2, currentTileSize * 0.08);
        ctx.save();
        ctx.strokeStyle = "#2563EB"; // Tailwind blue-600
        ctx.lineWidth = borderWidth;
        ctx.shadowColor = "#3B82F6";
        ctx.shadowBlur = borderWidth * 3;
        ctx.strokeRect(
          x + borderWidth / 2,
          y + borderWidth / 2,
          currentTileSize - borderWidth,
          currentTileSize - borderWidth
        );
        ctx.restore();
      }
    }
  }, [canvasRef, getImage]); // stable — no tiles/config/highlighted in deps

  // Fly-to event listener — reads config from ref so no config dep needed
  useEffect(() => {
    const handleFlyTo = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { position } = customEvent.detail;
      const canvas = canvasRef.current;
      if (!canvas || isNaN(position)) return;

      const cfg = configRef.current;
      const col = position % cfg.gridCols;
      const row = Math.floor(position / cfg.gridCols);

      const targetScale = 12.0;
      const targetTileSize = cfg.tileSize * targetScale;

      const dpr = window.devicePixelRatio || 1;
      const logicalW = canvas.width / dpr;
      const logicalH = canvas.height / dpr;

      const targetX = logicalW / 2 - col * targetTileSize - targetTileSize / 2;
      const targetY = logicalH / 2 - row * targetTileSize - targetTileSize / 2;

      targetFlyTransform.current = { scale: targetScale, x: targetX, y: targetY };
    };

    window.addEventListener("mosaic-fly-to", handleFlyTo);
    return () => window.removeEventListener("mosaic-fly-to", handleFlyTo);
  }, [canvasRef]); // stable — reads config from ref

  const handleZoom = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = e.deltaY < 0 ? scale.current * zoomFactor : scale.current / zoomFactor;
    if (newScale < 0.05 || newScale > 20) return;

    const scaleRatio = newScale / scale.current;
    offset.current.x = mouseX - (mouseX - offset.current.x) * scaleRatio;
    offset.current.y = mouseY - (mouseY - offset.current.y) * scaleRatio;
    scale.current = newScale;
  }, [canvasRef]);

  const handlePan = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1 && !isDragging.current) return;
    offset.current.x += e.movementX;
    offset.current.y += e.movementY;
  }, []);

  const handlePointerDown = useCallback(() => {
    isDragging.current = true;
    targetFlyTransform.current = null; // Cancel fly-to if user grabs canvas
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    lastTouch.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      lastTouch.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!lastTouch.current) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      offset.current.x += touch.clientX - lastTouch.current.x;
      offset.current.y += touch.clientY - lastTouch.current.y;
      lastTouch.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastTouch.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);

      const newScale = scale.current * (dist / lastTouch.current.dist);
      if (newScale < 0.05 || newScale > 20) return;
      const scaleRatio = newScale / scale.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const originX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const originY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      offset.current.x = originX - (originX - offset.current.x) * scaleRatio;
      offset.current.y = originY - (originY - offset.current.y) * scaleRatio;
      scale.current = newScale;
      lastTouch.current = { ...lastTouch.current, dist };
    }
  }, [canvasRef]);

  const fitToViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    const cfg = configRef.current;
    const baseTileSize = cfg.tileSize || 15;
    const totalGridWidth = cfg.gridCols * baseTileSize;
    const totalGridHeight = cfg.gridRows * baseTileSize;

    const scaleX = canvasWidth / totalGridWidth;
    const scaleY = canvasHeight / totalGridHeight;
    const fitScale = Math.max(scaleX, scaleY);
    const safeScale = Math.max(0.05, Math.min(fitScale, 20));

    const scaledGridW = totalGridWidth * safeScale;
    const scaledGridH = totalGridHeight * safeScale;

    scale.current = safeScale;
    offset.current.x = (canvasWidth - scaledGridW) / 2;
    offset.current.y = (canvasHeight - scaledGridH) / 2;
  }, [canvasRef]); // stable — reads config from ref

  const getTileAtCoordinate = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const cfg = configRef.current;
    const { gridCols, gridRows, tileSize: baseTileSize = 15 } = cfg;
    const tileSize = baseTileSize * scale.current;

    const relativeX = mouseX - offset.current.x;
    const relativeY = mouseY - offset.current.y;

    const col = Math.floor(relativeX / tileSize);
    const row = Math.floor(relativeY / tileSize);

    if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
      const position = row * gridCols + col;
      return tilesRef.current.find(t => t.position === position) || null;
    }

    return null;
  }, [canvasRef]); // stable — reads tiles and config from refs

  return {
    draw,
    handleZoom,
    handlePan,
    handlePointerDown,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    fitToViewport,
    getTileAtCoordinate,
  };
}

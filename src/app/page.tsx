"use client";

import { useState, useEffect, useMemo } from "react";
import MosaicCanvas from "@/components/MosaicCanvas";
import { TileData } from "@/components/useCanvasEngine";
import ImageUploader from "@/components/ImageUploader";
import { useImageCache } from "@/components/useImageCache";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
  // --- DATABASE SUBSCRIPTIONS ---
  const activeGrid = useQuery(api.grid.getActiveGrid);
  const approvedSubmissions = useQuery(api.submissions.getApproved);
  const campaignConfig = useQuery(api.config.getConfig);

  // Shared image cache (module-level Map, survives re-renders)
  const { preloadImages } = useImageCache();

  // --- LOCAL RENDER STATE ---
  const [gridConfigState, setGridConfigState] = useState({ cols: 60, rows: 34 });
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [masterImage, setMasterImage] = useState<HTMLImageElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingBase, setIsProcessingBase] = useState(true);

  // --- SEARCH FLOW STATE ---
  const [searchMobile, setSearchMobile] = useState("");
  const [foundPosition, setFoundPosition] = useState<number | null>(null);

  // --- CALCULATIONS ---
  const progress = useMemo(() => {
    if (!approvedSubmissions || !campaignConfig) return 0;
    const goal = campaignConfig.targetGoal || 2039;
    const raw = (approvedSubmissions.length / goal) * 100;
    if (approvedSubmissions.length > 0 && raw < 1) {
      return Number(raw.toFixed(1)); // Show 0.5% instead of flooring to 0%
    }
    return Math.min(99, Math.floor(raw)); // Capped at 99% as per requirement
  }, [approvedSubmissions, campaignConfig]);

  const mosaicConfig = useMemo(() => ({
    gridCols: gridConfigState.cols,
    gridRows: gridConfigState.rows,
    tileSize: 15,
    masterImage,
  }), [gridConfigState.cols, gridConfigState.rows, masterImage]);

  // Sync structural grid bounds from DB
  useEffect(() => {
    if (activeGrid && (activeGrid.cols !== gridConfigState.cols || activeGrid.rows !== gridConfigState.rows)) {
      setGridConfigState({ cols: activeGrid.cols, rows: activeGrid.rows });
    }
  }, [activeGrid, gridConfigState.cols, gridConfigState.rows]);

  // Build the underlying tile scaffold — ONLY when grid dimensions change.
  // Never depends on campaignConfig so config updates don't wipe tile imageUrls.
  useEffect(() => {
    const total = gridConfigState.cols * gridConfigState.rows;
    const baseTiles: TileData[] = Array.from({ length: total }, (_, i) => ({
      position: i,
      avgColor: "#ffffff",
    }));
    setTiles(baseTiles);
    setIsProcessingBase(true); // mark as pending until master image also loads
  }, [gridConfigState.cols, gridConfigState.rows]);

  // Load master image whenever the URL changes — does NOT reset tiles.
  // Separated from tile building so Convex config updates (Go Live, etc.)
  // don't wipe user photo imageUrls from the tile array.
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = (campaignConfig as any)?.masterImageUrl || "/base-image.jpg";
    img.onload = () => {
      if (!active) return;
      setMasterImage(img);
      setIsProcessingBase(false);
    };
    img.onerror = () => {
      if (!active) return;
      console.warn("Master image failed to load. Place 'base-image.jpg' in public folder.");
      setMasterImage(null);
      setIsProcessingBase(false);
    };
    return () => { active = false; };
  }, [(campaignConfig as any)?.masterImageUrl]);




  // Eagerly preload all unique tile image URLs directly into the shared image cache.
  // Canvas engine calls getImage() from the same cache — so these Image objects
  // are the exact ones the draw loop will check. img.complete = true by draw time.
  useEffect(() => {
    if (!approvedSubmissions) return;
    const urls = approvedSubmissions
      .map(s => s.url)
      .filter((u): u is string => !!u);
    preloadImages(urls);
  }, [approvedSubmissions, preloadImages]);

  // Mosaic Fill Algorithm with center-outward blooming
  useEffect(() => {
    if (!approvedSubmissions || tiles.length === 0 || !campaignConfig) return;

    setTiles(prev => {
      const next = [...prev];
      const validSubmissions = approvedSubmissions.filter(sub => sub.position !== undefined);

      // Overlay real uploads
      validSubmissions.forEach(sub => {
        if (next[sub.position!]) {
          next[sub.position!] = {
            ...next[sub.position!],
            imageUrl: sub.url ?? undefined,
            name: sub.name,
            mobileNumber: sub.mobileNumber
          };
        }
      });

      // Fill gaps with duplicates:
      // - Always when isLive (mosaic must be fully tiled for the reveal)
      // - In admin preview when useDuplicatedFill is enabled
      const shouldFill = (campaignConfig.isLive || campaignConfig.useDuplicatedFill) && validSubmissions.length > 0;
      if (shouldFill) {
        const cols = gridConfigState.cols;
        const rows = gridConfigState.rows;
        const centerCol = cols / 2;
        const centerRow = rows / 2;

        const emptyPositions: { index: number; dist: number }[] = [];
        for (let i = 0; i < next.length; i++) {
          if (!next[i].imageUrl) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const dist = Math.sqrt((col - centerCol) ** 2 + (row - centerRow) ** 2);
            // Deterministic jitter — same value per tile every render
            const jitter = ((i * 7 + col * 13 + row * 17) % 100) / 100 * 2.0 - 1.0;
            emptyPositions.push({ index: i, dist: dist + jitter });
          }
        }
        emptyPositions.sort((a, b) => a.dist - b.dist);

        // Deterministic source shuffle seeded by submission count
        const shuffledSources = [...validSubmissions];
        const seed = validSubmissions.length * 3;
        for (let i = shuffledSources.length - 1; i > 0; i--) {
          const j = (i * seed + 7) % (i + 1);
          [shuffledSources[i], shuffledSources[j]] = [shuffledSources[j], shuffledSources[i]];
        }

        emptyPositions.forEach(({ index }, fillIdx) => {
          const cloneSource = shuffledSources[fillIdx % shuffledSources.length];
          next[index] = {
            ...next[index],
            imageUrl: cloneSource.url ?? undefined,
            name: undefined,
            mobileNumber: undefined,
          };
        });
      }

      return next;
    });
  }, [approvedSubmissions, tiles.length, gridConfigState.cols, gridConfigState.rows, campaignConfig]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMobile || !approvedSubmissions) return;
    const found = approvedSubmissions.find(s => s.mobileNumber === searchMobile);
    if (found && found.position !== undefined) {
      setFoundPosition(found.position);
      window.dispatchEvent(new CustomEvent('mosaic-fly-to', { detail: { position: found.position } }));
    } else {
      setFoundPosition(null);
      alert("Mobile number not found. It may still be pending review!");
    }
  };

  if (isProcessingBase || !activeGrid || !campaignConfig) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white/50 animate-pulse">Initializing Mosaic Platform...</div>
  }

  const isLive = campaignConfig.isLive;

  return (
    <div className="w-full h-full relative flex flex-col font-sans bg-black overflow-hidden">
      
      {/* GLOBAL LOGO (Top Left) */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none">
        <img src="/logo.png" alt="Mirchi One" className="h-10 sm:h-14 w-auto drop-shadow-2xl" />
      </div>

      {/* --- LAYER 1: MOSAIC ENGINE (blurred behind landing, fully revealed when live) --- */}
      <div className={`absolute inset-0 transition-all duration-1000 ${isLive ? 'opacity-100 blur-0' : 'opacity-40 blur-xl pointer-events-none'}`}>
        <MosaicCanvas
          tiles={tiles}
          config={mosaicConfig}
          highlightedPosition={foundPosition}
        />
      </div>

      {/* --- LAYER 2: LANDING PAGE (Admin Banners & CTA) --- */}
      <div className={`absolute inset-0 z-40 bg-black/20 flex flex-col items-center justify-center transition-all duration-1000 ${isLive ? 'opacity-0 pointer-events-none translate-y-20' : 'opacity-100'}`}>
        <div className="w-full max-w-2xl px-6 flex flex-col items-center text-center gap-6">
          
          {/* Responsive Banners */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/10">
            {/* Desktop Banner: 16:9 */}
            <div className="hidden sm:block aspect-[16/9] relative bg-neutral-900">
              {(campaignConfig as any).desktopBannerUrl ? (
                <img src={(campaignConfig as any).desktopBannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Campaign Banner" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">Banner 16:9</div>
              )}
            </div>
            {/* Mobile Banner: rendered as 4:3 crop to avoid dominating the screen
                The admin uploads a 4:5 image; object-cover crops top/bottom edges (content is centred) */}
            <div className="block sm:hidden aspect-[4/3] relative bg-neutral-900">
              {(campaignConfig as any).mobileBannerUrl ? (
                <img src={(campaignConfig as any).mobileBannerUrl} className="absolute inset-0 w-full h-full object-cover object-center" alt="Campaign Banner" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">Banner</div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 sm:px-10 sm:py-5 font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 overflow-hidden hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/40 text-sm sm:text-base"
          >
            <span className="relative">Join the Collective — Upload Your Photo</span>
          </button>

          {/* Progress Section */}
          <div className="w-full max-w-md">
            <div className="flex justify-between items-end mb-3">
              <span className="text-white font-black text-lg tracking-tight">Campaign Progress</span>
              <span className="text-blue-400 font-black text-2xl">{progress}%</span>
            </div>
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-4 text-white/50 text-sm font-medium italic">
              Once we reach our goal, the final masterpiece will be revealed to the world.
            </p>
          </div>
        </div>
      </div>

      {/* --- LAYER 3: LIVE SEARCH (Only visible when revealed) --- */}
      <div className={`absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 transition-all duration-1000 delay-500 ${isLive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
        <form
          onSubmit={handleSearch}
          className="flex items-center bg-white rounded-full shadow-2xl overflow-hidden ring-4 ring-blue-600/20"
        >
          <input
            type="tel"
            placeholder="Search by Mobile Number"
            className="flex-grow bg-transparent px-4 sm:px-6 py-3.5 sm:py-4 text-sm outline-none text-neutral-800 placeholder:text-neutral-400 font-bold"
            value={searchMobile}
            onChange={e => setSearchMobile(e.target.value)}
          />
          <button
            type="submit"
            className="m-1.5 px-5 sm:px-8 py-3 sm:py-3.5 rounded-full text-white font-black text-sm tracking-widest uppercase transition-all bg-[#FE6C67] hover:bg-[#FE6C67]/90 shadow-lg"
          >
            Search
          </button>
        </form>
      </div>

      {isModalOpen && <ImageUploader onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import MosaicCanvas from "@/components/MosaicCanvas";
import { TileData } from "@/components/useCanvasEngine";
import ImageUploader from "@/components/ImageUploader";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
  // Production Database Subs
  const activeGrid = useQuery(api.grid.getActiveGrid);
  const approvedSubmissions = useQuery(api.submissions.getApproved);

  const [gridConfigState, setGridConfigState] = useState({ cols: 60, rows: 34 }); 
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [masterImage, setMasterImage] = useState<HTMLImageElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingBase, setIsProcessingBase] = useState(true);

  // Search Flow State
  const [searchMobile, setSearchMobile] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [foundPosition, setFoundPosition] = useState<number | null>(null);

  // Memoize config so the object reference is stable across re-renders.
  // Without this, typing in the search bar creates a new config object every
  // keystroke, which causes draw() to get a new reference and blinks the canvas.
  const mosaicConfig = useMemo(() => ({
    gridCols: gridConfigState.cols,
    gridRows: gridConfigState.rows,
    tileSize: 15,
    masterImage,
  }), [gridConfigState.cols, gridConfigState.rows, masterImage]);

  // When DB updates the structural bounds, sync local render state
  useEffect(() => {
    if (activeGrid && (activeGrid.cols !== gridConfigState.cols || activeGrid.rows !== gridConfigState.rows)) {
      setGridConfigState({ cols: activeGrid.cols, rows: activeGrid.rows });
    }
  }, [activeGrid, gridConfigState.cols, gridConfigState.rows]);

  // Function to process the Master "King Imam" Image and create the blank structural scaffolding
  const buildMosaicArray = (img: HTMLImageElement, cols: number, rows: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(img, 0, 0, cols, rows);
    const imageData = ctx.getImageData(0, 0, cols, rows).data;
    
    const baseTiles: TileData[] = [];
    const totalCount = cols * rows;

    for (let i = 0; i < totalCount; i++) {
      baseTiles.push({
        position: i,
        avgColor: `#ffffff`, // Pristine white layout
      });
    }

    setMasterImage(img);
    return baseTiles;
  };

  // Build the underlying map whenever image or grid properties physically mutate
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "/base-image.jpg"; 

    img.onload = () => {
      if (!active) return;
      const baseTiles = buildMosaicArray(img, gridConfigState.cols, gridConfigState.rows);
      setTiles(baseTiles);
      setIsProcessingBase(false);
    };

    img.onerror = () => {
      if (!active) return;
      console.warn("Please place 'base-image.jpg' in public folder.");
      setIsProcessingBase(false);
    };

    return () => { active = false; };
  }, [gridConfigState.cols, gridConfigState.rows]);

  // Phase 4 Engine - The Infinite Auto-Duplication Algorithm
  // Merges explicitly approved Convex submissions natively into the layout, and seamlessly fills edges
  useEffect(() => {
    if (!approvedSubmissions || tiles.length === 0) return;

    setTiles(prev => {
      const next = [...prev];
      const validSubmissions = approvedSubmissions.filter(sub => sub.position !== undefined);
      
      if (validSubmissions.length === 0) return next;

      // 1. Overlay actual authenticated uploads into their native coordinates
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

      // 2. Full-Frame Duplication Mapping
      // To prevent empty white border lines when Admin expands grid, duplicate random approved tiles into empty spots
      let sourceIndex = 0;
      for (let i = 0; i < next.length; i++) {
        if (!next[i].imageUrl) {
          const cloneSource = validSubmissions[sourceIndex % validSubmissions.length];
          next[i] = {
             ...next[i],
             imageUrl: cloneSource.url ?? undefined, // Duplicate visual only
             name: undefined, // Do not duplicate metadata strictly for search purity
             mobileNumber: undefined 
          };
          sourceIndex++;
        }
      }

      return next;
    });
  }, [approvedSubmissions, tiles.length]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMobile || !approvedSubmissions) return;

    const found = approvedSubmissions.find(s => s.mobileNumber === searchMobile);

    if (found && found.position !== undefined) {
      setFoundPosition(found.position);
      const searchEvent = new CustomEvent('mosaic-fly-to', {
        detail: { position: found.position }
      });
      window.dispatchEvent(searchEvent);
    } else {
      setFoundPosition(null);
      alert("Mobile number not found in the active portrait. It may still be pending admin review!");
    }
  };

  if (isProcessingBase || !activeGrid) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-100 text-neutral-800">Initializing Database Engine...</div>
  }

  return (
    <div className="w-full h-full relative flex flex-col font-sans bg-white overflow-hidden">
      
      {/* Absolute Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 pointer-events-none">
        {/* Mirchi One logo — top left */}
        <div className="pointer-events-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="89.6FM Mirchi One – Spread the Smile"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-md"
          />
        </div>
        <div className="pointer-events-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors shadow-lg"
          >
            Upload Photo
          </button>
        </div>
      </header>

      {/* Full Screen Mosaic Engine — absolute inset-0 is required for canvas ResizeObserver to measure correctly */}
      <div className="absolute inset-0">
        <MosaicCanvas
          tiles={tiles}
          config={mosaicConfig}
          highlightedPosition={foundPosition}
        />
      </div>

      {/* Search Bar — styled to match reference design */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <form
          onSubmit={handleSearch}
          className="flex items-center bg-white rounded-full shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        >
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Search Your Photo Using Your Mobile Number"
            className="flex-grow bg-transparent px-6 py-4 text-sm sm:text-base outline-none text-neutral-800 placeholder:text-neutral-400 font-medium"
            value={searchMobile}
            onChange={e => { setSearchMobile(e.target.value); if (!e.target.value) setFoundPosition(null); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <button
            type="submit"
            className="m-1.5 px-7 py-3 rounded-full text-white font-bold text-sm sm:text-base tracking-wide transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ff7043, #ff5252)' }}
          >
            Search
          </button>
        </form>
      </div>

      {isModalOpen && <ImageUploader onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
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
            imageUrl: sub.url,
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
             imageUrl: cloneSource.url, // Duplicate visual only
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

    // Search against explicitly approved geometry
    const found = approvedSubmissions.find(s => s.mobileNumber === searchMobile);
    
    if (found && found.position !== undefined) {
      // Phase 5 Zoom Hook triggers - Dispatch a synthetic custom event to the Canvas Engine
      const searchEvent = new CustomEvent('mosaic-fly-to', {
         detail: { position: found.position }
      });
      window.dispatchEvent(searchEvent);
    } else {
      alert("Mobile number not found in the active portrait. It may still be pending admin review!");
    }
  };

  if (isProcessingBase || !activeGrid) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-100 text-neutral-800">Initializing Database Engine...</div>
  }

  return (
    <div className="w-full h-full relative flex flex-col font-sans bg-white overflow-hidden">
      
      {/* Absolute Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4 sm:p-6 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-black drop-shadow-sm">
            Mosaic Collective
          </h1>
          <p className="text-xs text-neutral-600 hidden sm:block mt-1">Scroll to Zoom &middot; Cmd+0 to Fit</p>
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

      {/* Full Screen Mosaic Engine */}
      <div className="w-full h-full flex-grow relative bg-white">
        <MosaicCanvas 
          tiles={tiles} 
          config={{ gridCols: gridConfigState.cols, gridRows: gridConfigState.rows, tileSize: 15, masterImage }} 
        />
      </div>

      {/* Phase 5 Interactive Search Widget */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
         <form 
           onSubmit={handleSearch}
           className={`bg-white/80 backdrop-blur-md border ${searchFocused ? 'border-black' : 'border-neutral-300'} shadow-xl rounded-full p-2 flex items-center transition-all duration-300`}
         >
            <input 
              type="text" 
              placeholder="Find my photo (Mobile #)" 
              className="bg-transparent flex-grow px-4 text-sm outline-none text-black placeholder:text-neutral-500 font-medium"
              value={searchMobile}
              onChange={e => setSearchMobile(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <button type="submit" className="bg-black text-white rounded-full p-2.5 hover:bg-neutral-800 transition shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
         </form>
      </div>

      {isModalOpen && <ImageUploader onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

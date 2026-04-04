"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Backend Queries
  const pendingSubmissions = useQuery(api.submissions.getPending);
  const approvedSubmissions = useQuery(api.submissions.getApproved);
  const activeGrid = useQuery(api.grid.getActiveGrid);
  
  const approveMutation = useMutation(api.submissions.approveSubmission);
  const rejectMutation = useMutation(api.submissions.rejectSubmission);
  const expandGridMutation = useMutation(api.grid.expandGrid);

  const tileColorsRef = useRef<number[][]>([]);
  
  // On boot, silently precalculate the King Imam base color geometry mapping in the background for placement algorithms
  useEffect(() => {
    if (!activeGrid) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "/base-image.jpg";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = activeGrid.cols;
      canvas.height = activeGrid.rows;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, activeGrid.cols, activeGrid.rows);
      
      const imageData = ctx.getImageData(0, 0, activeGrid.cols, activeGrid.rows).data;
      const extractedMasterColors: number[][] = [];
      const totalCount = activeGrid.cols * activeGrid.rows;
      for (let i = 0; i < totalCount; i++) {
        extractedMasterColors.push([imageData[i * 4], imageData[i * 4 + 1], imageData[i * 4 + 2]]);
      }
      tileColorsRef.current = extractedMasterColors;
    };
  }, [activeGrid]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "mosaic2026") {
      setIsAuthenticated(true);
    } else {
      alert("Invalid Password");
    }
  };

  const handleApprove = async (sub: { _id: Id<"submissions">, url: string | null }) => {
    if (!activeGrid || !approvedSubmissions || tileColorsRef.current.length === 0) return;
    setIsProcessing(true);
    
    try {
      // 1. Check if the matrix is full and requires capacity expansion
      if (approvedSubmissions.length >= activeGrid.targetTotal * 0.95) {
        // Expand maintaining 16:9 ratio blocks
        await expandGridMutation({ addCols: 16, addRows: 9 });
        alert("Matrix Capacity Expanded Successfully. Please click approve again to map coordinate.");
        setIsProcessing(false);
        return; 
      }

      // 2. Fetch the compression blob to figure out the user's color
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1, 1);
        const userColor = ctx.getImageData(0, 0, 1, 1).data; 

        // 3. Search algorithm: Finding the closest center-weighted vacant coordinate matching user color
        const centerCol = activeGrid.cols / 2;
        const centerRow = activeGrid.rows / 2;
        let bestIndex = -1;
        let minScore = Infinity;

        const takenPositions = new Set(approvedSubmissions.map(a => a.position));

        tileColorsRef.current.forEach((masterColor, index) => {
          if (takenPositions.has(index)) return; 
          
          const col = index % activeGrid.cols;
          const row = Math.floor(index / activeGrid.cols);
          
          // Euclidean color distance math
          const colorDist = Math.sqrt(
            Math.pow(masterColor[0] - userColor[0], 2) +
            Math.pow(masterColor[1] - userColor[1], 2) +
            Math.pow(masterColor[2] - userColor[2], 2)
          );

          // Center proximity math
          const centerDist = Math.max(
            Math.abs(col - centerCol), 
            Math.abs(row - centerRow) * (activeGrid.cols / activeGrid.rows)
          );

          // Blend factors prioritizing center growth but respecting tones
          const compositeScore = (centerDist * 2) + (colorDist * 0.05);

          if (compositeScore < minScore) {
            minScore = compositeScore;
            bestIndex = index;
          }
        });

        if (bestIndex !== -1) {
          // 4. Secure the approval coordinate insertion
          await approveMutation({
            submissionId: sub._id,
            position: bestIndex
          });
        }
        setIsProcessing(false);
      };
      img.src = sub.url || "";
    } catch (e) {
      console.error(e);
      alert("Geometry mapping failed.");
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: Id<"submissions">) => {
    if(confirm("Permanently reject this photo?")) {
      await rejectMutation({ submissionId: id });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center text-black">Admin Access</h1>
          <input
            type="password"
            placeholder="Passcode"
            className="w-full px-4 py-3 bg-white text-black placeholder:text-neutral-400 border border-neutral-300 rounded-xl mb-6 outline-none focus:ring-2 focus:ring-black transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-neutral-800 transition">
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black font-sans">Verification Console</h1>
            <p className="text-neutral-500 mt-1 font-medium">
              Review authentic contributions before mapping into the Canvas geometric array.
            </p>
          </div>
          {activeGrid && approvedSubmissions && (
             <div className="text-right hidden sm:block">
               <div className="text-2xl font-bold text-blue-600">{approvedSubmissions.length} <span className="text-sm text-neutral-400 font-medium">/ {activeGrid.targetTotal} slots</span></div>
               <div className="text-xs text-neutral-400 uppercase tracking-widest mt-1">Active Map</div>
             </div>
          )}
        </div>

        {pendingSubmissions === undefined ? (
          <div className="text-neutral-400 font-medium animate-pulse">Scanning secure file stream...</div>
        ) : pendingSubmissions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center text-neutral-400 shadow-sm">
            No pending submissions waiting for approval!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pendingSubmissions.map((sub) => (
              <div key={sub._id} className="bg-white rounded-3xl shadow-md border border-neutral-100 overflow-hidden flex flex-col group transition-all hover:shadow-xl">
                <div className="p-4 bg-neutral-900 border-b border-neutral-100 relative">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sub.url!} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                </div>
                
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="font-bold text-lg text-black">{sub.name}</h3>
                  <div className="text-neutral-500 text-sm font-medium mt-1 font-mono tracking-tight">{sub.mobileNumber}</div>
                  
                  <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-100 mt-auto">
                    <button 
                      onClick={() => handleReject(sub._id)}
                      disabled={isProcessing}
                      className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 border border-transparent transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleApprove(sub)}
                      disabled={isProcessing}
                      className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-black text-white shadow-lg hover:bg-neutral-800 transition disabled:opacity-50"
                    >
                      {isProcessing ? "Mapping..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

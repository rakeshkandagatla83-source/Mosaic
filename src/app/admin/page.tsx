"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/* ─────────────────────────────────────────────
   Admin Add User Modal
───────────────────────────────────────────── */
function AdminAddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, mobile: string, file: File) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim() || !mobile.trim()) return;
    setLoading(true);
    try {
      await onAdd(name.trim(), mobile.trim(), file);
      onClose();
    } catch {
      alert("Failed to add user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-black">Add User Directly</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-neutral-200 hover:border-blue-400 rounded-2xl overflow-hidden flex items-center justify-center transition-colors"
            style={{ height: 200 }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-neutral-400 px-4">
                <div className="text-3xl mb-2">📷</div>
                <div className="text-sm font-medium">Click to choose photo</div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Rakesh K"
              className="w-full px-4 py-3 bg-white text-black placeholder:text-neutral-400 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-3 bg-white text-black placeholder:text-neutral-400 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-mono"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || !name.trim() || !mobile.trim()}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add to Mosaic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Admin Edit User Modal
───────────────────────────────────────────── */
type EditTarget = {
  id: Id<"submissions">;
  name: string;
  mobile: string;
  existingUrl: string;
};

function AdminEditModal({
  target,
  onClose,
  onEdit,
}: {
  target: EditTarget;
  onClose: () => void;
  onEdit: (id: Id<"submissions">, name: string, mobile: string, newFile: File | null) => Promise<void>;
}) {
  const [name, setName] = useState(target.name);
  const [mobile, setMobile] = useState(target.mobile);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const hasChanges = name.trim() !== target.name || mobile.trim() !== target.mobile || file !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;
    setLoading(true);
    try {
      await onEdit(target.id, name.trim(), mobile.trim(), file);
      onClose();
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-black">Edit User</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo picker — shows existing photo, click to replace */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
              Photo {file ? <span className="text-blue-500 normal-case font-normal">— new photo selected</span> : <span className="text-neutral-400 normal-case font-normal">— click to replace</span>}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-neutral-200 hover:border-blue-400 rounded-2xl overflow-hidden flex items-center justify-center transition-colors relative group"
              style={{ height: 200 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview ?? target.existingUrl}
                alt="current photo"
                className="w-full h-full object-cover"
              />
              {/* Overlay hint */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-sm font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Replace Photo
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Rakesh K"
              className="w-full px-4 py-3 bg-white text-black placeholder:text-neutral-400 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-3 bg-white text-black placeholder:text-neutral-400 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-sm font-mono"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges || !name.trim() || !mobile.trim()}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Admin Dashboard
───────────────────────────────────────────── */
export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");

  // Pending list UI state
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingView, setPendingView] = useState<"grid" | "list">("grid");
  const [pendingPage, setPendingPage] = useState(1);

  // Approved list UI state
  const [approvedSearch, setApprovedSearch] = useState("");
  const [approvedView, setApprovedView] = useState<"grid" | "list">("grid");
  const [approvedPage, setApprovedPage] = useState(1);

  // Backend Queries & Mutations
  const pendingSubmissions = useQuery(api.submissions.getPending);
  const approvedSubmissions = useQuery(api.submissions.getApproved);
  const activeGrid = useQuery(api.grid.getActiveGrid);

  const approveMutation = useMutation(api.submissions.approveSubmission);
  const rejectMutation = useMutation(api.submissions.rejectSubmission);
  const removeApprovedMutation = useMutation(api.submissions.removeApproved);
  const updateSubmissionMutation = useMutation(api.submissions.updateSubmission);
  const adminCreateMutation = useMutation(api.submissions.adminCreateSubmission);
  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const expandGridMutation = useMutation(api.grid.expandGrid);

  const tileColorsRef = useRef<number[][]>([]);

  // Pre-calculate base color geometry
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
      const colors: number[][] = [];
      for (let i = 0; i < activeGrid.cols * activeGrid.rows; i++) {
        colors.push([imageData[i * 4], imageData[i * 4 + 1], imageData[i * 4 + 2]]);
      }
      tileColorsRef.current = colors;
    };
  }, [activeGrid]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "mosaic2026") setIsAuthenticated(true);
    else alert("Invalid Password");
  };

  // Shared colour-match algorithm — returns the best empty grid index for a given image pixel colour
  const findBestPosition = (userColor: Uint8ClampedArray, takenPositions: Set<number | undefined>): number => {
    if (!activeGrid) return -1;
    const centerCol = activeGrid.cols / 2;
    const centerRow = activeGrid.rows / 2;
    let bestIndex = -1;
    let minScore = Infinity;
    tileColorsRef.current.forEach((masterColor, index) => {
      if (takenPositions.has(index)) return;
      const col = index % activeGrid.cols;
      const row = Math.floor(index / activeGrid.cols);
      const colorDist = Math.sqrt(
        Math.pow(masterColor[0] - userColor[0], 2) +
        Math.pow(masterColor[1] - userColor[1], 2) +
        Math.pow(masterColor[2] - userColor[2], 2)
      );
      const centerDist = Math.max(
        Math.abs(col - centerCol),
        Math.abs(row - centerRow) * (activeGrid.cols / activeGrid.rows)
      );
      const score = centerDist * 2 + colorDist * 0.05;
      if (score < minScore) { minScore = score; bestIndex = index; }
    });
    return bestIndex;
  };

  const handleApprove = async (sub: { _id: Id<"submissions">; url: string | null }) => {
    if (!activeGrid || !approvedSubmissions || tileColorsRef.current.length === 0) return;
    setIsProcessing(true);
    try {
      if (approvedSubmissions.length >= activeGrid.targetTotal * 0.95) {
        await expandGridMutation({ addCols: 16, addRows: 9 });
        alert("Matrix Capacity Expanded. Click Approve again to map coordinate.");
        setIsProcessing(false);
        return;
      }
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1; canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1, 1);
        const userColor = ctx.getImageData(0, 0, 1, 1).data;
        const takenPositions = new Set(approvedSubmissions.map((a) => a.position));
        const bestIndex = findBestPosition(userColor, takenPositions);
        if (bestIndex !== -1) {
          await approveMutation({ submissionId: sub._id, position: bestIndex });
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
    if (confirm("Permanently reject this photo?")) {
      await rejectMutation({ submissionId: id });
    }
  };

  const handleRemoveApproved = async (id: Id<"submissions">, name: string) => {
    if (confirm(`Remove "${name}" from the mosaic? This will permanently delete their photo.`)) {
      await removeApprovedMutation({ submissionId: id });
    }
  };

  // Compress helper — reused for both add and edit flows
  const compressFile = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 250;
          const scale = MAX / Math.max(img.width, img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas ctx failed"));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Blob failed")), "image/jpeg", 0.85);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleEdit = async (id: Id<"submissions">, name: string, mobile: string, newFile: File | null) => {
    if (newFile) {
      const blob = await compressFile(newFile);
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      const { storageId } = await res.json();
      await updateSubmissionMutation({ submissionId: id, name, mobileNumber: mobile, newStorageId: storageId });
    } else {
      await updateSubmissionMutation({ submissionId: id, name, mobileNumber: mobile });
    }
  };

  // Admin direct-add: compress → upload → colour-match → insert approved
  const handleAdminAdd = async (name: string, mobile: string, file: File) => {
    if (!activeGrid || !approvedSubmissions || tileColorsRef.current.length === 0) {
      throw new Error("Grid not ready");
    }

    const compressedBlob = await compressFile(file);

    // Upload to Convex storage
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: compressedBlob,
    });
    const { storageId } = await res.json();

    // Get colour of compressed image for position matching
    const userColor = await new Promise<Uint8ClampedArray>((resolve) => {
      const url = URL.createObjectURL(compressedBlob);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = 1; c.height = 1;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(new Uint8ClampedArray([128, 128, 128, 255]));
        ctx.drawImage(img, 0, 0, 1, 1);
        resolve(ctx.getImageData(0, 0, 1, 1).data);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    const takenPositions = new Set(approvedSubmissions.map((a) => a.position));
    const bestIndex = findBestPosition(userColor, takenPositions);
    if (bestIndex === -1) throw new Error("No empty positions available");

    await adminCreateMutation({ storageId, name, mobileNumber: mobile, position: bestIndex });
  };

  // Filter for search
  const filteredApproved = (approvedSubmissions ?? []).filter((sub) => {
    const q = approvedSearch.toLowerCase().trim();
    if (!q) return true;
    return sub.name.toLowerCase().includes(q) || sub.mobileNumber.toLowerCase().includes(q);
  });

  // Pagination
  const LIST_PER_PAGE = 10;
  const GRID_PER_PAGE = 12;
  const perPage = approvedView === "list" ? LIST_PER_PAGE : GRID_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filteredApproved.length / perPage));
  // Clamp page in case filter shrinks results
  const safePage = Math.min(approvedPage, totalPages);
  const pagedApproved = filteredApproved.slice((safePage - 1) * perPage, safePage * perPage);

  // Reset to page 1 when search or view changes
  const handleApprovedSearch = (q: string) => { setApprovedSearch(q); setApprovedPage(1); };
  const handleApprovedView = (v: "grid" | "list") => { setApprovedView(v); setApprovedPage(1); };

  // --- Pending filter + pagination ---
  const filteredPending = (pendingSubmissions ?? []).filter((sub) => {
    const q = pendingSearch.toLowerCase().trim();
    if (!q) return true;
    return sub.name.toLowerCase().includes(q) || sub.mobileNumber.toLowerCase().includes(q);
  });
  const PENDING_LIST_PER_PAGE = 10;
  const PENDING_GRID_PER_PAGE = 12;
  const pendingPerPage = pendingView === "list" ? PENDING_LIST_PER_PAGE : PENDING_GRID_PER_PAGE;
  const pendingTotalPages = Math.max(1, Math.ceil(filteredPending.length / pendingPerPage));
  const safePendingPage = Math.min(pendingPage, pendingTotalPages);
  const pagedPending = filteredPending.slice((safePendingPage - 1) * pendingPerPage, safePendingPage * pendingPerPage);
  const handlePendingSearch = (q: string) => { setPendingSearch(q); setPendingPage(1); };
  const handlePendingView = (v: "grid" | "list") => { setPendingView(v); setPendingPage(1); };

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
      {showAddModal && (
        <AdminAddModal onClose={() => setShowAddModal(false)} onAdd={handleAdminAdd} />
      )}
      {editTarget && (
        <AdminEditModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onEdit={handleEdit}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-black">Verification Console</h1>
            <p className="text-neutral-500 mt-1 font-medium">
              Review contributions before mapping into the Canvas.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeGrid && approvedSubmissions && (
              <div className="text-right hidden sm:block">
                <div className="text-2xl font-bold text-blue-600">
                  {approvedSubmissions.length}{" "}
                  <span className="text-sm text-neutral-400 font-medium">/ {activeGrid.targetTotal} slots</span>
                </div>
                <div className="text-xs text-neutral-400 uppercase tracking-widest mt-1">Active Map</div>
              </div>
            )}
            {/* Add User — only relevant on Approved tab */}
            {activeTab === "approved" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-2xl p-1 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "pending"
                ? "bg-black text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              activeTab === "pending" ? "bg-amber-400" : "bg-amber-300"
            } ${pendingSubmissions && pendingSubmissions.length > 0 ? "animate-pulse" : ""}`} />
            Pending Approvals
            {pendingSubmissions && pendingSubmissions.length > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${
                activeTab === "pending" ? "bg-amber-400 text-black" : "bg-amber-100 text-amber-700"
              }`}>
                {pendingSubmissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "approved"
                ? "bg-black text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              activeTab === "approved" ? "bg-green-400" : "bg-green-300"
            }`} />
            Approved Users
            {approvedSubmissions && approvedSubmissions.length > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${
                activeTab === "approved" ? "bg-green-400 text-black" : "bg-green-100 text-green-700"
              }`}>
                {approvedSubmissions.length}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════
            TAB: PENDING APPROVALS
        ══════════════════════════════════════════════ */}
        {activeTab === "pending" && (
          <section>
            {/* Controls: search + view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
              <div className="relative flex-1 sm:w-72">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search name or mobile..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white text-black text-sm placeholder:text-neutral-400 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition"
                  value={pendingSearch}
                  onChange={(e) => handlePendingSearch(e.target.value)}
                />
              </div>
              <div className="flex bg-white border border-neutral-200 rounded-xl overflow-hidden sm:ml-auto">
                <button
                  onClick={() => handlePendingView("grid")}
                  className={`p-2.5 transition ${pendingView === "grid" ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
                  title="Thumbnail view"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handlePendingView("list")}
                  className={`p-2.5 transition ${pendingView === "list" ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {pendingSubmissions === undefined ? (
              <div className="text-neutral-400 font-medium animate-pulse">Scanning secure file stream...</div>
            ) : filteredPending.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center text-neutral-400 shadow-sm">
                {pendingSearch ? `No results for "${pendingSearch}"` : "✅ No pending submissions — all caught up!"}
              </div>
            ) : pendingView === "grid" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pagedPending.map((sub) => (
                    <div key={sub._id} className="bg-white rounded-3xl shadow-md border border-neutral-100 overflow-hidden flex flex-col group transition-all hover:shadow-xl">
                      <div className="p-4 bg-neutral-900 border-b border-neutral-100">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sub.url!} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <h3 className="font-bold text-lg text-black">{sub.name}</h3>
                        <div className="text-neutral-500 text-sm font-medium mt-1 font-mono tracking-tight">{sub.mobileNumber}</div>
                        <div className="flex gap-3 mt-auto pt-6 border-t border-neutral-100">
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
                <PaginationBar current={safePendingPage} total={pendingTotalPages} onChange={setPendingPage} itemCount={filteredPending.length} perPage={PENDING_GRID_PER_PAGE} />
              </>
            ) : (
              /* Pending list view */
              <>
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-[48px_1fr_160px_200px] gap-4 px-5 py-3 bg-neutral-50 border-b border-neutral-100 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    <div />
                    <div>Name</div>
                    <div>Mobile</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {pagedPending.map((sub, i) => (
                    <div
                      key={sub._id}
                      className={`grid grid-cols-[48px_1fr_160px_200px] gap-4 items-center px-5 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${i % 2 === 0 ? "" : "bg-neutral-50/40"}`}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sub.url ?? ""} alt={sub.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="font-semibold text-sm text-black truncate">{sub.name}</div>
                      <div className="text-sm text-neutral-500 font-mono">{sub.mobileNumber}</div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleReject(sub._id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(sub)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black text-white hover:bg-neutral-800 transition disabled:opacity-50"
                        >
                          {isProcessing ? "Mapping..." : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar current={safePendingPage} total={pendingTotalPages} onChange={setPendingPage} itemCount={filteredPending.length} perPage={PENDING_LIST_PER_PAGE} />
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════
            TAB: APPROVED USERS LIST
        ══════════════════════════════════════════════ */}
        {activeTab === "approved" && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="text-xl font-bold text-black">Approved Users</h2>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {approvedSubmissions?.length ?? 0} approved
              </span>
            </div>

            <div className="flex items-center gap-3 sm:ml-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-72">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search name or mobile..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white text-black text-sm placeholder:text-neutral-400 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={approvedSearch}
                  onChange={(e) => handleApprovedSearch(e.target.value)}
                />
              </div>
              {/* View toggle */}
              <div className="flex bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => handleApprovedView("grid")}
                  className={`p-2.5 transition ${approvedView === "grid" ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
                  title="Thumbnail view"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleApprovedView("list")}
                  className={`p-2.5 transition ${approvedView === "list" ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {approvedSubmissions === undefined ? (
            <div className="text-neutral-400 font-medium animate-pulse">Loading approved records...</div>
          ) : filteredApproved.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-neutral-200 rounded-3xl p-12 text-center text-neutral-400 shadow-sm">
              {approvedSearch ? `No results for "${approvedSearch}"` : "No approved submissions yet."}
            </div>
          ) : approvedView === "grid" ? (
            /* ── THUMBNAIL GRID VIEW ── */
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {pagedApproved.map((sub) => (
                  <div key={sub._id} className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-square overflow-hidden bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sub.url ?? ""} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    {/* Name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="text-white text-xs font-semibold truncate">{sub.name}</div>
                    </div>
                    {/* Position badge */}
                    {sub.position !== undefined && (
                      <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        #{sub.position}
                      </div>
                    )}
                    {/* Edit button */}
                    <button
                      onClick={() => setEditTarget({ id: sub._id, name: sub.name, mobile: sub.mobileNumber, existingUrl: sub.url ?? "" })}
                      className="absolute top-1.5 right-8 w-6 h-6 rounded-full bg-blue-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-blue-600"
                      title="Edit user"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveApproved(sub._id, sub.name)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold hover:bg-red-600"
                      title="Remove from mosaic"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <PaginationBar current={safePage} total={totalPages} onChange={setApprovedPage} itemCount={filteredApproved.length} perPage={GRID_PER_PAGE} />
            </>
          ) : (
            /* ── LIST VIEW ── */
            <>
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[48px_1fr_160px_80px_96px] gap-4 px-5 py-3 bg-neutral-50 border-b border-neutral-100 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <div />
                  <div>Name</div>
                  <div>Mobile</div>
                  <div className="text-center">Grid #</div>
                  <div className="text-center">Actions</div>
                </div>
                {pagedApproved.map((sub, i) => (
                  <div
                    key={sub._id}
                    className={`grid grid-cols-[48px_1fr_160px_80px_96px] gap-4 items-center px-5 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${i % 2 === 0 ? "" : "bg-neutral-50/40"}`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sub.url ?? ""} alt={sub.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="font-semibold text-sm text-black truncate">{sub.name}</div>
                    <div className="text-sm text-neutral-500 font-mono">{sub.mobileNumber}</div>
                    <div className="text-center">
                      {sub.position !== undefined ? (
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">#{sub.position}</span>
                      ) : (
                        <span className="text-neutral-300 text-xs">—</span>
                      )}
                    </div>
                    {/* Edit + Remove */}
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => setEditTarget({ id: sub._id, name: sub.name, mobile: sub.mobileNumber, existingUrl: sub.url ?? "" })}
                        className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 flex items-center justify-center transition-colors"
                        title="Edit user"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveApproved(sub._id, sub.name)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                        title="Remove from mosaic"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationBar current={safePage} total={totalPages} onChange={setApprovedPage} itemCount={filteredApproved.length} perPage={LIST_PER_PAGE} />
            </>
          )}
        </section>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Pagination Bar Component
───────────────────────────────────────────── */
function PaginationBar({
  current,
  total,
  onChange,
  itemCount,
  perPage,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
  itemCount: number;
  perPage: number;
}) {
  if (total <= 1) return null;

  const start = (current - 1) * perPage + 1;
  const end = Math.min(current * perPage, itemCount);

  // Build page number array: show up to 5 pages around current
  const pages: (number | "…")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("…");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push("…");
    pages.push(total);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-neutral-100">
      {/* Count label */}
      <div className="text-sm text-neutral-400">
        Showing <span className="font-semibold text-neutral-600">{start}–{end}</span> of <span className="font-semibold text-neutral-600">{itemCount}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-neutral-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                p === current
                  ? "bg-black text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current === total}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}


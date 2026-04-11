"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Cropper from "react-easy-crop";
import confetti from "canvas-confetti";

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export default function ImageUploader({ onClose }: { onClose: () => void }) {
  // Step Management: "upload" | "adjust" | "details" | "success"
  const [step, setStep] = useState<"upload" | "adjust" | "details" | "success">("upload");

  // Selection & Crop State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const createSubmission = useMutation(api.submissions.createSubmission);

  // 1. Handle File Selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setStep("adjust");
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. Process Crop & Move to Details
  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => (img.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TARGET_SIZE = 250;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;

    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      TARGET_SIZE,
      TARGET_SIZE
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setFinalBlob(blob);
          setStep("details");
        }
      },
      "image/jpeg",
      0.85
    );
  };

  // 3. Final Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalBlob || !name || !mobileNumber) return;
    setSubmitting(true);

    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: finalBlob,
      });
      const { storageId } = await result.json();

      await createSubmission({
        storageId,
        name,
        mobileNumber,
        comment: comment.trim() || undefined,
      });

      // Celebration!
      setStep("success");
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 100,
      });

      // Auto-close after 4 seconds
      setTimeout(() => {
        onClose();
      }, 4000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-white/20">
        
        {/* Close Button — hidden on success to focus on the message */}
        {step !== "success" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors shadow-sm"
          >
            ✕
          </button>
        )}

        {/* --- STEP 1: UPLOAD --- */}
        {step === "upload" && (
          <div className="p-5 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-2">Join the Collective</h2>
            <p className="text-neutral-500 mb-5 sm:mb-8 font-medium">Be a part of the King Imam master portrait.</p>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-neutral-200 rounded-3xl p-8 sm:p-12 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="font-bold text-neutral-700 text-sm sm:text-base">Tap to upload your photo</p>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">Photos will be cropped to a perfect square.</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={onFileChange} 
              />
            </div>
            
            <p className="mt-5 sm:mt-8 text-xs text-neutral-400 uppercase tracking-widest font-bold">Secure Processing Enabled</p>
          </div>
        )}

        {/* --- STEP 2: ADJUST --- */}
        {step === "adjust" && imageSrc && (
          <div className="flex flex-col" style={{ height: 'min(500px, 70vh)' }}>
            <div className="p-4 sm:p-6 border-b">
              <h3 className="font-bold text-base sm:text-lg text-black">Position Your Photo</h3>
              <p className="text-xs text-neutral-500">Drag to move · pinch or scroll to zoom.</p>
            </div>
            <div className="flex-grow relative bg-neutral-100">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={true}
              />
            </div>
            <div className="p-6 bg-white flex gap-3">
              <button 
                onClick={() => setStep("upload")}
                className="flex-1 py-3 font-bold text-neutral-600 border border-neutral-200 rounded-2xl hover:bg-neutral-50"
              >
                Back
              </button>
              <button 
                onClick={handleConfirmCrop}
                className="flex-1 py-3 font-bold text-white bg-black rounded-2xl hover:bg-neutral-800 transition-transform active:scale-95"
              >
                Looks Good
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: DETAILS --- */}
        {step === "details" && (
          <div className="p-5 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 mb-4 sm:mb-6">Final Details</h3>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Full Name</label>
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Rakesh K"
                  className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-black outline-none focus:ring-2 focus:ring-blue-600 transition"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Mobile Number</label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-black outline-none focus:ring-2 focus:ring-blue-600 transition"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                />
                <p className="text-[10px] text-neutral-400 mt-2">Required for the "Find My Photo" feature.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Your Message (Optional)</label>
                <textarea
                  placeholder="Share a thought or just say hi..."
                  className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-black outline-none focus:ring-2 focus:ring-blue-600 transition resize-none h-24"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition disabled:opacity-50"
              >
                {submitting ? "Securing Your Spot..." : "Complete Submission"}
              </button>
            </form>
          </div>
        )}

        {/* --- STEP 4: SUCCESS --- */}
        {step === "success" && (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-neutral-900 mb-4">Submission Received!</h2>
            <p className="text-neutral-500 leading-relaxed max-w-xs mx-auto mb-8">
              Your photo is being mapped. <span className="text-blue-600 font-bold">Once all photos are uploaded, the campaign image will be revealed.</span>
            </p>
            <div className="flex items-center gap-2 text-neutral-400 text-sm font-medium italic">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Closing in a moment...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

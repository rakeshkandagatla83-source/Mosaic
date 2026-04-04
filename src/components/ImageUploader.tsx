import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ImageUploader({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const createSubmission = useMutation(api.submissions.createSubmission);

  // Compress the image down immediately via Canvas before saving
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(null);
    setPreview(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        // Target an ultra-lightweight 250x250 square constraint for speed
        const TARGET_SIZE = 250;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        
        // Calculate crop to make it a perfect square
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;
        
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], selected.name, { type: "image/jpeg" });
              setFile(compressedFile);
              setPreview(URL.createObjectURL(compressedFile));
            }
          },
          "image/jpeg",
          0.85 // 85% compression quality provides immense bandwidth savings
        );
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !mobileNumber) return;
    setSubmitting(true);

    try {
      // 1. Get secure POST URL from Convex
      const postUrl = await generateUploadUrl();
      
      // 2. Upload the compressed blob to Convex File Storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // 3. Document the submission into the database mapped to the storage pointer
      await createSubmission({
        storageId,
        name,
        mobileNumber
      });

      alert("Photo submitted successfully for review!");
      onClose();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors"
        >
          ✕
        </button>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-2">Join the Mosaic</h2>
          <p className="text-sm text-neutral-500 mb-6">Upload your photo to become a permanent piece of the King Imam master portrait.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Your Photo</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-lg hover:bg-neutral-50 transition-colors">
                <div className="space-y-1 text-center">
                  {preview ? (
                    <img src={preview} alt="Preview" className="mx-auto h-32 w-32 object-cover rounded-full border-4 border-white shadow-lg" />
                  ) : (
                    <div className="mx-auto h-12 w-12 text-neutral-400">
                      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex text-sm text-neutral-600 justify-center">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>{preview ? 'Change Photo' : 'Upload a file'}</span>
                      <input name="photo" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} required />
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 hidden sm:block">PNG, JPG up to 10MB (we'll compress it for you)</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-400 text-black"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-400 text-black"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                required
              />
              <p className="text-xs text-neutral-500 mt-1">This will be used for your personal "Find My Photo" search.</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !file}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Uploading Securely..." : "Submit to Masterpiece"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

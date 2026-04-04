"use client";

const cache = new Map<string, HTMLImageElement>();

export function useImageCache() {
  function getImage(url: string | undefined): HTMLImageElement | undefined {
    if (!url) return undefined;
    
    // Strip the retry param so we deduplicate cache entries for the same face
    const cacheKey = url.replace(/&retry=\d+/, '');
    
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const img = new Image();
    img.crossOrigin = "Anonymous"; // necessary for canvas pixel reading (CORS)
    img.src = url;
    
    // Save to cache under the deduplicated key
    cache.set(cacheKey, img);
    return img;
  }

  return { getImage };
}

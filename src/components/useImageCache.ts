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

  // Preload a list of URLs into the shared cache immediately.
  // Call this as soon as URLs are known so img.complete = true
  // by the time the canvas draw loop needs them.
  function preloadImages(urls: string[]) {
    urls.forEach(url => {
      if (!url) return;
      const cacheKey = url.replace(/&retry=\d+/, '');
      if (cache.has(cacheKey)) return; // already loading or loaded
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      cache.set(cacheKey, img);
    });
  }

  return { getImage, preloadImages };
}

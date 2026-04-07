"use client";
import { useEffect } from "react";

// Disables the browser right-click context menu across the entire site.
// Helps protect images and canvas content from casual save/inspect.
export default function DisableRightClick() {
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return null;
}

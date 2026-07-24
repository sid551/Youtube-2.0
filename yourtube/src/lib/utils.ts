import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_FALLBACK_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export function getVideoUrl(filepath?: string): string {
  if (!filepath) return DEFAULT_FALLBACK_VIDEO;
  if (filepath.startsWith("http://") || filepath.startsWith("https://")) {
    return filepath;
  }
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const cleanPath = filepath.replace(/\\/g, "/").replace(/^\//, "");
  return `${backendUrl}/${cleanPath}`;
}

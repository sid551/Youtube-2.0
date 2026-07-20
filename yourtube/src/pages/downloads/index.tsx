import DownloadsContent from "@/components/DownloadsContent";
import { Suspense } from "react";

export default function DownloadsPage() {
  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Downloads</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <DownloadsContent />
        </Suspense>
      </div>
    </main>
  );
}

import { Compass } from "lucide-react";

export default function ExplorePage() {
  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Explore</h1>
        <div className="text-center py-16">
          <Compass className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Explore coming soon.</p>
          <p className="text-sm text-gray-400 mt-1">
            Trending and featured content will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}

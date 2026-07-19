import HistoryContent from "@/components/HistoryContent";
import React, { Suspense, useEffect, useState } from "react";

const index = () => {
  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Watch history</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <HistoryContent />
        </Suspense>
      </div>
    </main>
  );
};

export default index;

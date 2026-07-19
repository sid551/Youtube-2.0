import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";
import { UserProvider } from "../lib/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black">
        <title>Your-Tube Clone</title>
        <Header onMenuClick={() => setSidebarOpen((prev) => !prev)} />
        <Toaster />
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 min-w-0">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </UserProvider>
  );
}

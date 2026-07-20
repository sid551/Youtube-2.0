import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  X,
  Download,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useUser();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  const navItems = (
    <nav className="space-y-1">
      <Link href="/" onClick={onClose}>
        <Button variant="ghost" className="w-full justify-start">
          <Home className="w-5 h-5 mr-3" /> Home
        </Button>
      </Link>
      <Link href="/explore" onClick={onClose}>
        <Button variant="ghost" className="w-full justify-start">
          <Compass className="w-5 h-5 mr-3" /> Explore
        </Button>
      </Link>
      <Link href="/plans" onClick={onClose}>
        <Button variant="ghost" className="w-full justify-start">
          <PlaySquare className="w-5 h-5 mr-3" /> Plans
        </Button>
      </Link>

      {user && (
        <div className="border-t pt-2 mt-2">
          <Link href="/history" onClick={onClose}>
            <Button variant="ghost" className="w-full justify-start">
              <History className="w-5 h-5 mr-3" /> History
            </Button>
          </Link>
          <Link href="/liked" onClick={onClose}>
            <Button variant="ghost" className="w-full justify-start">
              <ThumbsUp className="w-5 h-5 mr-3" /> Liked videos
            </Button>
          </Link>
          <Link href="/watch-later" onClick={onClose}>
            <Button variant="ghost" className="w-full justify-start">
              <Clock className="w-5 h-5 mr-3" /> Watch later
            </Button>
          </Link>
          <Link href="/downloads" onClick={onClose}>
            <Button variant="ghost" className="w-full justify-start">
              <Download className="w-5 h-5 mr-3" /> Downloads
            </Button>
          </Link>
          {user?.channelname ? (
            <Link href={`/channel/${user._id}`} onClick={onClose}>
              <Button variant="ghost" className="w-full justify-start">
                <User className="w-5 h-5 mr-3" /> Your channel
              </Button>
            </Link>
          ) : (
            <div className="px-2 py-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setisdialogeopen(true);
                  onClose();
                }}
              >
                Create Channel
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 bg-white border-r min-h-screen p-2">
        {navItems}
      </aside>

      {/* Mobile/tablet drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl p-4 flex flex-col gap-2 lg:hidden overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-base">Menu</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            {navItems}
          </aside>
        </>
      )}

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default Sidebar;

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function DownloadsContent() {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [quota, setQuota] = useState<{
    plan: string;
    limit: number | null;
    used: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([loadDownloads(), loadQuota()]).finally(() =>
        setLoading(false)
      );
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDownloads = async () => {
    try {
      const res = await axiosInstance.get(`/download/list/${user._id}`);
      setDownloads(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadQuota = async () => {
    try {
      const res = await axiosInstance.get(`/download/quota/${user._id}`);
      setQuota(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Sign in to view downloads
        </h2>
        <p className="text-gray-600">
          Your downloaded videos will appear here.
        </p>
      </div>
    );
  }

  if (loading) return <div>Loading downloads...</div>;

  const currentPlan = quota?.plan || "free";
  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 1;

  return (
    <div className="space-y-8">
      {/* Quota banner */}
      <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium capitalize">{currentPlan} plan</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {quota?.limit === null
              ? `${used} downloads today (unlimited)`
              : `${used} / ${limit} downloads used today`}
          </p>
          {quota?.limit !== null && (
            <div className="mt-2 h-1.5 w-48 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
        {currentPlan !== "pro" && (
          <Link
            href="/plans"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              background: "#2563eb",
              color: "#ffffff",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Upgrade plan
          </Link>
        )}
      </div>

      {/* Downloads list */}
      {downloads.length === 0 ? (
        <div className="text-center py-10">
          <Download className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No downloads yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Hit the Download button on any video to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{downloads.length} downloaded</p>
          {downloads.map((item) => (
            <div key={item._id} className="flex gap-4 group">
              <Link
                href={`/watch/${item.videoid._id}`}
                className="flex-shrink-0"
              >
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={`${process.env.BACKEND_URL}/${item.videoid?.filepath}`}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/watch/${item.videoid._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videoid.videotitle}
                  </h3>
                </Link>
                {item.videoid?.uploader && item.videoid.uploader !== "undefined" ? (
                  <Link href={`/channel/${item.videoid.uploader}`}>
                    <p className="text-sm text-gray-600 hover:underline hover:text-black">
                      {item.videoid.videochanel}
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-600">
                    {item.videoid.videochanel}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Downloaded {formatDistanceToNow(new Date(item.createdAt))} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

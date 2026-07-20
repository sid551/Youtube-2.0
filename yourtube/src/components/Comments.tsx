import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Flag, Languages, MapPin } from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  language: string;
  location?: string;
  likes: string[];
  dislikes: string[];
  reports: string[];
  flagged: boolean;
}

// --- Client-side structural checks only (fast, no API) ---
// Abusive word detection is handled server-side by bad-words filter
const SPAM_PATTERN = /(.)\1{6,}/;
const SPECIAL_CHAR_SPAM = /^[^a-zA-Z0-9\s]{4,}$/;

const getBlockReason = (text: string): string | null => {
  if (SPAM_PATTERN.test(text)) return "spam detected";
  if (SPECIAL_CHAR_SPAM.test(text.trim())) return "invalid comment format";
  return null;
};

// --- Google Translate unofficial API (better accuracy, no key needed) ---
const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  const src = sourceLang && sourceLang !== "auto" ? sourceLang : "en";
  if (src === targetLang) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    // response is nested arrays: [[["translated","original",...],...],...]
    const translated = data[0]?.map((chunk: any) => chunk[0]).join("") || text;
    return translated;
  } catch {
    return text;
  }
};

// --- Simple script-based language detector (no API needed) ---
const detectLanguage = (text: string): string => {
  // Check Unicode script ranges for common languages
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari → Hindi
  if (/[\u0600-\u06FF]/.test(text)) return "ar"; // Arabic
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh"; // Chinese
  if (/[\u3040-\u30FF]/.test(text)) return "ja"; // Japanese (Hiragana/Katakana)
  if (/[\u0400-\u04FF]/.test(text)) return "ru"; // Cyrillic → Russian
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko"; // Korean
  if (/[\u0370-\u03FF]/.test(text)) return "el"; // Greek
  return "en"; // default to English for Latin scripts
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "zh", label: "Chinese" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
];

// Report reasons matching YouTube's categories
const REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate_speech", label: "Hate speech or discrimination" },
  { id: "sexual", label: "Sexual content" },
  { id: "violence", label: "Violent or repulsive content" },
  { id: "misinformation", label: "Misinformation" },
  { id: "copyright", label: "Copyright violation" },
  { id: "other", label: "Other" },
];

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // translate state: map of commentId -> translated text
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [showLangPicker, setShowLangPicker] = useState<string | null>(null);
  // location: optional, stored locally only
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  // report modal
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const { user } = useUser();

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocation = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
            );
            const d = await r.json();
            // country only — no city for privacy
            const country = d?.address?.country || null;
            setLocation(country);
            resolve(country);
          } catch {
            setLocation(null);
            resolve(null);
          } finally {
            setLocationLoading(false);
          }
        },
        () => {
          setLocation(null);
          setLocationLoading(false);
          resolve(null);
        }
      );
    });
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    const blocked = getBlockReason(newComment);
    if (blocked) {
      setBlockError(`Comment blocked: ${blocked}`);
      return;
    }
    setBlockError(null);
    setIsSubmitting(true);
    try {
      // resolve location before submitting
      let resolvedLocation = location;
      if (showLocation && !location) {
        resolvedLocation = await fetchLocation();
      }

      const payload: any = {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        language: detectLanguage(newComment),
      };
      if (showLocation && resolvedLocation) payload.location = resolvedLocation;

      const res = await axiosInstance.post("/comment/postcomment", payload);
      if (res.data.blocked) {
        setBlockError(`Comment blocked: ${res.data.reason}`);
        return;
      }
      if (res.data.comment) {
        const newCommentObj: Comment = {
          _id: res.data.data?._id || Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          commentedon: new Date().toISOString(),
          language: detectLanguage(newComment),
          location:
            showLocation && resolvedLocation ? resolvedLocation : undefined,
          likes: [],
          dislikes: [],
          reports: [],
          flagged: false,
        };
        setComments((prev) => [newCommentObj, ...prev]);
      }
      setNewComment("");
    } catch (error: any) {
      if (error?.response?.data?.blocked) {
        setBlockError(`Comment blocked: ${error.response.data.reason}`);
      } else {
        console.error("Error adding comment:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (c: Comment) => {
    setEditingCommentId(c._id);
    setEditText(c.commentbody);
    setBlockError(null);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    const blocked = getBlockReason(editText);
    if (blocked) {
      setBlockError(`Comment blocked: ${blocked}`);
      return;
    }
    setBlockError(null);
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        {
          commentbody: editText,
        }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/comment/like/${id}`, {
        userId: user._id,
      });
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== id) return c;
          const uid = user._id;
          const alreadyLiked = c.likes.includes(uid);
          return {
            ...c,
            likes: alreadyLiked
              ? c.likes.filter((l) => l !== uid)
              : [...c.likes, uid],
            dislikes: c.dislikes.filter((d) => d !== uid),
          };
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async (id: string) => {
    if (!user) return;
    try {
      await axiosInstance.post(`/comment/dislike/${id}`, { userId: user._id });
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== id) return c;
          const uid = user._id;
          const alreadyDisliked = c.dislikes.includes(uid);
          return {
            ...c,
            dislikes: alreadyDisliked
              ? c.dislikes.filter((d) => d !== uid)
              : [...c.dislikes, uid],
            likes: c.likes.filter((l) => l !== uid),
          };
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleReport = async (id: string, reason: string, custom?: string) => {
    if (!user) return;
    try {
      const payload: any = { userId: user._id, reason };
      if (reason === "other" && custom?.trim()) {
        payload.customReason = custom.trim();
      }
      const res = await axiosInstance.post(`/comment/report/${id}`, payload);
      if (res.data.flagged) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c._id === id ? { ...c, reports: [...c.reports, user._id] } : c
          )
        );
      }
      setReportSubmitted(id);
      setReportTarget(null);
      setSelectedReason(null);
      setCustomReason("");
    } catch (error) {
      console.log(error);
    }
  };

  const handleTranslate = async (
    commentId: string,
    text: string,
    sourceLang: string,
    targetLang: string
  ) => {
    const src = sourceLang || "en";
    // MyMemory requires two distinct languages
    if (src === targetLang) return;
    setTranslating((prev) => ({ ...prev, [commentId]: true }));
    setShowLangPicker(null);
    const result = await translateText(text, src, targetLang);
    setTranslated((prev) => ({ ...prev, [commentId]: result }));
    setTranslating((prev) => ({ ...prev, [commentId]: false }));
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{comments.length} Comments</h2>
      </div>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => {
                setNewComment(e.target.value);
                setBlockError(null);
              }}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            {blockError && <p className="text-xs text-red-500">{blockError}</p>}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                <MapPin className="w-3 h-3" />
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={showLocation}
                  onChange={(e) => {
                    setShowLocation(e.target.checked);
                    if (e.target.checked && !location) fetchLocation();
                  }}
                />
                Share country (optional)
                {locationLoading && (
                  <span className="ml-1 text-gray-400">fetching...</span>
                )}
                {showLocation && location && !locationLoading && (
                  <span className="ml-1 text-gray-400">· {location}</span>
                )}
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNewComment("");
                    setBlockError(null);
                  }}
                  disabled={!newComment.trim()}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{c.usercommented?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {/* Username + time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{c.usercommented}</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(c.commentedon))} ago
                  </span>
                  {c.location && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      {c.location}
                    </span>
                  )}
                </div>

                {editingCommentId === c._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => {
                        setEditText(e.target.value);
                        setBlockError(null);
                      }}
                    />
                    {blockError && (
                      <p className="text-xs text-red-500">{blockError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                          setBlockError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">
                      {translated[c._id] || c.commentbody}
                      {translated[c._id] && (
                        <span className="ml-2 text-xs text-gray-400 italic">
                          (translated)
                        </span>
                      )}
                    </p>

                    {/* Action bar */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {/* Like */}
                      <button
                        className={`flex items-center gap-1 hover:text-blue-500 ${
                          user && c.likes.includes(user._id)
                            ? "text-blue-500"
                            : ""
                        }`}
                        onClick={() => handleLike(c._id)}
                        title="Like"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {c.likes.length > 0 && <span>{c.likes.length}</span>}
                      </button>

                      {/* Dislike */}
                      <button
                        className={`flex items-center gap-1 hover:text-orange-500 ${
                          user && c.dislikes.includes(user._id)
                            ? "text-orange-500"
                            : ""
                        }`}
                        onClick={() => handleDislike(c._id)}
                        title="Dislike"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        {c.dislikes.length > 0 && (
                          <span>{c.dislikes.length}</span>
                        )}
                      </button>

                      {/* Translate */}
                      <div className="relative">
                        <button
                          className="flex items-center gap-1 hover:text-green-500"
                          onClick={() =>
                            setShowLangPicker(
                              showLangPicker === c._id ? null : c._id
                            )
                          }
                          title="Translate"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span className="text-xs">Translate</span>
                          {translating[c._id] && (
                            <span className="text-xs">...</span>
                          )}
                        </button>
                        {showLangPicker === c._id && (
                          <>
                            {/* backdrop to close on outside click */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowLangPicker(null)}
                            />
                            <div className="absolute z-20 bottom-full mb-1 left-0 bg-white dark:bg-gray-800 border rounded-lg shadow-lg w-40 py-1 text-xs max-h-52 overflow-y-auto">
                              <p className="px-3 py-1 text-gray-400 font-medium border-b">
                                Translate to
                              </p>
                              {LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() =>
                                    handleTranslate(
                                      c._id,
                                      c.commentbody,
                                      c.language || "en",
                                      lang.code
                                    )
                                  }
                                >
                                  {lang.label}
                                </button>
                              ))}
                              {translated[c._id] && (
                                <>
                                  <div className="border-t my-1" />
                                  <button
                                    className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => {
                                      setTranslated((prev) => {
                                        const n = { ...prev };
                                        delete n[c._id];
                                        return n;
                                      });
                                      setShowLangPicker(null);
                                    }}
                                  >
                                    Show original
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Report (only for other users' comments) */}
                      {user &&
                        c.userid?.toString() !== user._id?.toString() && (
                          <button
                            className={`flex items-center gap-1 hover:text-red-500 ${
                              reportSubmitted === c._id ||
                              c.reports.includes(user._id)
                                ? "text-red-400"
                                : ""
                            }`}
                            onClick={() => {
                              if (reportSubmitted === c._id) return;
                              setReportTarget(c._id);
                            }}
                            title="Report"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            {reportSubmitted === c._id && (
                              <span className="text-xs">Reported</span>
                            )}
                          </button>
                        )}

                      {/* Edit / Delete for own comments */}
                      {user &&
                        c.userid?.toString() === user._id?.toString() && (
                          <>
                            <button
                              className="hover:text-blue-500"
                              onClick={() => handleEdit(c)}
                            >
                              Edit
                            </button>
                            <button
                              className="hover:text-red-500"
                              onClick={() => handleDelete(c._id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report modal */}
      {reportTarget && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => {
              setReportTarget(null);
              setSelectedReason(null);
              setCustomReason("");
            }}
          />
          <div className="fixed z-40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-xl shadow-xl w-80 p-5">
            <h3 className="text-base font-semibold mb-1">Report comment</h3>
            <p className="text-xs text-gray-500 mb-4">
              Why are you reporting this comment?
            </p>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <div key={r.id}>
                  <button
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors
                      ${
                        selectedReason === r.id
                          ? "bg-gray-100 dark:bg-gray-800 font-medium"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    onClick={() => {
                      if (r.id === "other") {
                        setSelectedReason("other");
                      } else {
                        handleReport(reportTarget, r.id);
                      }
                    }}
                  >
                    {r.label}
                  </button>
                  {/* Custom reason textarea — only shown under "Other" */}
                  {r.id === "other" && selectedReason === "other" && (
                    <div className="mt-2 px-1 space-y-2">
                      <textarea
                        autoFocus
                        className="w-full text-sm border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-800 dark:border-gray-700"
                        rows={3}
                        maxLength={200}
                        placeholder="Please describe the issue (max 200 chars)..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">
                          {customReason.length}/200
                        </span>
                        <button
                          disabled={!customReason.trim()}
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors"
                          onClick={() =>
                            handleReport(
                              reportTarget,
                              "other",
                              customReason.trim()
                            )
                          }
                        >
                          Submit report
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600"
              onClick={() => {
                setReportTarget(null);
                setSelectedReason(null);
                setCustomReason("");
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Comments;

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Circle, Square, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

interface CameraRecorderProps {
  channelId: string;
  channelName: string;
  onSuccess: () => void;
}

type Stage = "idle" | "preview" | "recording" | "recorded" | "uploading";

export default function CameraRecorder({
  channelId,
  channelName,
  onSuccess,
}: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  // Keep stream in state so the useEffect below can react to it
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [title, setTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Attach stream to video element once both are ready ─────────
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, stage]); // re-run when stage changes so the ref is mounted

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = useCallback(
    (s?: MediaStream | null) => {
      (s ?? stream)?.getTracks().forEach((t) => t.stop());
      setStream(null);
    },
    [stream]
  );

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      setStream(s);
      setStage("preview"); // render the <video> first, then useEffect attaches stream
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Camera permission denied. Please allow camera access.");
      } else {
        toast.error("Could not access camera. Make sure it is connected.");
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];

    const mime =
      [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ].find((m) => MediaRecorder.isTypeSupported(m)) || "";

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setStage("recorded");
      stopStream(stream);
    };

    recorder.start(250);
    setStage("recording");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, [stream, stopStream]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }, []);

  const retake = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl("");
    }
    setRecordedBlob(null);
    setElapsed(0);
    setTitle("");
    setUploadProgress(0);
    startCamera();
  }, [recordedUrl, startCamera]);

  const handleUpload = useCallback(async () => {
    if (!recordedBlob || !title.trim()) {
      toast.error("Please add a title before uploading");
      return;
    }
    const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([recordedBlob], `recording.${ext}`, {
      type: recordedBlob.type,
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("videotitle", title.trim());
    formData.append("videochanel", channelName);
    formData.append("uploader", channelId);

    setStage("uploading");
    try {
      await axiosInstance.post("/video/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e: any) =>
          setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      toast.success("Video uploaded successfully");
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Upload failed. Please try again.";
      toast.error(msg);
      setStage("recorded");
    }
  }, [recordedBlob, title, channelId, channelName, onSuccess]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  const cancelCamera = () => {
    stopStream();
    setStage("idle");
  };

  // ── Idle ──────────────────────────────────────────────────────
  if (stage === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="bg-red-50 rounded-full p-5">
          <Camera className="w-10 h-10 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Record with your camera</p>
          <p className="text-sm text-gray-500 mt-1">
            Your browser will ask for camera and microphone access
          </p>
        </div>
        <Button
          onClick={startCamera}
          className="bg-red-600 hover:bg-red-700 text-white px-6"
        >
          Open Camera
        </Button>
      </div>
    );
  }

  // ── Live preview + recording ──────────────────────────────────
  if (stage === "preview" || stage === "recording") {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {stage === "recording" && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC {fmt(elapsed)}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3">
          {stage === "preview" && (
            <Button
              onClick={startRecording}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              <Circle className="w-4 h-4 fill-white" /> Start Recording
            </Button>
          )}
          {stage === "recording" && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4 fill-white" /> Stop Recording
            </Button>
          )}
          <button
            onClick={cancelCamera}
            style={{
              background: "#ffffff",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Recorded — review + upload ────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl overflow-hidden bg-black aspect-video">
        <video
          src={recordedUrl}
          controls
          className="w-full h-full object-cover"
        />
      </div>

      <div>
        <Label htmlFor="rec-title">Title (required)</Label>
        <Input
          id="rec-title"
          className="mt-1"
          placeholder="Add a title for your video"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={stage === "uploading"}
        />
      </div>

      {stage === "uploading" && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={retake}
          disabled={stage === "uploading"}
          style={{
            background: "#ffffff",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            cursor: stage === "uploading" ? "not-allowed" : "pointer",
            opacity: stage === "uploading" ? 0.5 : 1,
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <RotateCcw className="w-4 h-4" /> Retake
        </button>
        <Button
          onClick={handleUpload}
          disabled={stage === "uploading" || !title.trim()}
          className="bg-red-600 hover:bg-red-700 text-white gap-2"
        >
          <Upload className="w-4 h-4" />
          {stage === "uploading" ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}

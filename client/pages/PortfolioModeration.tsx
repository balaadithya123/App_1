import { useState, useRef, ChangeEvent, DragEvent } from "react";
import PageShell from "@/components/PageShell";
import {
  Upload,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Eye,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  Check,
  X,
  FileQuestion,
  UserCheck,
  Building2,
  Info,
  Maximize2,
  ChevronRight,
  Send,
  Zap,
} from "lucide-react";
import type {
  ImageScreeningResult,
  PortfolioScreenResponse,
  ScreeningCheckResult,
  ScreeningVerdict,
} from "@shared/api";
import { getSamplePortfolioImages, type SamplePortfolioItem } from "@/lib/samplePortfolioImages";

interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  mimeType: string;
}

export default function PortfolioModeration() {
  const [activeTab, setActiveTab] = useState<"worker" | "admin">("worker");
  const [selectedFiles, setSelectedFiles] = useState<UploadedFileItem[]>([]);
  const [screening, setScreening] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState("");
  const [results, setResults] = useState<ImageScreeningResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ImageScreeningResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [filterVerdict, setFilterVerdict] = useState<"all" | "approved" | "needs_review" | "rejected">("all");
  const [moderatorNote, setModeratorNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample photos bundle
  const handleLoadSamples = () => {
    setError("");
    const samples = getSamplePortfolioImages();
    const items: UploadedFileItem[] = samples.map((s) => ({
      id: s.id,
      name: s.name,
      size: Math.round((s.dataUrl.length * 3) / 4),
      dataUrl: s.dataUrl,
      mimeType: s.mimeType,
    }));
    setSelectedFiles(items);
  };

  // File Upload Handlers
  const processFiles = (files: FileList | File[]) => {
    setError("");
    const fileArray = Array.from(files);

    if (fileArray.length + selectedFiles.length > 5) {
      setError("Maximum 5 photos allowed per submission batch.");
      return;
    }

    const validImages = fileArray.filter((f) => f.type.startsWith("image/"));
    if (validImages.length === 0) {
      setError("Please select valid image files (JPG, PNG, WebP).");
      return;
    }

    validImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        setSelectedFiles((prev) => {
          if (prev.length >= 5) return prev;
          return [
            ...prev,
            {
              id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: file.size,
              dataUrl: resultUrl,
              mimeType: file.type || "image/jpeg",
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    setResults((prev) => prev.filter((r) => r.id !== id));
    if (selectedResult?.id === id) setSelectedResult(null);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setResults([]);
    setSelectedResult(null);
    setError("");
  };

  // Perform AI Screening via Gemini Vision
  const runScreening = async () => {
    if (selectedFiles.length === 0) {
      setError("Please upload or load at least 1 image to screen.");
      return;
    }
    setError("");
    setScreening(true);
    setScreeningProgress(`Sending ${selectedFiles.length} photo(s) to Gemini Vision...`);

    try {
      const payload = {
        images: selectedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          data: f.dataUrl,
        })),
      };

      const response = await fetch("/api/portfolio/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Screening failed with HTTP status ${response.status}`);
      }

      const data: PortfolioScreenResponse = await response.json();

      // Attach dataUrl to results for full preview in modals
      const enrichedResults = data.results.map((res) => {
        const matchingFile = selectedFiles.find((f) => f.id === res.id);
        return {
          ...res,
          imageDataUrl: matchingFile?.dataUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          workerName: "Ramesh K. (Electrician)",
        };
      });

      setResults(enrichedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error during portfolio screening.");
    } finally {
      setScreening(false);
      setScreeningProgress("");
    }
  };

  // Admin Triage Actions
  const handleAdminDecision = (
    resultId: string,
    decision: ScreeningVerdict,
    defaultNote: string
  ) => {
    const note = moderatorNote.trim() || defaultNote;
    setResults((prev) =>
      prev.map((item) => {
        if (item.id !== resultId) return item;
        return {
          ...item,
          verdict: decision,
          manualOverride: {
            verdict: decision,
            note,
            moderator: "Admin / QA Staff",
            at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        };
      })
    );

    if (selectedResult && selectedResult.id === resultId) {
      setSelectedResult((prev) =>
        prev
          ? {
              ...prev,
              verdict: decision,
              manualOverride: {
                verdict: decision,
                note,
                moderator: "Admin / QA Staff",
                at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            }
          : null
      );
    }
    setModeratorNote("");
  };

  // Statistics
  const totalScreened = results.length;
  const approvedCount = results.filter((r) => r.verdict === "approved").length;
  const needsReviewCount = results.filter((r) => r.verdict === "needs_review").length;
  const rejectedCount = results.filter((r) => r.verdict === "rejected").length;

  // Filtered views
  const displayResults =
    activeTab === "admin"
      ? results.filter((r) => r.verdict === "needs_review" || r.verdict === "rejected" || r.manualOverride)
      : filterVerdict === "all"
      ? results
      : results.filter((r) => r.verdict === filterVerdict);

  return (
    <PageShell
      backTo="/"
      backLabel="Home"
      containerWidth="xl"
      className="pb-16"
    >
      {/* Header Bar */}
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck size={18} />
            </span>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Worker Portfolio Photo Screener
            </h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              Gemini Vision
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Automated screening for worker past work photos: filters stock photos, privacy concerns, low quality & inappropriate uploads before public listing.
          </p>
        </div>

        {/* Role Mode Toggle Switch */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("worker")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "worker"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload size={14} />
            <span>Worker Upload View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "admin"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck size={14} />
            <span>Admin Review Queue</span>
            {needsReviewCount + rejectedCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white">
                {needsReviewCount + rejectedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Photos
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{totalScreened}</span>
            <span className="text-xs text-muted-foreground">uploaded</span>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shadow-xs dark:bg-emerald-950/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Approved
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{approvedCount}</span>
            <span className="text-xs text-emerald-700/70 dark:text-emerald-400">ready to display</span>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 shadow-xs dark:bg-amber-950/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Needs Review
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-300">{needsReviewCount}</span>
            <span className="text-xs text-amber-700/70 dark:text-amber-400">triage required</span>
          </div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 shadow-xs dark:bg-red-950/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            Rejected
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600 dark:text-red-300">{rejectedCount}</span>
            <span className="text-xs text-red-700/70 dark:text-red-400">policy violation</span>
          </div>
        </div>
      </div>

      {/* WORKER VIEW: Upload & Screening Area */}
      {activeTab === "worker" && (
        <div className="space-y-6">
          {/* Uploader Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground">Upload Work Proof Photos</h2>
                <p className="text-xs text-muted-foreground">
                  Select 1 to 5 photos showing real work you finished (wiring, plumbing, tile, painting, AC).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSamples}
                  className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20 active:scale-95"
                >
                  <Zap size={14} />
                  <span>Load 5 Test Samples</span>
                </button>
                {selectedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-xs">
                <Upload size={22} className="text-primary" />
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">
                Drop work photos here, or <span className="text-primary underline">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Up to 5 photos • JPG, PNG, WebP • Max 10MB per photo
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-600 dark:text-red-400">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Selected Photos Staging Bar */}
            {selectedFiles.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground">
                    Selected Photos ({selectedFiles.length}/5)
                  </div>
                  <span className="text-[11px] text-muted-foreground">Click photo thumbnail to remove</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={file.id}
                      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                    >
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="h-28 w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                        <p className="truncate text-[10px] font-semibold text-white">{file.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedFile(file.id);
                        }}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Screening Trigger Action */}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Photos are screened with Gemini 2.5 Flash against stock photos, quality, privacy & authenticity rules.
                  </div>
                  <button
                    type="button"
                    disabled={screening}
                    onClick={runScreening}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {screening ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{screeningProgress || "Screening with Vision..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Screen {selectedFiles.length} Photos with Gemini</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          {results.length > 0 && (
            <div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-foreground">Screening Results ({results.length})</h2>
                  <p className="text-xs text-muted-foreground">
                    Click any card to inspect the full 6-point policy evaluation and reasons.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterVerdict("all")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      filterVerdict === "all"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({results.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterVerdict("approved")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      filterVerdict === "approved"
                        ? "bg-emerald-600 text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Approved ({approvedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterVerdict("needs_review")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      filterVerdict === "needs_review"
                        ? "bg-amber-600 text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Needs Review ({needsReviewCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterVerdict("rejected")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      filterVerdict === "rejected"
                        ? "bg-red-600 text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Rejected ({rejectedCount})
                  </button>
                </div>
              </div>

              {/* Grid of Results */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayResults.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedResult(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN VIEW: Moderation & Review Queue */}
      {activeTab === "admin" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Admin Moderation Triage Queue
                </h2>
                <p className="text-xs text-muted-foreground">
                  Showing photos flagged as <span className="font-bold text-amber-600">Needs Review</span> or{" "}
                  <span className="font-bold text-red-600">Rejected</span> by Gemini Vision. Human moderators can override or confirm decisions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-secondary px-3 py-1 text-xs font-bold text-foreground">
                  Pending Triage: {displayResults.length} item(s)
                </span>
              </div>
            </div>

            {displayResults.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                <CheckCircle2 size={40} className="text-emerald-500" />
                <h3 className="mt-3 text-sm font-bold text-foreground">Queue is Clean!</h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  There are no flagged photos awaiting review. Switch to Worker Upload View to test or screen new submissions.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleLoadSamples();
                    setActiveTab("worker");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <Upload size={14} />
                  <span>Load Samples to Triage</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {displayResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-start"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => setSelectedResult(item)}
                      className="group relative h-36 w-full shrink-0 cursor-pointer overflow-hidden rounded-lg bg-secondary sm:w-44"
                    >
                      {item.imageDataUrl ? (
                        <img
                          src={item.imageDataUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon size={24} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                          <Maximize2 size={12} /> Inspect
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Flags */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <VerdictBadge verdict={item.verdict} />
                          {item.suggested_category && (
                            <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-foreground">
                              {item.suggested_category}
                            </span>
                          )}
                          <span className="text-xs font-bold text-foreground">{item.name}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {item.workerName || "Worker Submission"}
                        </span>
                      </div>

                      {/* Reasons Box */}
                      <div className="rounded-lg bg-secondary/50 p-2.5 text-xs text-foreground">
                        <div className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                          Gemini Vision Assessment Reasons:
                        </div>
                        <ul className="list-inside list-disc space-y-0.5">
                          {item.reasons.map((r, i) => (
                            <li key={i} className="text-xs">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Checks Chips */}
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <CheckTag label="Stock Photo" failed={item.checks.is_stock_photo} />
                        <CheckTag label="Duplicate/Meme" failed={item.checks.is_duplicate_style} />
                        <CheckTag label="Actual Work" failed={!item.checks.shows_actual_work} />
                        <CheckTag label="Quality Issue" failed={item.checks.image_quality_issue} />
                        <CheckTag label="Inappropriate" failed={item.checks.contains_inappropriate_content} />
                        <CheckTag label="Privacy/Faces" failed={item.checks.contains_identifiable_third_party} />
                      </div>

                      {/* Manual Override Log if any */}
                      {item.manualOverride && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs text-primary">
                          <span className="font-bold">Moderator Decision:</span> {item.manualOverride.note} (by{" "}
                          {item.manualOverride.moderator} at {item.manualOverride.at})
                        </div>
                      )}

                      {/* Quick Triage Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminDecision(
                              item.id,
                              "approved",
                              "Approved by moderator override: verified authentic local trade work."
                            )
                          }
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                        >
                          <Check size={13} />
                          <span>Approve (Override AI)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminDecision(
                              item.id,
                              "rejected",
                              "Confirmed rejection: photo does not comply with trade portfolio standards."
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-500/20 active:scale-95 dark:text-red-400"
                        >
                          <X size={13} />
                          <span>Confirm Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminDecision(
                              item.id,
                              "needs_review",
                              "Notice sent to worker: Please upload a clearer, well-lit photo of the job site."
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-secondary/80 active:scale-95"
                        >
                          <RefreshCw size={13} />
                          <span>Request Re-upload</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedResult(item)}
                          className="ml-auto text-xs font-bold text-primary hover:underline"
                        >
                          Full Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setSelectedResult(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <VerdictBadge verdict={selectedResult.verdict} />
                <span className="font-extrabold text-foreground truncate max-w-xs">{selectedResult.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Photo Display */}
              {selectedResult.imageDataUrl && (
                <div className="relative overflow-hidden rounded-xl border border-border bg-black">
                  <img
                    src={selectedResult.imageDataUrl}
                    alt={selectedResult.name}
                    className="max-h-72 w-full object-contain"
                  />
                  {selectedResult.suggested_category && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                      Category: {selectedResult.suggested_category}
                    </span>
                  )}
                </div>
              )}

              {/* Specific Reasons */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Moderator Evaluation Reasons
                </h4>
                <div className="mt-2 rounded-xl border border-border bg-secondary/40 p-3.5">
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {selectedResult.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 6-Point Policy Checklist Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  6-Point Vision Policy Checks
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckRow
                    label="Stock Photo / Watermark"
                    description="Commercial render or catalog photo instead of real site"
                    failed={selectedResult.checks.is_stock_photo}
                  />
                  <CheckRow
                    label="Meme / Unrelated Screenshot"
                    description="Screenshot, chat forward, or generic graphic"
                    failed={selectedResult.checks.is_duplicate_style}
                  />
                  <CheckRow
                    label="Plausible Trade Work"
                    description="Shows actual trade/repair job completed or in-progress"
                    failed={!selectedResult.checks.shows_actual_work}
                  />
                  <CheckRow
                    label="Image Quality & Lighting"
                    description="Clear enough to visually verify workmanship"
                    failed={selectedResult.checks.image_quality_issue}
                  />
                  <CheckRow
                    label="Family-Safe Listing Content"
                    description="No inappropriate, offensive, or dangerous material"
                    failed={selectedResult.checks.contains_inappropriate_content}
                  />
                  <CheckRow
                    label="Privacy & Third-Party Faces"
                    description="No bystanders, children, or visible identity documents"
                    failed={selectedResult.checks.contains_identifiable_third_party}
                  />
                </div>
              </div>

              {/* Admin Decision Actions inside Modal */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <h4 className="text-xs font-bold text-foreground mb-2">Admin Action & Triage Note</h4>
                <input
                  type="text"
                  placeholder="Optional custom moderator note..."
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminDecision(
                        selectedResult.id,
                        "approved",
                        "Approved by moderator override: verified authentic local trade work."
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                  >
                    <Check size={14} />
                    <span>Approve Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminDecision(
                        selectedResult.id,
                        "needs_review",
                        "Moderator requested re-upload: photo is unclear or needs closer work proof."
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition hover:bg-secondary"
                  >
                    <RefreshCw size={14} />
                    <span>Request Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminDecision(
                        selectedResult.id,
                        "rejected",
                        "Photo permanently rejected per directory quality and authenticity standards."
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                  >
                    <X size={14} />
                    <span>Reject Photo</span>
                  </button>
                </div>
              </div>

              {/* Raw JSON Schema Preview */}
              <details className="rounded-lg border border-border bg-secondary/20 p-2.5 text-xs">
                <summary className="cursor-pointer font-bold text-muted-foreground hover:text-foreground">
                  View Raw Gemini Output JSON Schema
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 font-mono text-[11px] text-emerald-400">
                  {JSON.stringify(
                    {
                      verdict: selectedResult.verdict,
                      checks: selectedResult.checks,
                      reasons: selectedResult.reasons,
                      suggested_category: selectedResult.suggested_category,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="rounded-lg border border-border bg-secondary px-4 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/80"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// Subcomponent: Grid Result Card
function ResultCard({
  item,
  onClick,
}: {
  item: ImageScreeningResult;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:border-primary/50 hover:shadow-md"
    >
      <div>
        {/* Card Image Thumbnail */}
        <div className="relative h-44 w-full overflow-hidden bg-secondary">
          {item.imageDataUrl ? (
            <img
              src={item.imageDataUrl}
              alt={item.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon size={32} className="text-muted-foreground" />
            </div>
          )}

          {/* Top Verdict Overlay */}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            <VerdictBadge verdict={item.verdict} />
            {item.manualOverride && (
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                Admin Overridden
              </span>
            )}
          </div>

          {/* Category Chip */}
          {item.suggested_category && (
            <div className="absolute bottom-2 left-2.5 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
              {item.suggested_category}
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="truncate text-sm font-extrabold text-foreground">{item.name}</h3>
            <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
          </div>

          {/* Reasons summary */}
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.reasons.join(" • ") || "Screening complete."}
          </p>

          {/* Mini Check Tags */}
          <div className="flex flex-wrap gap-1">
            {item.checks.is_stock_photo && (
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                Stock Photo
              </span>
            )}
            {item.checks.is_duplicate_style && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Meme/Graphic
              </span>
            )}
            {!item.checks.shows_actual_work && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Not Trade Work
              </span>
            )}
            {item.checks.image_quality_issue && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Quality Issue
              </span>
            )}
            {item.checks.contains_identifiable_third_party && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Privacy Flag
              </span>
            )}
            {item.checks.contains_inappropriate_content && (
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                Inappropriate
              </span>
            )}
            {item.verdict === "approved" && (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Authentic Work Proof
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-2.5 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary transition group-hover:translate-x-0.5">
          Inspect & Triage <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
}

// Subcomponent: Verdict Badge
function VerdictBadge({ verdict }: { verdict: ScreeningVerdict }) {
  if (verdict === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-extrabold text-white shadow-xs">
        <CheckCircle2 size={13} />
        <span>Approved</span>
      </span>
    );
  }
  if (verdict === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-xs font-extrabold text-white shadow-xs">
        <AlertTriangle size={13} />
        <span>Needs Review</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-extrabold text-white shadow-xs">
      <XCircle size={13} />
      <span>Rejected</span>
    </span>
  );
}

// Subcomponent: Checklist Row
function CheckRow({
  label,
  description,
  failed,
}: {
  label: string;
  description: string;
  failed: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs ${
        failed
          ? "border-red-500/30 bg-red-500/5 text-foreground dark:bg-red-950/20"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <div className="mt-0.5">
        {failed ? (
          <XCircle size={15} className="text-red-600 dark:text-red-400" />
        ) : (
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
        )}
      </div>
      <div>
        <div className={`font-bold ${failed ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
          {label}: {failed ? "Flagged / Failed" : "Passed"}
        </div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

// Subcomponent: Mini Tag for Triage Queue
function CheckTag({ label, failed }: { label: string; failed: boolean }) {
  if (!failed) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-300">
      <AlertTriangle size={10} />
      <span>{label} Flag</span>
    </span>
  );
}

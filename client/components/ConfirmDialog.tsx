import { useEffect, type ReactNode } from "react";
import { AlertTriangle, Trash2, UserMinus, X, Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | ReactNode;
  itemDetails?: {
    label: string;
    value: string;
    subValue?: string;
  };
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  iconType?: "danger" | "remove-user" | "delete" | "warning";
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemDetails,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  iconType = "danger",
  loading = false,
}: ConfirmDialogProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case "remove-user":
        return <UserMinus size={20} className="text-rose-600 dark:text-rose-400" />;
      case "delete":
        return <Trash2 size={20} className="text-rose-600 dark:text-rose-400" />;
      case "warning":
        return <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />;
      default:
        return <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400" />;
    }
  };

  const getConfirmButtonClasses = () => {
    if (variant === "danger") {
      return "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 shadow-xs";
    }
    if (variant === "warning") {
      return "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 shadow-xs";
    }
    return "bg-foreground text-background hover:opacity-90";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl transition-all scale-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50 cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Dialog Header */}
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              variant === "warning" ? "bg-amber-500/10" : "bg-rose-500/10"
            }`}
          >
            {renderIcon()}
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <h2 id="confirm-dialog-title" className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              {title}
            </h2>
            <div id="confirm-dialog-description" className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </div>
          </div>
        </div>

        {/* Optional Item Details Card */}
        {itemDetails && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-3.5 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {itemDetails.label}
            </div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{itemDetails.value}</div>
            {itemDetails.subValue && (
              <div className="mt-0.5 text-xs text-muted-foreground">{itemDetails.subValue}</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-xs sm:text-sm font-semibold text-foreground transition hover:bg-card disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-xs sm:text-sm font-semibold transition disabled:opacity-60 cursor-pointer ${getConfirmButtonClasses()}`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

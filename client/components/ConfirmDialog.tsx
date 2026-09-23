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
        return <UserMinus size={20} className="text-rose-600" />;
      case "delete":
        return <Trash2 size={20} className="text-rose-600" />;
      case "warning":
        return <AlertTriangle size={20} className="text-amber-600" />;
      default:
        return <AlertTriangle size={20} className="text-rose-600" />;
    }
  };

  const getConfirmButtonClasses = () => {
    if (variant === "danger") {
      return "bg-rose-600 text-white hover:bg-rose-700 shadow-sm";
    }
    if (variant === "warning") {
      return "bg-amber-600 text-white hover:bg-amber-700 shadow-sm";
    }
    return "bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm";
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
      <div className="relative w-full max-w-md rounded-[20px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] p-5 sm:p-6 shadow-xl transition-all scale-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#71717A] dark:text-[#A1A1AA] transition hover:bg-[#FAFAFA] dark:hover:bg-[#27272A] hover:text-[#09090B] dark:hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Dialog Header */}
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              variant === "warning" ? "bg-amber-500/10" : "bg-rose-500/10"
            }`}
          >
            {renderIcon()}
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA] sm:text-lg"
            >
              {title}
            </h2>
            <div
              id="confirm-dialog-description"
              className="mt-1 text-xs sm:text-sm text-[#71717A] dark:text-[#A1A1AA] leading-relaxed"
            >
              {description}
            </div>
          </div>
        </div>

        {/* Optional Item Details Card */}
        {itemDetails && (
          <div className="mt-4 rounded-[12px] border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#09090B] p-3.5 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
              {itemDetails.label}
            </div>
            <div className="mt-0.5 text-sm font-bold text-[#09090B] dark:text-[#FAFAFA]">
              {itemDetails.value}
            </div>
            {itemDetails.subValue && (
              <div className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                {itemDetails.subValue}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#141416] px-5 text-xs sm:text-sm font-semibold text-[#09090B] dark:text-[#FAFAFA] transition hover:border-neutral-400 dark:hover:border-neutral-500 disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-xs sm:text-sm font-semibold transition disabled:opacity-60 cursor-pointer ${getConfirmButtonClasses()}`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-current" />
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

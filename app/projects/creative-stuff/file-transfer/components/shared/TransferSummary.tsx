"use client";

import { motion } from "framer-motion";
import { CheckCheck, AlertCircle, Download, RefreshCw } from "lucide-react";

interface TransferSummaryProps {
  status: "success" | "error";
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  errorMessage?: string;
  downloadUrl?: string;
  onReset: () => void;
  accent: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function TransferSummary({
  status,
  fileName,
  fileSize,
  mimeType,
  errorMessage,
  downloadUrl,
  onReset,
  accent,
}: TransferSummaryProps) {
  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 shrink-0">
            <CheckCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-emerald-400 text-lg">Transfer complete</p>
            <p className="text-sm text-emerald-400/70 font-mono break-all">
              {fileName} {fileSize !== undefined && `· ${formatBytes(fileSize)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {downloadUrl && fileName && (
            <a
              href={downloadUrl}
              download={fileName}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent})` }}
            >
              <Download className="w-4 h-4" />
              Download {fileName}
            </a>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm border border-border bg-card/60 hover:bg-card transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            New Transfer
          </button>
        </div>
        {mimeType && <p className="text-xs text-emerald-400/50 font-mono">{mimeType}</p>}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 p-6 rounded-3xl border border-red-500/20 bg-red-500/10"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-red-500/20 shrink-0">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="font-bold text-red-400 text-lg">Transfer failed</p>
          <p className="text-sm text-red-400/70">{errorMessage ?? "Something went wrong."}</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm border border-border bg-card/60 hover:bg-card transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </motion.div>
  );
}

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function SkeletonPulse({ className = "" }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
  );
}

export function LoadingSpinner({ text = "טוען..." }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-2 py-6 text-slate-400"
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </motion.div>
  );
}

export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-4 w-16" />
          <SkeletonPulse className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <SkeletonPulse className="h-10 w-full" />
        <SkeletonPulse className="h-10 w-full" />
      </div>
      <SkeletonPulse className="h-10 w-full" />
      <SkeletonPulse className="h-10 w-full" />
    </div>
  );
}
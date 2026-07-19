"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isImageFile } from "@/lib/uploads";

type FileDropzoneProps = {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  allowFolder?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
};

export function FileDropzone({
  onFilesSelected,
  multiple = true,
  allowFolder = true,
  label = "Drag & drop images here",
  hint = "or click to browse files",
  className,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;

      const files = Array.from(fileList).filter(isImageFile);
      if (files.length === 0) return;

      const selected = multiple ? files : [files[0]];
      onFilesSelected(selected);

      setPreviews(
        selected.map((file) => ({
          name: file.name,
          url: URL.createObjectURL(file),
        })),
      );
    },
    [disabled, multiple, onFilesSelected],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-primary/25 bg-cream/50 hover:border-primary/50 hover:bg-white",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v12"
            />
          </svg>
        </div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="mt-1 text-sm text-gray-500">{hint}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            Select files
          </button>
          {allowFolder && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => folderInputRef.current?.click()}
              className="rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              Select folder
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {previews.map((preview) => (
            <div
              key={preview.url}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-100 bg-white"
            >
              <Image src={preview.url} alt={preview.name} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

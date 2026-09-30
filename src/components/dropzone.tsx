import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  isLoading?: boolean;
}

const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB total (docs/06)

/**
 * Drag & Drop dropzone untuk multi-file CSV (Shopee, TikTok, Master, Inventori).
 */
export function Dropzone({ files, onFilesChange, isLoading }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const list = Array.from(incoming).filter((f) =>
        /\.csv$/i.test(f.name),
      );
      if (list.length === 0) {
        setError("Hanya file CSV yang didukung.");
        return;
      }

      const merged = [...files];
      for (const file of list) {
        if (!merged.some((f) => f.name === file.name && f.size === file.size)) {
          merged.push(file);
        }
      }

      const total = merged.reduce((sum, f) => sum + f.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        setError("Total ukuran file melebihi 50MB.");
        return;
      }

      onFilesChange(merged);
    },
    [files, onFilesChange],
  );

  const removeFile = (name: string) => {
    onFilesChange(files.filter((f) => f.name !== name));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/60 hover:bg-muted/40",
        )}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag & drop CSV laporan di sini
        </p>
        <p className="text-xs text-muted-foreground">
          Shopee Sales · TikTok Sales · Internal Master · Inventori (maks 50MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          disabled={isLoading}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Pilih File
        </Button>
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(file.name)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Hapus ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

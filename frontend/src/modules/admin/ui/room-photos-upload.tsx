import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";

export interface RoomPhotosUploadProps {
  existingUrl?: string | null;
  file: File | null;
  removed: boolean;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function isValidImage(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE_BYTES;
}

export function RoomPhotosUpload({
  existingUrl,
  file,
  removed,
  onFileChange,
  onRemove,
}: RoomPhotosUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const previewUrl = objectUrl ?? (removed ? null : existingUrl);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;

    if (!isValidImage(nextFile)) {
      setError("Only PNG, JPG, or WEBP images up to 5MB are accepted");
      return;
    }

    setError(null);
    onFileChange(nextFile);
  };

  return (
    <div data-slot="room-photo-upload" className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0] ?? null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className="flex min-h-32 flex-col items-center justify-center gap-2 bg-surface-container-high px-4 py-6 text-center transition-colors duration-150 ease-linear hover:bg-surface-container-highest"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Room preview"
            className="h-36 w-full object-cover"
          />
        ) : (
          <>
            <IconUpload className="size-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface">
              Drag and drop room photo or click to upload
            </p>
            <p className="text-[0.7rem] uppercase tracking-wider text-on-surface-variant">
              PNG/JPG/WEBP, max 5MB
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <IconPhoto className="size-4" />
          {previewUrl ? "Replace" : "Choose"}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onRemove();
            }}
          >
            <IconX className="size-4" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">{error}</p>
      )}
    </div>
  );
}

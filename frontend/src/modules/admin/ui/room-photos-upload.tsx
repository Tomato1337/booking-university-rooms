import { IconPhotoPlus, IconUpload, IconX } from "@tabler/icons-react";

import { useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export interface RoomPhotosUploadProps {
  value: string[];
  onChange: (next: string[]) => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isValidImage(file: File): boolean {
  return file.type.startsWith("image/") && file.size <= MAX_FILE_SIZE_BYTES;
}

export function RoomPhotosUpload({ value, onChange }: RoomPhotosUploadProps) {
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (file: File | null) => {
    if (!file) return;

    const isValid = isValidImage(file);

    if (!isValid) {
      setError("Only image files up to 5MB are accepted");
    } else {
      setError(null);
    }

    const objectUrls = isValid ? [URL.createObjectURL(file)] : [];
    onChange(objectUrls);
  };

  return (
    <div data-slot="room-photos-upload" className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files[0]);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className="flex min-h-28 flex-col items-center justify-center gap-2 bg-surface-container-high px-4 py-6 text-center transition-colors duration-150 ease-linear hover:bg-surface-container-highest"
      >
        <IconUpload className="size-5 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface">
          Drag and drop photos or click to upload
        </p>
        <p className="text-[0.7rem] uppercase tracking-wider text-on-surface-variant">
          PNG/JPG/WEBP, max 5MB each
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFiles(e.target.files?.[0] || null)}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="OR PASTE IMAGE URL..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const normalized = urlInput.trim();
            if (!normalized) return;
            onChange([...value, normalized]);
            setUrlInput("");
          }}
        >
          <IconPhotoPlus className="size-4" />
          Add
        </Button>
      </div>

      {error && (
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">{error}</p>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {value.map((photo, index) => (
            <div key={`${photo}-${index}`} className="group relative bg-surface-container-high p-1">
              <img
                src={photo}
                alt={`Room preview ${index + 1}`}
                className="h-24 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 inline-flex size-6 items-center justify-center bg-secondary/90 text-secondary-foreground opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <IconX className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

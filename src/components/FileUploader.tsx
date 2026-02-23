import { useCallback, useRef, useState } from "react";

interface FileUploaderProps {
  label: string;
  description: string;
  onFileSelected: (file: File) => void;
  accept?: string;
  isLoaded?: boolean;
  loadedFileName?: string;
}

export function FileUploader({ label, description, onFileSelected, accept = ".csv", isLoaded, loadedFileName }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isLoaded
          ? "border-green-400 bg-green-50"
          : isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {isLoaded ? (
        <>
          <div className="text-green-600 text-2xl mb-2">&#10003;</div>
          <p className="font-medium text-green-700">{loadedFileName}</p>
          <p className="text-sm text-green-600 mt-1">Click to replace</p>
        </>
      ) : (
        <>
          <div className="text-gray-400 text-3xl mb-2">&#8593;</div>
          <p className="font-medium text-gray-700">{label}</p>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </>
      )}
    </div>
  );
}

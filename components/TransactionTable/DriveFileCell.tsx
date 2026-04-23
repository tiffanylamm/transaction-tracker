import { FileText, X, Paperclip } from "lucide-react";
import { useState, useEffect } from "react";

interface DriveFileProps {
  fileId: string;
  onUnlink: () => void;
}

const DriveFile = ({ fileId, onUnlink }: DriveFileProps) => {
  const [file, setFile] = useState<{
    name: string;
    webViewLink: string;
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/drive/file/${fileId}`)
      .then((r) => {
        if (!r.ok) {
          setError(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.name)
          setFile({ name: data.name, webViewLink: data.webViewLink });
        else if (data) setError(true);
      })
      .catch(() => setError(true));
  }, [fileId]);

  if (error) {
    return (
      <span title="Could not load file">
        <FileText className="w-3.5 h-3.5 text-red-800" />
      </span>
    );
  }

  if (!file) {
    return (
      <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 animate-pulse" />
    );
  }
  return (
    <div className="flex relative">
      <a
        href={file.webViewLink}
        target="_blank"
        rel="noopener noreferrer"
        title={file.name}
        onClick={(e) => e.stopPropagation()}
        className="p-0.5"
      >
        <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" />
      </a>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnlink();
        }}
        className="absolute -top-1.5 -right-2.5 w-3 h-3 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-rose-100 dark:hover:bg-rose-900 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Remove file"
        title="Remove file"
      >
        <X className="w-2 h-2" />
      </button>
    </div>
  );
};

export interface AttachButtonProps {
  onClick: () => void;
}

export const AttachButton = ({ onClick }: AttachButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
      aria-label="Upload file to Drive"
      title="Upload file to Google Drive"
    >
      <Paperclip className="w-4 h-4" />
    </button>
  );
};

export default DriveFile;

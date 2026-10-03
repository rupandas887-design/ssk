import React, { useState, useEffect, useRef } from 'react';
import { resolveAadhaarImageUrl } from '../../services/storageService';
import { 
  FileText, 
  ExternalLink, 
  AlertCircle, 
  Upload, 
  RefreshCw, 
  Eye, 
  Image as ImageIcon,
  CheckCircle2,
  X
} from 'lucide-react';

interface AadhaarImageDisplayProps {
  imageUrl?: string | null;
  onFileSelect?: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
  showUploadButton?: boolean;
  title?: string;
}

export const AadhaarImageDisplay: React.FC<AadhaarImageDisplayProps> = ({
  imageUrl,
  onFileSelect,
  isUploading = false,
  disabled = false,
  showUploadButton = true,
  title = "Aadhaar Card Document"
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(imageUrl));
  const [hasError, setHasError] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!imageUrl) {
      setResolvedUrl('');
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    resolveAadhaarImageUrl(imageUrl)
      .then((url) => {
        if (!isCancelled) {
          setResolvedUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Aadhaar image resolution failed for:", imageUrl, err);
        if (!isCancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [imageUrl]);

  const handleImageError = () => {
    console.error("Aadhaar image element failed to load from URL:", resolvedUrl);
    setHasError(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setHasError(false);
      if (onFileSelect) {
        onFileSelect(selected);
      }
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#0B1020]">
          {title}
        </label>
        {resolvedUrl && !hasError && !isLoading && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 size={12} />
            Document on File
          </span>
        )}
      </div>

      {/* Main Preview Container */}
      <div className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <RefreshCw size={22} className="animate-spin text-saffron-600 mb-2" />
            <span className="text-xs font-medium">Loading Aadhaar document...</span>
          </div>
        ) : hasError ? (
          <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/90 text-amber-900 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold">Aadhaar image unavailable</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  The document file could not be loaded from storage or is in an unsupported format.
                </p>
              </div>
            </div>
          </div>
        ) : resolvedUrl ? (
          <div className="space-y-3">
            <div className="relative group max-w-sm rounded-lg overflow-hidden border border-slate-200 bg-white shadow-xs">
              <img 
                src={resolvedUrl} 
                alt="Aadhaar Card"
                onError={handleImageError}
                className="w-full max-h-56 object-contain bg-slate-900/5 cursor-pointer transition-transform hover:scale-[1.01]"
                onClick={() => setIsPreviewOpen(true)}
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-bold shadow-md">
                  <Eye size={14} /> Click to Enlarge
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-saffron-700 hover:text-saffron-800 font-semibold hover:underline"
              >
                <Eye size={13} />
                <span>View Full Size</span>
              </button>
              <span className="text-slate-300">•</span>
              <a 
                href={resolvedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium hover:underline"
              >
                <ExternalLink size={13} />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <ImageIcon size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-600">No Aadhaar Card Image Attached</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Upload a scan or photo of the citizen's Aadhaar card below.</p>
          </div>
        )}

        {/* Upload / Replace Button */}
        {showUploadButton && !disabled && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-saffron-50/70 border border-slate-300 hover:border-saffron-300 text-xs font-bold text-slate-700 hover:text-saffron-900 transition-colors shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-saffron-600" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={13} className="text-saffron-600" />
                  <span>{resolvedUrl ? 'Replace Aadhaar Image' : 'Upload Aadhaar Image'}</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400">JPG, PNG, or WEBP (Max 10MB)</span>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Full Size Inspection */}
      {isPreviewOpen && resolvedUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-[300] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-saffron-600" />
                Aadhaar Document Inspection
              </span>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-900/5">
              <img 
                src={resolvedUrl} 
                alt="Aadhaar Card Full View" 
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AadhaarImageDisplay;

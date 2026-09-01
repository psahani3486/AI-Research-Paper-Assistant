import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { uploadPaper } from '../services/api';
import type { Paper } from '../types';

interface FileUploadProps {
  onUploadSuccess: (paper: Paper) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);
    setSuccessMsg(null);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid format. Only PDF research papers (.pdf) are supported.');
      return false;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds maximum limit of 25 MB.');
      return false;
    }

    if (file.size === 0) {
      setError('Uploaded file is empty (0 bytes).');
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const paper = await uploadPaper(selectedFile);
      setSuccessMsg(`Successfully uploaded "${paper.title}" (${paper.pages} pages)`);
      setSelectedFile(null);
      onUploadSuccess(paper);
    } catch (err: unknown) {
      const msg = axiosErrorMsg(err);
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const axiosErrorMsg = (err: unknown): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const res = (err as { response?: { data?: { detail?: string } } }).response;
      if (res?.data?.detail) return res.data.detail;
    }
    return 'Failed to upload PDF. Check your backend server connection.';
  };

  return (
    <div className="w-full bg-[#141417] border border-[#232327] rounded-2xl p-6 shadow-md space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#f4f4f5] flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-emerald-400" /> Upload Academic Papers
          </h3>
          <p className="text-xs text-[#71717a] mt-0.5">
            PDFs will be parsed into text chunks, indexed in ChromaDB vector storage, and ready for grounded research chat.
          </p>
        </div>
        <span className="text-[11px] bg-[#222226] text-[#a1a1aa] px-2.5 py-1 rounded-md font-mono border border-[#2e2e33]">
          Max 25 MB • PDF
        </span>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-emerald-500 bg-emerald-500/5 scale-[1.01]'
            : 'border-[#2e2e33] hover:border-[#3f3f46] bg-[#0e0e11] hover:bg-[#121215]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="h-11 w-11 rounded-xl bg-[#1e1e24] border border-[#2c2c31] flex items-center justify-center text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-[#ececf1]">
              Drag and drop your research PDF here, or <span className="text-emerald-400 hover:underline">browse files</span>
            </p>
            <p className="text-[11px] text-[#71717a] mt-1">Supports IEEE, arXiv, Springer, Nature, ACM, and custom papers</p>
          </div>
        </div>
      </div>

      {/* Selected File Preview Box */}
      {selectedFile && (
        <div className="bg-[#0e0e11] border border-[#2e2e33] rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
              PDF
            </div>
            <div>
              <p className="text-xs font-semibold text-[#f4f4f5] truncate max-w-sm sm:max-w-md">{selectedFile.name}</p>
              <p className="text-[10px] text-[#71717a] font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              disabled={uploading}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#222226] rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                </>
              ) : (
                'Upload & Index'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
};


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
      setError('Invalid file format. Only PDF documents (.pdf) are allowed.');
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
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-indigo-400" /> Upload Research Paper
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Upload PDF research papers to extract text, create vector embeddings, and start grounded Q&A.
          </p>
        </div>
        <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">
          Max 25 MB • PDF only
        </span>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/70'
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
          <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Drag & drop your research paper PDF here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports IEEE, arXiv, Springer, ACM, and custom academic papers</p>
          </div>
        </div>
      </div>

      {/* Selected File Preview Box */}
      {selectedFile && (
        <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
              PDF
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-md">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              disabled={uploading}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing & Saving...
                </>
              ) : (
                'Upload & Validate'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
};

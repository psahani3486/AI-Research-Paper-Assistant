import React, { useState } from 'react';
import { X, Server, CheckCircle2, XCircle, RefreshCw, Globe, HelpCircle, Link as LinkIcon, RotateCcw } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, checkSystemHealth, sanitizeApiUrl } from '../services/api';

interface ApiSettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose, onSaved }) => {
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);

  const handleTest = async (urlToTest?: string) => {
    const targetUrl = sanitizeApiUrl(urlToTest || urlInput);
    if (!targetUrl) {
      setTestResult({ success: false, message: 'Please enter a valid API URL.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const startTime = performance.now();

    try {
      // Temporarily set base URL for test
      setApiBaseUrl(targetUrl);
      const health = await checkSystemHealth();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      setTestResult({
        success: true,
        message: `Connected successfully! (Groq: ${health.groq_model || 'Configured'})`,
        latency,
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to reach API endpoint.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const sanitized = sanitizeApiUrl(urlInput);
    setApiBaseUrl(sanitized);
    onSaved();
    onClose();
  };

  const handleReset = () => {
    setApiBaseUrl(null);
    const defaultUrl = getApiBaseUrl();
    setUrlInput(defaultUrl);
    setTestResult(null);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Backend Connection Settings</h3>
              <p className="text-xs text-slate-400">Configure or test your API endpoint for Vercel</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">
          
          {/* Active URL Card */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              API Base URL
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://your-backend.onrender.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <LinkIcon className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <button
                onClick={() => handleTest()}
                disabled={testing}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin text-indigo-400' : ''}`} />
                Test
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Changes are saved locally in your browser so you don&apos;t need to re-deploy on Vercel.
            </p>
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latency !== undefined && (
                  <p className="text-[11px] opacity-80 font-mono">Response time: {testResult.latency} ms</p>
                )}
              </div>
            </div>
          )}

          {/* Vercel & Render Troubleshooting Guide */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-amber-400" />
              Why is backend showing Offline on Vercel?
            </h4>
            <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-300">Render Free Tier Sleeping:</strong> Free Render backend instances go to sleep after 15 minutes. It takes ~30 to 60 seconds for Render to spin up. Click <strong>Test</strong> or refresh to wait for it.
              </li>
              <li>
                <strong className="text-slate-300">Vercel Environment Variable:</strong> Ensure <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">VITE_API_BASE_URL</code> is added in Vercel Project Settings with your full Render URL (<code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">https://...</code>).
              </li>
              <li>
                <strong className="text-slate-300">HTTP vs HTTPS:</strong> Browsers block insecure <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">http://</code> requests from Vercel (<code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">https://</code>). Ensure your backend URL starts with <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">https://</code>.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
            title="Reset to default environment URL"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Default
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

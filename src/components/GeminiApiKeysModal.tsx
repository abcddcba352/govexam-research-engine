import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  Shield,
  Zap,
  Activity
} from 'lucide-react';

interface GeminiKeyRecord {
  id: string;
  label?: string;
  masked_key: string;
  status: 'ACTIVE' | 'RATE_LIMITED' | 'INVALID' | 'DISABLED';
  added_at: string;
  last_used_at?: string;
  success_count: number;
  failure_count: number;
  last_error?: string;
}

interface GeminiApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysChanged?: () => void;
}

export const GeminiApiKeysModal: React.FC<GeminiApiKeysModalProps> = ({
  isOpen,
  onClose,
  onKeysChanged
}) => {
  const [keys, setKeys] = useState<GeminiKeyRecord[]>([]);
  const [totalConfigured, setTotalConfigured] = useState<number>(0);
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form input
  const [inputKey, setInputKey] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gemini-keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setTotalConfigured(data.total_configured || 0);
        setHasEnvKey(Boolean(data.has_env_key));
      }
    } catch (e: any) {
      console.error('Failed to load Gemini keys:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  const handleAddKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setAdding(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/admin/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: inputKey.trim(),
          label: inputLabel.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register API key(s)');
      }

      setFeedbackMsg({
        type: 'success',
        text: data.message || `Successfully registered key(s) to the pool!`
      });
      setInputKey('');
      setInputLabel('');
      await fetchKeys();
      if (onKeysChanged) onKeysChanged();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Error adding API key'
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to remove this API key from the rotation pool?')) return;

    try {
      const res = await fetch(`/api/admin/gemini-keys/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        setTotalConfigured(prev => Math.max(0, prev - 1));
        if (onKeysChanged) onKeysChanged();
      }
    } catch (e) {
      console.error('Failed to delete key:', e);
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch('/api/admin/gemini-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.valid) {
        setFeedbackMsg({
          type: 'success',
          text: `Key connection verified successfully (Model: ${data.model || 'gemini-3.1-flash-lite'}).`
        });
        setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'ACTIVE', last_error: undefined } : k));
      } else {
        setFeedbackMsg({
          type: 'error',
          text: `Verification failed: ${data.error || 'Unknown error'}`
        });
        setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'INVALID', last_error: data.error } : k));
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Test failed: ${e.message || e}`
      });
    } finally {
      setTestingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Google Gemini API Key Pool</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Admin Rotation & Failover
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Add multiple Google API keys for automatic round-robin rotation and quota failover.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status & Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Configured Keys</div>
                <div className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  {totalConfigured}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({keys.length} admin {hasEnvKey ? '+ env key' : ''})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Auto Failover</div>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active on 429 / Quota
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Load Balancing</div>
                <div className="text-xs font-semibold text-slate-700">
                  Round-Robin Sequential
                </div>
              </div>
            </div>
          </div>

          {/* Feedback alert */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Form to Add New Key(s) */}
          <form onSubmit={handleAddKeys} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Add Google Gemini API Key(s)
              </span>
              <span className="text-[11px] text-slate-500">
                Multiple keys supported (newline or comma separated)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Paste Google Gemini API Key(s) here (e.g. AIzaSy...)"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="space-y-2 flex flex-col justify-between">
                <input
                  type="text"
                  value={inputLabel}
                  onChange={(e) => setInputLabel(e.target.value)}
                  placeholder="Optional Label (e.g. Project 1)"
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={adding || !inputKey.trim()}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {adding ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Rotation Pool</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Configured Keys Pool */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Active Key Pool ({keys.length})
              </h3>
              <button
                type="button"
                onClick={fetchKeys}
                disabled={loading}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {keys.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                <Key className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">No admin keys registered in the pool yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {hasEnvKey
                    ? 'The system is currently using the fallback GEMINI_API_KEY environment variable. Add your own keys above for rotation.'
                    : 'Add at least one Gemini API Key to enable AI question matching and weightage analysis.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {keys.map((k) => (
                  <div key={k.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {k.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : k.status === 'RATE_LIMITED' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {k.label || 'Admin Gemini Key'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              k.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : k.status === 'RATE_LIMITED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {k.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{k.masked_key}</span>
                          <span className="font-sans text-slate-400">
                            Successes: {k.success_count || 0}
                          </span>
                          {k.failure_count > 0 && (
                            <span className="font-sans text-rose-500">
                              Failures: {k.failure_count}
                            </span>
                          )}
                        </div>
                        {k.last_error && (
                          <div className="text-[10px] text-rose-600 truncate mt-0.5 max-w-md">
                            Error: {k.last_error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestKey(k.id)}
                        disabled={testingId === k.id}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${testingId === k.id ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>Test</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <div>
            Each key can handle standard Google Gemini free/pay tiers. Automatic failover engages if rate limits occur.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

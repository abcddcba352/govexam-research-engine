import React, { useState } from 'react';
import { FileUp, Link2, Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';

interface DirectWebPanelProps {
  userUrls: string[];
  onChangeUrls: (urls: string[]) => void;
  documentText: string;
  onChangeDocumentText: (text: string) => void;
  documentName: string;
  onChangeDocumentName: (name: string) => void;
}

export const DirectWebPanel: React.FC<DirectWebPanelProps> = ({
  userUrls,
  onChangeUrls,
  documentText,
  onChangeDocumentText,
  documentName,
  onChangeDocumentName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);

  const handleAddUrl = () => {
    if (newUrl.trim()) {
      onChangeUrls([...userUrls, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const handleRemoveUrl = (idx: number) => {
    onChangeUrls(userUrls.filter((_, i) => i !== idx));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChangeDocumentName(file.name);
    setExtractStatus(null);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsExtracting(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          try {
            const res = await fetch('/api/research/extract-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdf_base64: base64, document_name: file.name })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.extracted) {
                const excerpt = data.extracted.raw_syllabus_excerpt || '';
                const topicsList = data.extracted.syllabus_topics?.join('\n') || '';
                const fullText = `${excerpt}\n\nSYLLABUS TOPICS:\n${topicsList}`;
                onChangeDocumentText(fullText);
                setExtractStatus(`Extracted ${data.extracted.syllabus_topics.length} topics from ${file.name}`);
              }
            }
          } catch (err) {
            console.error('PDF extraction failed:', err);
            setExtractStatus('Failed to extract PDF text');
          } finally {
            setIsExtracting(false);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onChangeDocumentText(content || '');
      };
      reader.readAsText(file);
    }
  };

  const handleQuickExtract = async () => {
    if (!documentText.trim()) return;
    setIsExtracting(true);
    setExtractStatus(null);
    try {
      const res = await fetch('/api/research/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_text: documentText, document_name: documentName || 'Document' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.extracted) {
          setExtractStatus(`Parsed ${data.extracted.syllabus_topics.length} syllabus topics & ${data.extracted.stages.length} stages`);
        }
      }
    } catch (err) {
      setExtractStatus('Extraction check failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const hasExtraInputs = userUrls.length > 0 || documentText.trim().length > 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-800 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FileUp className="w-4 h-4 text-emerald-600" />
          <span>Direct Web Source Ingestion (Official PDFs & Direct URLs)</span>
          {hasExtraInputs && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {userUrls.length} URLs, {documentName || '1 Document'}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-4 text-xs">
          <p className="text-[11px] text-slate-500">
            Augment Direct Web retrieval by supplying official notification PDFs or pasting gazette / syllabus text.
          </p>

          {/* URL Input */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Add Specific Official / Secondary URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://tgpsc.gov.in/notifications/28_2022.pdf"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {userUrls.length > 0 && (
              <div className="mt-2 space-y-1">
                {userUrls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100 font-mono text-[11px] text-slate-700">
                    <span className="truncate max-w-sm">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(i)}
                      className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Ingestion */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Official Notification Document / PDF Syllabus
              </label>
              <label className="cursor-pointer text-blue-600 hover:underline text-[11px] font-medium flex items-center gap-1">
                {isExtracting ? (
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                ) : (
                  <FileUp className="w-3 h-3" />
                )}
                <span>Upload Document (.pdf, .txt, .md)</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {documentName && (
              <div className="mb-1 text-[11px] text-emerald-800 font-medium flex items-center justify-between gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Attached: {documentName} ({documentText.length} characters)</span>
                </div>
                {documentText.length > 0 && (
                  <button
                    type="button"
                    onClick={handleQuickExtract}
                    disabled={isExtracting}
                    className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Parse Syllabus
                  </button>
                )}
              </div>
            )}

            {extractStatus && (
              <div className="mb-2 p-1.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-800 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>{extractStatus}</span>
              </div>
            )}

            <textarea
              rows={3}
              placeholder="Paste official notification text, scheme of examination table, or syllabus extract here..."
              value={documentText}
              onChange={(e) => onChangeDocumentText(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
};

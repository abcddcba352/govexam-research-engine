import React, { useState, useEffect } from 'react';
import {
  FileText,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { SourceRecord, OfficialSourceRegistryRecord, DocumentType, SourceTrustLevel } from '../types';
import { TrustBadge, TrustHierarchyLegend } from './TrustBadges';
import { RegistryView } from './RegistryView';

interface SourcesScreenProps {
  initialExamFilter?: string;
}

export const SourcesScreen: React.FC<SourcesScreenProps> = () => {
  const [activeTab, setActiveTab] = useState<'SOURCES' | 'AUTHORITIES'>('SOURCES');
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('NOTIFICATION');
  const [newLevel, setNewLevel] = useState<SourceTrustLevel>('LEVEL_5_OFFICIAL');
  const [newSummary, setNewSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) throw new Error('Failed to fetch sources');
      const data = await res.json();
      setSources(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newUrl) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          url: newUrl,
          document_type: newDocType,
          source_level: newLevel,
          summary: newSummary
        })
      });

      if (!res.ok) throw new Error('Failed to register source');
      const data = await res.json();
      setSources(prev => [data.source, ...prev]);
      setShowAddModal(false);
      setNewTitle('');
      setNewUrl('');
      setNewSummary('');
    } catch (err) {
      alert('Error registering source');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSources = sources.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.summary && s.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedDocType === 'ALL' || s.document_type === selectedDocType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SOURCES & OFFICIAL REGISTRY</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Government Source Repository & Trust Registry</h1>
          <p className="text-sm text-slate-600 mt-1">
            Authoritative state gazettes, examination commission portals, notifications, and Level 1–5 source hierarchy validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('SOURCES')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'SOURCES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Verified Sources ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('AUTHORITIES')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'AUTHORITIES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Official Authority Registry
          </button>
        </div>
      </div>

      {activeTab === 'AUTHORITIES' ? (
        <RegistryView />
      ) : (
        <div className="space-y-6">
          {/* Trust Level Legend */}
          <TrustHierarchyLegend />

          {/* Action Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter sources..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedDocType}
                onChange={e => setSelectedDocType(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-700"
              >
                <option value="ALL">All Document Types</option>
                <option value="NOTIFICATION">Notifications</option>
                <option value="GAZETTE">Gazettes</option>
                <option value="SYLLABUS">Official Syllabi</option>
                <option value="PREVIOUS_PAPER">Previous Papers</option>
                <option value="ANSWER_KEY">Answer Keys</option>
                <option value="GOVT_ORDER">Government Orders</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Verified Source</span>
            </button>
          </div>

          {/* Add Source Modal */}
          {showAddModal && (
            <form onSubmit={handleAddSource} className="bg-white rounded-xl border border-indigo-200 shadow-lg p-6 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Register Official Source / Document</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document / Source Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Telangana State Gazette No. 74 - Group-II Selection Rules"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Document URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://tgpsc.gov.in/notifications/notif_28_2022.pdf"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Classification
                  </label>
                  <select
                    value={newDocType}
                    onChange={e => setNewDocType(e.target.value as DocumentType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="NOTIFICATION">Official Notification</option>
                    <option value="GAZETTE">Supreme State/Central Gazette</option>
                    <option value="SYLLABUS">Approved Syllabus Document</option>
                    <option value="GOVT_ORDER">Government Order (G.O.)</option>
                    <option value="PREVIOUS_PAPER">Official Question Paper</option>
                    <option value="ANSWER_KEY">Final Answer Key</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Summary of Legal / Examination Relevance
                  </label>
                  <textarea
                    rows={2}
                    value={newSummary}
                    onChange={e => setNewSummary(e.target.value)}
                    placeholder="Provides statutory negative marking rules, paper duration, and syllabus item breakdown..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  {isSubmitting ? 'Registering...' : 'Register Source'}
                </button>
              </div>
            </form>
          )}

          {/* Sources Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSources.map(source => (
              <div
                key={source.source_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <TrustBadge level={source.source_level} />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                      {source.document_type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {source.title}
                  </h3>

                  {source.summary && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {source.summary}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                    {source.domain}
                  </span>

                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
                  >
                    <span>View Official Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

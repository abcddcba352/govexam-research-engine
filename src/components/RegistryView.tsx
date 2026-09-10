import React, { useState, useMemo } from 'react';
import { OfficialSourceRegistryRecord } from '../types.ts';
import { Database, Search, Plus, ExternalLink, ShieldCheck, Check, AlertCircle, Building2 } from 'lucide-react';

interface RegistryViewProps {
  registry: OfficialSourceRegistryRecord[];
  onAddOrUpdate: (item: OfficialSourceRegistryRecord) => Promise<void>;
}

export const RegistryView: React.FC<RegistryViewProps> = ({ registry, onAddOrUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<OfficialSourceRegistryRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<OfficialSourceRegistryRecord>>({
    authority_id: '',
    authority_name: '',
    authority_type: 'State PSC',
    state: '',
    official_domain: '',
    notification_path: '/notifications',
    syllabus_path: '/syllabus',
    question_paper_path: '/previous-papers',
    answer_key_path: '/answer-keys',
    results_path: '/results',
    gazette_domain: 'egazette.gov.in',
    other_official_domains: [],
    status: 'ACTIVE',
  });
  const [otherDomainsInput, setOtherDomainsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    return registry.filter(r => {
      if (typeFilter !== 'ALL' && r.authority_type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.authority_id.toLowerCase().includes(q) ||
          r.authority_name.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q) ||
          r.official_domain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [registry, searchTerm, typeFilter]);

  const handleOpenAdd = (item?: OfficialSourceRegistryRecord) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setOtherDomainsInput((item.other_official_domains || []).join(', '));
    } else {
      setEditingItem(null);
      setFormData({
        authority_id: '',
        authority_name: '',
        authority_type: 'State PSC',
        state: '',
        official_domain: '',
        notification_path: '/notifications',
        syllabus_path: '/syllabus',
        question_paper_path: '/previous-papers',
        answer_key_path: '/answer-keys',
        results_path: '/results',
        gazette_domain: 'egazette.gov.in',
        other_official_domains: [],
        status: 'ACTIVE',
      });
      setOtherDomainsInput('');
    }
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.authority_id || !formData.official_domain) return;
    setIsSaving(true);
    try {
      const payload: OfficialSourceRegistryRecord = {
        authority_id: formData.authority_id.trim().toLowerCase().replace(/\s+/g, '_'),
        authority_name: formData.authority_name || formData.authority_id,
        authority_type: formData.authority_type || 'State PSC',
        state: formData.state || 'General',
        official_domain: formData.official_domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
        notification_path: formData.notification_path || '/notifications',
        syllabus_path: formData.syllabus_path || '/syllabus',
        question_paper_path: formData.question_paper_path || '/previous-papers',
        answer_key_path: formData.answer_key_path || '/answer-keys',
        results_path: formData.results_path || '/results',
        gazette_domain: formData.gazette_domain || 'egazette.gov.in',
        other_official_domains: otherDomainsInput
          .split(',')
          .map(d => d.trim().replace(/^https?:\/\//, ''))
          .filter(Boolean),
        verified_at: new Date().toISOString(),
        status: (formData.status as any) || 'ACTIVE',
      };
      await onAddOrUpdate(payload);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Official Source Registry (official_source_registry)
              </h2>
              <p className="text-xs text-slate-500">
                Persistent repository of verified government commissions, official domains, and publication paths
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Authority Record
          </button>
        </div>

        {/* Regulatory Rule Callout */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs flex items-start gap-2 mt-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-amber-900">Registry Architecture Rule: </strong>
            Do not hard-code exam patterns. The registry provides places to search, not facts about an examination.
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search commission, state, or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Authorities ({registry.length})</option>
              <option value="State PSC">State PSCs</option>
              <option value="Central Commission">Central Commissions</option>
              <option value="Railway Recruitment Board">Railway Boards</option>
              <option value="Police Recruitment Board">Police Recruitment</option>
              <option value="Teacher Recruitment Board">Teacher Recruitment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.authority_id}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {item.authority_name}
                    </h3>
                    <div className="text-[10px] text-slate-500 font-mono">
                      ID: {item.authority_id} • {item.state}
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  item.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.status}
                </span>
              </div>

              {/* Primary Official Domain */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Official Domain:</span>
                  <a
                    href={`https://${item.official_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-mono text-[11px] flex items-center gap-1 font-semibold"
                  >
                    {item.official_domain}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Gazette Domain:</span>
                  <span className="font-mono text-[11px] text-slate-700">
                    {item.gazette_domain || 'egazette.gov.in'}
                  </span>
                </div>
              </div>

              {/* Path Mapping */}
              <div className="text-[11px] space-y-1 text-slate-600 font-mono mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Notifications:</span>
                  <span className="truncate max-w-[180px]">{item.notification_path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Syllabus:</span>
                  <span className="truncate max-w-[180px]">{item.syllabus_path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Question Papers:</span>
                  <span className="truncate max-w-[180px]">{item.question_paper_path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Answer Keys:</span>
                  <span className="truncate max-w-[180px]">{item.answer_key_path}</span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Verified: {item.verified_at && !isNaN(new Date(item.verified_at).getTime()) ? new Date(item.verified_at).toLocaleDateString() : 'Active in Registry'}
              </span>
              <button
                type="button"
                onClick={() => handleOpenAdd(item)}
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
              >
                Edit Paths
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {editingItem ? 'Edit Official Authority Registry Record' : 'Register New Official Commission'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Registry provides search locations (domains & paths), never hard-coded exam facts.
            </p>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Authority ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. tgpsc"
                    value={formData.authority_id || ''}
                    onChange={(e) => setFormData({ ...formData, authority_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">State / Central</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Telangana or Central"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Authority Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Telangana Public Service Commission (TGPSC)"
                  value={formData.authority_name || ''}
                  onChange={(e) => setFormData({ ...formData, authority_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Authority Type</label>
                  <select
                    value={formData.authority_type || 'State PSC'}
                    onChange={(e) => setFormData({ ...formData, authority_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                  >
                    <option value="State PSC">State PSC</option>
                    <option value="Central Commission">Central Commission</option>
                    <option value="Railway Recruitment Board">Railway Recruitment Board</option>
                    <option value="Police Recruitment Board">Police Recruitment Board</option>
                    <option value="Teacher Recruitment Board">Teacher Recruitment Board</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Domain</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. tgpsc.gov.in"
                    value={formData.official_domain || ''}
                    onChange={(e) => setFormData({ ...formData, official_domain: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Notification Path</label>
                  <input
                    type="text"
                    placeholder="/notifications"
                    value={formData.notification_path || ''}
                    onChange={(e) => setFormData({ ...formData, notification_path: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Syllabus Path</label>
                  <input
                    type="text"
                    placeholder="/syllabus"
                    value={formData.syllabus_path || ''}
                    onChange={(e) => setFormData({ ...formData, syllabus_path: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gazette Domain</label>
                  <input
                    type="text"
                    placeholder="egazette.gov.in"
                    value={formData.gazette_domain || ''}
                    onChange={(e) => setFormData({ ...formData, gazette_domain: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                    <option value="DEPRECATED">DEPRECATED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Other Official Domains (comma-separated)</label>
                <input
                  type="text"
                  placeholder="websitel.tgpsc.gov.in, tspsc.gov.in"
                  value={otherDomainsInput}
                  onChange={(e) => setOtherDomainsInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Registry Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

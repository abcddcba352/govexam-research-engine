import React from 'react';
import { SourceTrustLevel, VerificationStatus } from '../types.ts';
import { ShieldCheck, ShieldAlert, Shield, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

interface TrustBadgeProps {
  level: SourceTrustLevel;
  compact?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ level, compact = false }) => {
  switch (level) {
    case 'LEVEL_5_OFFICIAL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100/90 text-emerald-900 border border-emerald-300">
          <ShieldCheck className="w-3 h-3 text-emerald-700" />
          Level 5 {compact ? 'Official' : '— Official Notification / Gazette'}
        </span>
      );
    case 'LEVEL_4_GOVERNMENT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-100/90 text-teal-900 border border-teal-300">
          <Shield className="w-3 h-3 text-teal-700" />
          Level 4 {compact ? 'Govt' : '— Govt / PIB / Ministry'}
        </span>
      );
    case 'LEVEL_3_ACADEMIC':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100/90 text-blue-900 border border-blue-300">
          <Shield className="w-3 h-3 text-blue-700" />
          Level 3 {compact ? 'Academic' : '— Academic / Reference'}
        </span>
      );
    case 'LEVEL_2_SECONDARY':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100/90 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-700" />
          Level 2 {compact ? 'Secondary' : '— Secondary / News / EdTech'}
        </span>
      );
    case 'LEVEL_1_DISCOVERY':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100/90 text-rose-900 border border-rose-300">
          <ShieldAlert className="w-3 h-3 text-rose-700" />
          Level 1 {compact ? 'Discovery' : '— Discovery / Forum / Community'}
        </span>
      );
  }
};

interface VerificationBadgeProps {
  status: VerificationStatus;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status }) => {
  switch (status) {
    case 'VERIFIED_OFFICIAL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
          <CheckCircle2 className="w-3 h-3" />
          VERIFIED OFFICIAL
        </span>
      );
    case 'VERIFIED_MULTIPLE_SOURCES':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white">
          <CheckCircle2 className="w-3 h-3" />
          MULTI-SOURCE VERIFIED
        </span>
      );
    case 'SECONDARY_ONLY':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-700" />
          SECONDARY ONLY
        </span>
      );
    case 'CONFLICT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          CONFLICT RESOLVED
        </span>
      );
    case 'UNVERIFIED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
          <HelpCircle className="w-3 h-3 text-slate-500" />
          UNVERIFIED
        </span>
      );
  }
};

export const TrustHierarchyLegend: React.FC = () => {
  return (
    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Source Trust Hierarchy & Override Principle
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          Level 5 overrides Level 1 & 2
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
          <strong>L5:</strong> Official Gazettes & Commission Portals (Supreme)
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-teal-50 border border-teal-200 text-teal-900">
          <strong>L4:</strong> PIB / Ministries / Department Orders
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900">
          <strong>L3:</strong> Academic & University Referrals
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900">
          <strong>L2:</strong> Reputable News & EdTech
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-900">
          <strong>L1:</strong> Forums / Social / Discovery (Never overrides L5)
        </div>
      </div>
    </div>
  );
};

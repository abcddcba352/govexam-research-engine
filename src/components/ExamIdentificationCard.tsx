import React from 'react';
import { ExamIdentification } from '../types.ts';
import { Building2, MapPin, Award, Briefcase, FileCheck, Layers, Calendar, CheckCircle2 } from 'lucide-react';

interface ExamIdentificationCardProps {
  identification: ExamIdentification;
  isInitialAnalyzing?: boolean;
}

export const ExamIdentificationCard: React.FC<ExamIdentificationCardProps> = ({
  identification,
  isInitialAnalyzing = false,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">
              Exam Entity Identification
            </h3>
            <p className="text-[11px] text-slate-500">
              Pre-research entity extraction before factual exploration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Entities Identified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Commission */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Conducting Commission</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 leading-snug">
            {identification.commission}
          </div>
        </div>

        {/* State / Central */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Jurisdiction</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 leading-snug flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            {identification.state_or_central}
          </div>
        </div>

        {/* Exam */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <span>Examination</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 leading-snug">
            {identification.exam}
          </div>
        </div>

        {/* Recruitment Cycle */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Recruitment Cycle</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 leading-snug">
            {identification.recruitment_cycle}
          </div>
        </div>

        {/* Stage */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Stage / Tier</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 leading-snug">
            {identification.stage}
          </div>
        </div>

        {/* Paper */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <FileCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Paper</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 leading-snug">
            {identification.paper}
          </div>
        </div>

        {/* Post / Cadres */}
        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80 sm:col-span-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Cadres & Designated Posts</span>
          </div>
          <div className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
            {identification.post}
          </div>
        </div>
      </div>
    </div>
  );
};

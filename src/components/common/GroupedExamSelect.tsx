import React from 'react';
import type { ExamRecord } from '../../types.ts';
import { groupExamsByJurisdiction } from '../../utils/examJurisdiction.ts';

export interface GroupedExamSelectProps {
  exams: ExamRecord[];
  value: string;
  onChange: (examId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showPaper?: boolean;
  ariaLabel?: string;
  id?: string;
}

export const GroupedExamSelect: React.FC<GroupedExamSelectProps> = ({
  exams,
  value,
  onChange,
  disabled = false,
  placeholder,
  className = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
  showPaper = true,
  ariaLabel,
  id
}) => {
  const { central, states, stateNames } = groupExamsByJurisdiction(exams);

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {placeholder && <option value="">{placeholder}</option>}

      {central.length > 0 && (
        <optgroup label="🏛️ Central / National (All-India)">
          {central.map((ex) => (
            <option key={ex.exam_id} value={ex.exam_id}>
              {ex.title}{showPaper && ex.paper ? ` • ${ex.paper}` : ''}
            </option>
          ))}
        </optgroup>
      )}

      {stateNames.map((stateName) => (
        <optgroup key={stateName} label={`🗺️ State: ${stateName}`}>
          {states[stateName].map((ex) => (
            <option key={ex.exam_id} value={ex.exam_id}>
              {ex.title}{showPaper && ex.paper ? ` • ${ex.paper}` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

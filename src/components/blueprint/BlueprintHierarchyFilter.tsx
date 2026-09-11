import React from 'react';
import { ExamHierarchyFilter, type ExamHierarchyFilterProps } from '../common/ExamHierarchyFilter.tsx';

export type BlueprintHierarchyFilterProps = ExamHierarchyFilterProps;

export const BlueprintHierarchyFilter: React.FC<BlueprintHierarchyFilterProps> = (props) => {
  return (
    <ExamHierarchyFilter
      title="Blueprint Evidence & Paper Hierarchy Filter"
      subtitle="Filter down through the official structure to generate or audit targeted blueprints"
      {...props}
    />
  );
};

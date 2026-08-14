import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';
import './SubjectProgress.css';

export interface SubjectItem {
  name: string;
  progress: number;
  color: string;
  topicsCount: number;
  studyTime: string;
}

interface SubjectProgressProps {
  subjects: SubjectItem[];
}

export function SubjectProgress({ subjects }: SubjectProgressProps) {
  return (
    <div className="subject-progress-list">
      {subjects.map((sub, idx) => (
        <div key={idx} className="subject-progress-row">
          <div className="subject-row-header">
            <div className="subject-row-title">
              <span className="subject-dot" style={{ backgroundColor: sub.color }} />
              <span className="subject-name">{sub.name}</span>
            </div>
            <span className="subject-info">{sub.studyTime} • {sub.topicsCount} tóp.</span>
          </div>
          <div className="subject-row-bar-section">
            <ProgressBar value={sub.progress} color={sub.color} />
            <span className="subject-percentage">{sub.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

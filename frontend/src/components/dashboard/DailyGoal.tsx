import React from 'react';
import './DailyGoal.css';

interface DailyGoalProps {
  targetMinutes: number;
  studiedMinutes: number;
  tasks: { id: string; label: string; done: boolean }[];
}

export function DailyGoal({ targetMinutes, studiedMinutes, tasks }: DailyGoalProps) {
  const percent = Math.min(100, Math.round((studiedMinutes / targetMinutes) * 100));
  return (
    <div className="daily-goal-card">
      <div className="daily-goal-header">
        <h3 className="daily-goal-title">Meta Diária</h3>
        <span className="daily-goal-progress">{studiedMinutes}m / {targetMinutes}m estudados</span>
      </div>
      <div className="daily-goal-bar-container">
        <div className="daily-goal-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="daily-goal-tasks">
        {tasks.map(t => (
          <label key={t.id} className={`daily-goal-task ${t.done ? 'done' : ''}`}>
            <input type="checkbox" checked={t.done} readOnly />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

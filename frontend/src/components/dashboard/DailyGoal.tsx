import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import './DailyGoal.css';

interface DailyGoalProps {
  targetMinutes: number;
  studiedMinutes: number;
  tasks: { id: string; label: string; done: boolean }[];
  onUpdateTarget?: (newTarget: number) => void;
  onToggleTask?: (taskId: string) => void;
}

const PRESET_MINUTES = [30, 45, 60, 90, 120, 180];

export function DailyGoal({ targetMinutes, studiedMinutes, tasks, onUpdateTarget, onToggleTask }: DailyGoalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempMinutes, setTempMinutes] = useState(targetMinutes);

  const percent = Math.min(100, Math.round((studiedMinutes / targetMinutes) * 100));

  const handleSave = () => {
    if (tempMinutes > 0 && onUpdateTarget) {
      onUpdateTarget(tempMinutes);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempMinutes(targetMinutes);
    setIsEditing(false);
  };

  return (
    <div className="daily-goal-card">
      <div className="daily-goal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className="daily-goal-title">Meta Diária</h3>
          {!isEditing && onUpdateTarget && (
            <button
              className="daily-goal-edit-btn"
              onClick={() => {
                setTempMinutes(targetMinutes);
                setIsEditing(true);
              }}
              title="Editar meta diária de estudos"
              aria-label="Editar meta diária"
            >
              <Edit2 size={13} />
            </button>
          )}
        </div>
        <span className="daily-goal-progress">{studiedMinutes}m / {targetMinutes}m estudados</span>
      </div>

      {isEditing ? (
        <div className="daily-goal-edit-panel">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Tempo de estudo diário planejado:
          </span>

          {/* Atalhos rápidos de minutos */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {PRESET_MINUTES.map(mins => (
              <button
                key={mins}
                type="button"
                className={`daily-preset-btn ${tempMinutes === mins ? 'active' : ''}`}
                onClick={() => setTempMinutes(mins)}
              >
                {mins < 60 ? `${mins}m` : mins % 60 === 0 ? `${mins / 60}h` : `${Math.floor(mins / 60)}h${mins % 60}m`}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <input
              type="number"
              min={5}
              max={720}
              step={5}
              value={tempMinutes}
              onChange={(e) => setTempMinutes(Math.max(5, Number(e.target.value)))}
              className="daily-goal-input"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>minutos/dia</span>
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              <button className="btn btn-sm btn-primary" onClick={handleSave} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Salvar
              </button>
              <button className="btn btn-sm btn-secondary" onClick={handleCancel} style={{ padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="daily-goal-bar-container">
            <div className="daily-goal-bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="daily-goal-tasks">
            {tasks.map(t => (
              <label key={t.id} className={`daily-goal-task ${t.done ? 'done' : ''}`} onClick={() => onToggleTask?.(t.id)}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => onToggleTask?.(t.id)}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

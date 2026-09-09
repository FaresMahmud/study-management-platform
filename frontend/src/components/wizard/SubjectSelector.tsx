import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import './SubjectSelector.css';

interface Subject { id: string | number; subjectName: string; color?: string; }
interface SelectorProps {
  subjects: Subject[];
  selectedId: string | number | null;
  onSelect: (id: string | number) => void;
  onCreateSubject: (name: string, color?: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Esmeralda
  '#f59e0b', // Âmbar
  '#ec4899', // Rosa
  '#8b5cf6', // Roxo
  '#06b6d4', // Ciano
  '#f97316', // Laranja
  '#ef4444', // Vermelho
];

export function SubjectSelector({ subjects, selectedId, onSelect, onCreateSubject }: SelectorProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [show, setShow] = useState(false);

  return (
    <div className="subject-selector">
      <div className="subjects-grid">
        {subjects.map((s, idx) => {
          const cardColor = s.color || PRESET_COLORS[idx % PRESET_COLORS.length];
          const isSelected = selectedId === s.id;
          return (
            <Card
              key={s.id}
              className={`sub-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(s.id)}
              style={{
                borderLeft: `4px solid ${cardColor}`,
                boxShadow: isSelected ? `0 0 12px ${cardColor}40` : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cardColor, flexShrink: 0 }} />
                <span style={{ fontWeight: isSelected ? 700 : 500 }}>{s.subjectName}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {show ? (
        <div className="inline-add" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome da matéria..."
              className="new-sub-input"
              style={{ flex: 1 }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) {
                  onCreateSubject(name.trim(), selectedColor).then(() => { setName(''); setShow(false); });
                }
              }}
            />
            <Button
              variant="primary"
              onClick={() => name.trim() && onCreateSubject(name.trim(), selectedColor).then(() => { setName(''); setShow(false); })}
            >
              Adicionar
            </Button>
            <Button variant="ghost" onClick={() => setShow(false)}>
              Cancelar
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Cor:</span>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: selectedColor === c ? '2px solid white' : '1px solid rgba(0,0,0,0.2)',
                  boxShadow: selectedColor === c ? '0 0 6px rgba(0,0,0,0.5)' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.1s ease',
                  transform: selectedColor === c ? 'scale(1.2)' : 'none',
                }}
                title={c}
              />
            ))}
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setShow(true)}>+ Nova matéria</Button>
      )}
    </div>
  );
}

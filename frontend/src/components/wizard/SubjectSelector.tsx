import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import './SubjectSelector.css';

interface Subject { id: string | number; subjectName: string; color?: string; }
interface SelectorProps {
  subjects: Subject[];
  selectedId: string | number | null;
  onSelect: (id: string | number) => void;
  onCreateSubject: (name: string) => Promise<void>;
}

export function SubjectSelector({ subjects, selectedId, onSelect, onCreateSubject }: SelectorProps) {
  const [name, setName] = useState('');
  const [show, setShow] = useState(false);
  return (
    <div className="subject-selector">
      <div className="subjects-grid">
        {subjects.map(s => (
          <Card key={s.id} className={`sub-card ${selectedId === s.id ? 'selected' : ''}`} onClick={() => onSelect(s.id)}>
            {s.subjectName}
          </Card>
        ))}
      </div>
      {show ? (
        <div className="inline-add">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nova matéria..." className="new-sub-input" />
          <Button variant="primary" onClick={() => name.trim() && onCreateSubject(name.trim()).then(() => (setName(''), setShow(false)))}>Adicionar</Button>
        </div>
      ) : <Button variant="ghost" onClick={() => setShow(true)}>+ Nova matéria</Button>}
    </div>
  );
}

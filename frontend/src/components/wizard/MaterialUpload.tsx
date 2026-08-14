import React from 'react';
import { Card } from '../ui/Card';
import './MaterialUpload.css';

interface MaterialProps {
  materialType: 'pdf' | 'text' | 'scratch';
  onSelectType: (type: 'pdf' | 'text' | 'scratch') => void;
  textData: string;
  onChangeText: (text: string) => void;
  selectedFile: File | null;
  onChangeFile: (file: File | null) => void;
}

export function MaterialUpload({ materialType, onSelectType, textData, onChangeText, selectedFile, onChangeFile }: MaterialProps) {
  return (
    <div className="material-step">
      <h3>Adicione o material de estudo</h3>
      <div className="materials-grid">
        <Card className={`mat-card ${materialType === 'pdf' ? 'selected' : ''}`} onClick={() => onSelectType('pdf')}>📄 Upload PDF</Card>
        <Card className={`mat-card ${materialType === 'text' ? 'selected' : ''}`} onClick={() => onSelectType('text')}>📋 Colar Texto</Card>
        <Card className={`mat-card ${materialType === 'scratch' ? 'selected' : ''}`} onClick={() => onSelectType('scratch')}>💬 Do Zero</Card>
      </div>
      {materialType === 'pdf' && (
        <div className="pdf-upload-box">
          <input type="file" accept=".pdf" className="file-input" onChange={e => onChangeFile(e.target.files?.[0] || null)} />
          {selectedFile && <p className="file-name-hint">📄 {selectedFile.name}</p>}
        </div>
      )}
      {materialType === 'text' && (
        <textarea value={textData} onChange={e => onChangeText(e.target.value)} placeholder="Cole o material teórico..." className="text-area-input" />
      )}
    </div>
  );
}

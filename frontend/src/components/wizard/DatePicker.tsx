import React from 'react';
import './DatePicker.css';

interface DatePickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function DatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const getDaysRemaining = () => {
    if (!selectedDate) return 0;
    const diff = new Date(selectedDate).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="date-picker-step">
      <h3>Qual é a data da prova?</h3>
      <input 
        type="date" 
        value={selectedDate} 
        onChange={e => onSelectDate(e.target.value)} 
        className="date-input" 
      />
      {selectedDate && (
        <div className="days-counter">
          Faltam <strong>{getDaysRemaining()}</strong> dias para o seu objetivo.
        </div>
      )}
    </div>
  );
}

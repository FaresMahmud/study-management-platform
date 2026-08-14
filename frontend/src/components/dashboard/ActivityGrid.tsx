import React from 'react';
import { Card } from '../ui/Card';
import './ActivityGrid.css';

export interface Activity {
  id: string | number;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

interface ActivityGridProps {
  activities: Activity[];
}

export function ActivityGrid({ activities }: ActivityGridProps) {
  return (
    <div className="activity-grid">
      {activities.map((act) => (
        <Card key={act.id} onClick={act.onClick} className="activity-card">
          <div className="activity-icon-container">{act.icon}</div>
          <h3 className="activity-card-title">{act.title}</h3>
          <p className="activity-card-desc">{act.description}</p>
        </Card>
      ))}
    </div>
  );
}

import React from 'react';
import { Play, Sparkles, BookOpen, Clock } from 'lucide-react';
import type { Activity } from './ActivityGrid';
import type { SubjectItem } from './SubjectProgress';

export const mockActivities: Activity[] = [
  { id: '1', icon: <Play size={20} />, title: 'Sessão Foco', description: 'Pomodoro de 25m' },
  { id: '2', icon: <Sparkles size={20} />, title: 'Gerar Simulado', description: '3 questões rápidas' },
  { id: '3', icon: <BookOpen size={20} />, title: 'Revisar PDF', description: 'Leitura ativa por IA' },
  { id: '4', icon: <Clock size={20} />, title: 'Ver Histórico', description: 'Tempo total acumulado' },
];

export const mockSubjects: SubjectItem[] = [
  { name: 'Direito Constitucional', progress: 75, color: '#6366f1', topicsCount: 14, studyTime: '12h 30m' },
  { name: 'Língua Portuguesa', progress: 40, color: '#22c55e', topicsCount: 8, studyTime: '6h 15m' },
  { name: 'Informática Básica', progress: 90, color: '#f59e0b', topicsCount: 20, studyTime: '18h 45m' },
  { name: 'Raciocínio Lógico', progress: 15, color: '#ef4444', topicsCount: 6, studyTime: '2h 10m' },
];

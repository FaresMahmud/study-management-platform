import { useMemo } from 'react';

interface Session {
  sessionDate: string;
  duration?: number;
}

interface Goal {
  subject?: {
    id?: number;
    subjectName?: string;
  };
  currentMastery?: number;
}

export interface Gamification {
  streakDays: number;
  totalStudyTime: number;
  masteryBySubject: { subjectId: number; subjectName: string; mastery: number }[];
  zone: 'aprendizado' | 'maestria' | 'revisao';
}

// Pass current date as parameter to avoid impure function calls during render
export function useGamification(sessions: Session[] = [], goals: Goal[] = [], todayStr?: string): Gamification {
  return useMemo(() => {
    // Compute dates inside useMemo using the passed todayStr to avoid impure function calls during render
    const now = todayStr ? new Date(todayStr) : new Date();
    const todayStrComputed = todayStr ?? now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    // 1. Streak Days
    const dates = Array.from(new Set(sessions.map(s => s.sessionDate))).sort().reverse();
    let streak = 0;

    if (dates.includes(todayStrComputed) || dates.includes(yesterdayStr)) {
      let current = new Date(dates[0]);
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i]);
        const diff = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) { streak++; current = prev; }
        else if (diff > 1) break;
      }
    }

    // 2. Total Study Time
    const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    // 3. Mastery By Subject
    const masteryMap = new Map<number, { name: string; sum: number; count: number }>();
    goals.forEach(g => {
      const sub = g.subject || {};
      if (sub.id) {
        const curr = masteryMap.get(sub.id) || { name: sub.subjectName || 'Sem Nome', sum: 0, count: 0 };
        masteryMap.set(sub.id, { name: curr.name, sum: curr.sum + (g.currentMastery || 0), count: curr.count + 1 });
      }
    });

    const masteryBySubject = Array.from(masteryMap.entries()).map(([id, val]) => ({
      subjectId: id,
      subjectName: val.name,
      mastery: Math.round(val.sum / val.count),
    }));

    // 4. Zone
    const avgMastery = masteryBySubject.length > 0 ? masteryBySubject.reduce((sum, m) => sum + m.mastery, 0) / masteryBySubject.length : 0;
    const zone = avgMastery < 60 ? 'revisao' : avgMastery < 85 ? 'aprendizado' : 'maestria';

    return { streakDays: streak, totalStudyTime: totalTime, masteryBySubject, zone };
  }, [sessions, goals]);
}

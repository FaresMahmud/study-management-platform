import React, { useState, useEffect } from 'react';
import { FlashcardCard } from '../components/study/FlashcardCard';
import { DifficultyButtons } from '../components/study/DifficultyButtons';
import { ProgressRingSmall } from '../components/study/ProgressRingSmall';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { apiClient } from '../api/client';
import './Flashcards.css';

interface Flashcard { id: number; question: string; answer: string; }
interface PageProps { onBack: () => void; }

export default function FlashcardsPage({ onBack }: PageProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);

  const fetchCards = () => apiClient.get<Flashcard[]>('/api/flashcards/due').then(r => (setCards(r.data), setLoading(false)));
  useEffect(() => { fetchCards(); }, []);

  const handleReview = async (quality: 'easy' | 'good' | 'hard') => {
    const current = cards[idx];
    setSwipeDir('left');
    await apiClient.post(`/api/flashcards/${current.id}/review?quality=${quality}`);
    setTimeout(() => {
      setIdx(prev => prev + 1);
      setFlipped(false);
      setSwipeDir(null);
    }, 200);
  };

  if (loading) return <LoadingSpinner />;
  if (idx >= cards.length) return <div className="flashcards-container"><EmptyState icon="🎉" text="Parabéns! Você revisou tudo hoje!" cta="Voltar ao Dashboard" onCta={onBack} /></div>;

  return (
    <div className="flashcards-container">
      <header className="flashcards-header">
        <button onClick={onBack} className="back-link">← Voltar</button>
        <div className="flashcards-progress">
          <ProgressRingSmall current={idx} total={cards.length} />
          <span>{cards.length - idx} cards restantes hoje</span>
        </div>
      </header>
      <main className={`flashcard-stage ${swipeDir || ''}`}>
        <FlashcardCard front={cards[idx].question} back={cards[idx].answer} isFlipped={flipped} onClickFlip={() => setFlipped(!flipped)} />
        {flipped && <div className="action-row"><DifficultyButtons onSelect={handleReview} /></div>}
      </main>
    </div>
  );
}

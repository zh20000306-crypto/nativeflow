import React from 'react';
import { X } from 'lucide-react';
import { ExpressionCard } from '../types/card';
import { CardView } from './CardView';

interface CardDetailModalProps {
  card: ExpressionCard | null;
  onClose: () => void;
  onToggleStar: (id: string) => void;
  onOpenSentenceModal: (card: ExpressionCard) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  onClose,
  onToggleStar,
  onOpenSentenceModal,
}) => {
  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="max-w-3xl w-full my-auto relative">
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 sm:right-2 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        <CardView
          card={card}
          onToggleStar={onToggleStar}
          onOpenSentenceModal={onOpenSentenceModal}
        />
      </div>
    </div>
  );
};

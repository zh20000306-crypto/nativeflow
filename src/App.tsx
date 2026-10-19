import React, { useState, useEffect } from 'react';
import { ExpressionCard, UserSentenceRecord } from './types/card';
import { UserAccount } from './types/user';
import { INITIAL_CARDS } from './data/initialCards';
import { Navbar } from './components/Navbar';
import { ReviewSession } from './components/ReviewSession';
import { CardsLibrary } from './components/CardsLibrary';
import { AddExpressionView } from './components/AddExpressionView';
import { ArchitectureGuideView } from './components/ArchitectureGuideView';
import { SentencePracticeModal } from './components/SentencePracticeModal';
import { CardDetailModal } from './components/CardDetailModal';
import { AuthModal } from './components/AuthModal';
import { formatDate } from './utils/srs';
import {
  getCurrentUser,
  saveUserCardsAndStreak,
  logoutUser,
  setActiveUserId,
} from './utils/auth';

const LAST_DATE_KEY = 'linguacraft_last_active_date';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());

  const [cards, setCards] = useState<ExpressionCard[]>(() => {
    const initialMap = new Map(INITIAL_CARDS.map((c) => [c.id, c]));
    if (currentUser && currentUser.cards && currentUser.cards.length > 0) {
      return currentUser.cards.map((card) => {
        const initial = initialMap.get(card.id);
        if (initial && initial.englishDefinition && !card.englishDefinition) {
          return { ...card, englishDefinition: initial.englishDefinition };
        }
        return card;
      });
    }
    return INITIAL_CARDS;
  });

  const [streak, setStreak] = useState<number>(() => {
    return currentUser?.streak || 3;
  });

  const [currentTab, setCurrentTab] = useState<'review' | 'library' | 'add' | 'guide'>('review');
  const [activeSentenceCard, setActiveSentenceCard] = useState<ExpressionCard | null>(null);
  const [activeDetailCard, setActiveDetailCard] = useState<ExpressionCard | null>(null);

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'switch'>('login');

  // Handle switching or logging in a user
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setCards(user.cards && user.cards.length > 0 ? user.cards : INITIAL_CARDS);
    setStreak(user.streak || 1);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
    setAuthModalMode('login');
  };

  // Sync cards and streak to active user storage
  useEffect(() => {
    if (currentUser) {
      saveUserCardsAndStreak(currentUser.id, cards, streak);
    }
  }, [cards, streak, currentUser]);

  // Update streak logic
  useEffect(() => {
    const today = formatDate();
    const lastActive = localStorage.getItem(LAST_DATE_KEY);
    if (lastActive !== today) {
      localStorage.setItem(LAST_DATE_KEY, today);
    }
  }, []);

  const handleAddCard = (newCard: ExpressionCard) => {
    setCards((prev) => [newCard, ...prev]);
  };

  const handleUpdateCard = (updatedCard: ExpressionCard) => {
    setCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );
    if (activeDetailCard && activeDetailCard.id === updatedCard.id) {
      setActiveDetailCard(updatedCard);
    }
  };

  const handleToggleStar = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, starred: !c.starred } : c))
    );
    if (activeDetailCard && activeDetailCard.id === cardId) {
      setActiveDetailCard((prev) =>
        prev ? { ...prev, starred: !prev.starred } : null
      );
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (activeDetailCard && activeDetailCard.id === cardId) {
      setActiveDetailCard(null);
    }
  };

  const handleSaveSentence = (cardId: string, record: UserSentenceRecord) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            userSentences: [record, ...(c.userSentences || [])],
          };
        }
        return c;
      })
    );

    // Keep streak updated
    setStreak((s) => s + 1);

    if (activeDetailCard && activeDetailCard.id === cardId) {
      setActiveDetailCard((prev) =>
        prev
          ? {
              ...prev,
              userSentences: [record, ...(prev.userSentences || [])],
            }
          : null
      );
    }
  };

  const handleImportCards = (importedCards: ExpressionCard[]) => {
    setCards(importedCards);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors selection:bg-amber-500/20 selection:text-amber-800">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        cards={cards}
        streak={streak}
        user={currentUser}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onUserUpdated={(updated) => setCurrentUser(updated)}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentTab === 'review' && (
          <ReviewSession
            cards={cards}
            onUpdateCard={handleUpdateCard}
            onOpenSentenceModal={(c) => setActiveSentenceCard(c)}
            onSaveSentence={handleSaveSentence}
            onToggleStar={handleToggleStar}
            onNavigateToAdd={() => setCurrentTab('add')}
            streak={streak}
          />
        )}

        {currentTab === 'library' && (
          <CardsLibrary
            cards={cards}
            onSelectCard={(c) => setActiveDetailCard(c)}
            onOpenSentenceModal={(c) => setActiveSentenceCard(c)}
            onToggleStar={handleToggleStar}
            onDeleteCard={handleDeleteCard}
            onImportCards={handleImportCards}
            onNavigateToAdd={() => setCurrentTab('add')}
          />
        )}

        {currentTab === 'add' && (
          <AddExpressionView
            onAddCard={handleAddCard}
            onOpenSentenceModal={(c) => setActiveSentenceCard(c)}
            onToggleStar={handleToggleStar}
          />
        )}

        {currentTab === 'guide' && <ArchitectureGuideView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 dark:border-stone-800/80 py-6 px-4 bg-white/60 dark:bg-stone-900/60 text-center text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-stone-800 dark:text-stone-200">
              NativeFlow
            </span>
            <span>· 地道语境记表达，造句融会贯通，艾宾浩斯智能复习</span>
          </div>
        </div>
      </footer>

      {/* Interactive Sentence Practice Modal */}
      {activeSentenceCard && (
        <SentencePracticeModal
          card={activeSentenceCard}
          isOpen={true}
          onClose={() => setActiveSentenceCard(null)}
          onSaveSentence={handleSaveSentence}
        />
      )}

      {/* Card Detail Modal */}
      {activeDetailCard && (
        <CardDetailModal
          card={activeDetailCard}
          onClose={() => setActiveDetailCard(null)}
          onToggleStar={handleToggleStar}
          onOpenSentenceModal={(c) => {
            setActiveDetailCard(null);
            setActiveSentenceCard(c);
          }}
        />
      )}

      {/* User Login & Account Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />
    </div>
  );
}

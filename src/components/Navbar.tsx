import React from 'react';
import {
  BookOpen,
  Sparkles,
  Flame,
  CheckCircle2,
  Calendar,
  PenTool,
  PlusCircle,
  Library,
  Lightbulb,
} from 'lucide-react';
import { ExpressionCard } from '../types/card';
import { UserAccount } from '../types/user';
import { getDueCards } from '../utils/srs';
import { UserProfileMenu } from './UserProfileMenu';

interface NavbarProps {
  currentTab: 'review' | 'library' | 'add' | 'guide';
  setCurrentTab: (tab: 'review' | 'library' | 'add' | 'guide') => void;
  cards: ExpressionCard[];
  streak: number;
  user: UserAccount | null;
  onOpenAuth: (mode?: 'login' | 'register' | 'switch') => void;
  onUserUpdated: (user: UserAccount) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cards,
  streak,
  user,
  onOpenAuth,
  onUserUpdated,
  onLogout,
}) => {
  const dueCards = getDueCards(cards);

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setCurrentTab('review')}
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-stone-900 dark:text-stone-100 tracking-tight font-serif">
                NativeFlow
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
              地道语境 · AI造句批改 · 艾宾浩斯复习
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setCurrentTab('review')}
            className={`relative px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'review'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>智能复习</span>
            {dueCards.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  currentTab === 'review'
                    ? 'bg-white text-amber-600'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {dueCards.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('library')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'library'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>词库卡片</span>
            <span className="text-[11px] opacity-75">({cards.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('add')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'add'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>录入表达</span>
          </button>
        </nav>

        {/* Right Stats & User Profile */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/60 text-orange-600 dark:text-orange-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span>{streak}天打卡</span>
          </div>

          <UserProfileMenu
            user={user}
            cards={cards}
            streak={streak}
            onOpenAuth={onOpenAuth}
            onUserUpdated={onUserUpdated}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
};

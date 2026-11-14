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
    <header className="sticky top-0 z-40 bg-[#FFFEFA]/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-[#EAE2D6] dark:border-stone-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setCurrentTab('review')}
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-orange-500 flex items-center justify-center text-white shadow-sm shadow-amber-700/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-stone-900 dark:text-stone-100 tracking-tight font-serif">
                NativeFlow
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block tracking-wide">
              把表达用出去 · 生活语境 · 智能复习
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Warm Honey-Cream Active Pill Style) */}
        <nav className="flex items-center p-1 rounded-xl bg-[#F3ECE1] dark:bg-stone-800/80 border border-[#E6DDD0] dark:border-stone-700/60 space-x-0.5">
          <button
            onClick={() => setCurrentTab('review')}
            className={`relative px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'review'
                ? 'bg-[#FFFEFA] dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>智能复习</span>
            {dueCards.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950">
                {dueCards.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('library')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'library'
                ? 'bg-[#FFFEFA] dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>词库卡片</span>
            <span className="text-[11px] opacity-75 font-mono">({cards.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('add')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'add'
                ? 'bg-[#FFFEFA] dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>录入表达</span>
          </button>
        </nav>

        {/* Right Stats & User Profile */}
        <div className="flex items-center space-x-2.5">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F6EBDA] dark:bg-amber-400/10 border border-amber-300/50 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-current text-amber-600 dark:text-amber-400" />
            <span className="font-mono">{streak}天打卡</span>
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

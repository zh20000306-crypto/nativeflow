import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Users,
  Award,
  BookOpen,
  PenTool,
  Flame,
  Settings,
  Sparkles,
  ChevronDown,
  Edit2,
  Check,
} from 'lucide-react';
import { UserAccount } from '../types/user';
import { ExpressionCard } from '../types/card';
import { logoutUser, updateUserProfile, AVATAR_OPTIONS } from '../utils/auth';

interface UserProfileMenuProps {
  user: UserAccount | null;
  cards: ExpressionCard[];
  streak: number;
  onOpenAuth: (mode?: 'login' | 'register' | 'switch') => void;
  onUserUpdated: (user: UserAccount) => void;
  onLogout: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  cards,
  streak,
  onOpenAuth,
  onUserUpdated,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '🦊');
  const [editGoal, setEditGoal] = useState(user?.dailyGoal || 5);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate statistics
  const totalSentences = cards.reduce(
    (sum, c) => sum + (c.userSentences ? c.userSentences.length : 0),
    0
  );
  const masteredCards = cards.filter((c) => c.masteryStage === 'mastered').length;

  // Calculate today's sentences created
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySentencesCount = cards.reduce((sum, c) => {
    const todayList = (c.userSentences || []).filter(
      (s) => s.createdAt && s.createdAt.slice(0, 10) === todayStr
    );
    return sum + todayList.length;
  }, 0);

  const goal = user?.dailyGoal || 5;
  const progressPercent = Math.min(100, Math.round((todaySentencesCount / goal) * 100));

  const handleSaveProfile = () => {
    if (!user) return;
    const updated = updateUserProfile(user.id, {
      name: editName.trim() || user.name,
      avatar: editAvatar,
      dailyGoal: Number(editGoal) || 5,
    });
    if (updated) {
      onUserUpdated(updated);
      setIsEditing(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={() => onOpenAuth('login')}
        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 flex items-center space-x-1.5 transition-all hover:scale-102 cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>登录 / 注册</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button in Navbar */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 p-1.5 rounded-2xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform">
          {user.avatar || '🦊'}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 leading-tight max-w-[90px] truncate">
            {user.name}
          </div>
          <div className="text-[10px] text-stone-400 flex items-center space-x-1">
            <span>{cards.length} 词</span>
            <span>·</span>
            <span>{streak}天</span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition-transform" />
      </button>

      {/* Profile Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-stone-800 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {!isEditing ? (
            <>
              {/* User Header */}
              <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-700/60">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-2xl shrink-0">
                    {user.avatar || '🦊'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-stone-400 truncate">{user.email}</div>
                    <div className="inline-flex items-center space-x-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                      <Flame className="w-3 h-3 fill-current" />
                      <span>已连续打卡 {streak} 天</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditName(user.name);
                    setEditAvatar(user.avatar);
                    setEditGoal(user.dailyGoal || 5);
                    setIsEditing(true);
                  }}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  title="编辑资料"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Today's Goal Progress */}
              <div className="my-3.5 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5 text-stone-700 dark:text-stone-300">
                  <span className="flex items-center space-x-1">
                    <span>🎯 今日造句目标</span>
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    {todaySentencesCount} / {goal} 句 ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 my-3 text-center">
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800">
                  <div className="text-base font-extrabold text-stone-900 dark:text-stone-100 font-mono">
                    {cards.length}
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center justify-center space-x-1 mt-0.5">
                    <BookOpen className="w-3 h-3 text-amber-500" />
                    <span>词库总词数</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800">
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {totalSentences}
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center justify-center space-x-1 mt-0.5">
                    <PenTool className="w-3 h-3 text-emerald-500" />
                    <span>实战造句总数</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-700/60 space-y-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAuth('switch');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-stone-400" />
                  <span>切换账号 / 登录其他账号</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出当前账号</span>
                </button>
              </div>
            </>
          ) : (
            /* Editing Profile View */
            <div className="space-y-3">
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 pb-1 border-b border-stone-100 dark:border-stone-700">
                修改个人资料与每日目标
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">更换头像</label>
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      onClick={() => setEditAvatar(av)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 ${
                        editAvatar === av
                          ? 'bg-amber-100 dark:bg-amber-950 ring-2 ring-amber-500'
                          : 'bg-stone-100 dark:bg-stone-800'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">昵称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">
                  每日造句目标 (句/天)
                </label>
                <div className="flex items-center space-x-2">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEditGoal(num)}
                      className={`flex-1 py-1 rounded-lg text-xs font-medium border ${
                        editGoal === num
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600'
                      }`}
                    >
                      {num}句
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存修改</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

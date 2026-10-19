import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  getAllUsers,
  loginUser,
  registerUser,
  setActiveUserId,
  AVATAR_OPTIONS,
} from '../utils/auth';
import { UserAccount } from '../types/user';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'register' | 'switch';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'switch'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🚀');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const users = getAllUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = loginUser(email, password);
    if (!res.success) {
      setErrorMessage(res.error || '登录失败');
      return;
    }
    if (res.user) {
      onAuthSuccess(res.user);
      onClose();
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = registerUser(email, name, password, selectedAvatar);
    if (!res.success) {
      setErrorMessage(res.error || '注册失败');
      return;
    }
    if (res.user) {
      onAuthSuccess(res.user);
      onClose();
    }
  };

  const handleQuickSwitch = (u: UserAccount) => {
    setActiveUserId(u.id);
    onAuthSuccess(u);
    onClose();
  };

  const handleFillDemo = () => {
    setEmail('learner@nativeflow.app');
    setPassword('demo123');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden relative">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/15 hover:bg-black/30 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-amber-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NativeFlow 个人账户</span>
          </div>
          <h2 className="text-xl font-bold font-serif">
            {mode === 'login' && '登录您的学习账号'}
            {mode === 'register' && '开启地道英语进阶之旅'}
            {mode === 'switch' && '切换或管理本地账号'}
          </h2>
          <p className="text-xs text-amber-100/90 mt-1">
            独立保存您的生词库、AI 造句润色记录与艾宾浩斯复习节奏
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-1.5">
          <button
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>账号登录</span>
          </button>

          <button
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新用户注册</span>
          </button>

          {users.length > 0 && (
            <button
              onClick={() => {
                setMode('switch');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                mode === 'switch'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>多账号切换</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <span className="font-bold">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode 1: Login */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  注册邮箱 (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="learner@nativeflow.app"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  密码 (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入您的登录密码"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>立即登录</span>
              </button>

              <div className="pt-2 flex items-center justify-between text-xs text-stone-500">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-amber-600 hover:underline font-medium cursor-pointer"
                >
                  ⚡ 一键填入体验账号
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="hover:underline cursor-pointer"
                >
                  还没有账号？点此注册
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Register */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  选择您的个性头像
                </label>
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform shrink-0 ${
                        selectedAvatar === av
                          ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-500 scale-110'
                          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  学习昵称 (Nickname)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如：雅思必过 / 职场进阶小王"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  登录邮箱 (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@domain.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  设置密码 (至少 4 位)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="设置您的账号密码"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>立即创建学习账号</span>
              </button>
            </form>
          )}

          {/* Mode 3: Quick Switch */}
          {mode === 'switch' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 mb-2">
                点击下方账号快速切换，不同账号词库与复习数据互不干扰：
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleQuickSwitch(u)}
                    className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 flex items-center justify-between text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                        {u.avatar || '🦊'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {u.name}
                        </div>
                        <div className="text-xs text-stone-400">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono">
                        {(u.cards || []).length} 词
                      </span>
                      <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-full py-2.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ 添加并注册新账号</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

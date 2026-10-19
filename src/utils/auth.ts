import { UserAccount } from '../types/user';
import { ExpressionCard } from '../types/card';
import { INITIAL_CARDS } from '../data/initialCards';

const USERS_STORAGE_KEY = 'nativeflow_users_v2';
const ACTIVE_USER_ID_KEY = 'nativeflow_active_uid_v2';
const LEGACY_CARDS_KEY = 'linguacraft_cards_v1';
const LEGACY_STREAK_KEY = 'linguacraft_streak_v1';

export const AVATAR_OPTIONS = ['🦊', '🎓', '🚀', '🌟', '💡', '🦁', '🦉', '🎨', '⚡', '☕'];

// Retrieve legacy cards if any to prevent user data loss
function getLegacyCards(): ExpressionCard[] {
  try {
    const raw = localStorage.getItem(LEGACY_CARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse legacy cards', e);
  }
  return INITIAL_CARDS;
}

function getLegacyStreak(): number {
  try {
    const raw = localStorage.getItem(LEGACY_STREAK_KEY);
    if (raw) return parseInt(raw, 10) || 3;
  } catch {
    // fallback
  }
  return 3;
}

// Default initial user for instant seamless experience
const DEFAULT_USER: UserAccount = {
  id: 'usr_default_demo',
  email: 'learner@nativeflow.app',
  name: '英语达人 (Demo)',
  avatar: '🦊',
  password: 'demo123',
  dailyGoal: 5,
  streak: getLegacyStreak(),
  createdAt: new Date().toISOString(),
  cards: getLegacyCards(),
};

export function getAllUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const initialMap = new Map(INITIAL_CARDS.map((c) => [c.id, c]));
        return parsed.map((user: UserAccount) => ({
          ...user,
          cards: (user.cards || []).map((card) => {
            const initial = initialMap.get(card.id);
            if (initial && initial.englishDefinition && !card.englishDefinition) {
              return { ...card, englishDefinition: initial.englishDefinition };
            }
            return card;
          }),
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to load users', e);
  }

  // First time initialization
  const initialUsers = [DEFAULT_USER];
  saveAllUsers(initialUsers);
  return initialUsers;
}

export function saveAllUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getActiveUserId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_USER_ID_KEY) || DEFAULT_USER.id;
  } catch {
    return DEFAULT_USER.id;
  }
}

export function setActiveUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
    } else {
      localStorage.removeItem(ACTIVE_USER_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to set active user id', e);
  }
}

export function getCurrentUser(): UserAccount | null {
  const activeId = getActiveUserId();
  if (!activeId) return null;
  const users = getAllUsers();
  return users.find((u) => u.id === activeId) || null;
}

export function registerUser(email: string, name: string, password: string, avatar: string = '🚀'): { success: boolean; error?: string; user?: UserAccount } {
  const users = getAllUsers();
  const trimmedEmail = email.trim().toLowerCase();
  
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: '请输入有效的邮箱地址' };
  }
  if (!name.trim()) {
    return { success: false, error: '请输入您的昵称' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: '密码长度至少需 4 位字符' };
  }

  const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);
  if (existing) {
    return { success: false, error: '该邮箱已被注册，请直接登录' };
  }

  const newUser: UserAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: trimmedEmail,
    name: name.trim(),
    avatar,
    password,
    dailyGoal: 5,
    streak: 1,
    createdAt: new Date().toISOString(),
    cards: INITIAL_CARDS, // start with curated starter deck
  };

  const updatedUsers = [...users, newUser];
  saveAllUsers(updatedUsers);
  setActiveUserId(newUser.id);
  return { success: true, user: newUser };
}

export function loginUser(email: string, password: string): { success: boolean; error?: string; user?: UserAccount } {
  const users = getAllUsers();
  const trimmedEmail = email.trim().toLowerCase();

  const user = users.find((u) => u.email.toLowerCase() === trimmedEmail);
  if (!user) {
    return { success: false, error: '该邮箱尚未注册，请先注册账号' };
  }

  if (user.password !== password) {
    return { success: false, error: '密码错误，请重新输入' };
  }

  setActiveUserId(user.id);
  return { success: true, user };
}

export function logoutUser(): void {
  setActiveUserId(null);
}

export function updateUserProfile(userId: string, updates: Partial<Pick<UserAccount, 'name' | 'avatar' | 'dailyGoal'>>): UserAccount | null {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updates,
  };
  saveAllUsers(users);
  return users[index];
}

export function saveUserCardsAndStreak(userId: string, cards: ExpressionCard[], streak: number): void {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return;

  users[index] = {
    ...users[index],
    cards,
    streak,
  };
  saveAllUsers(users);
}

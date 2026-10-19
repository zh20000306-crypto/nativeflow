import { ExpressionCard } from './card';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  avatar: string; // e.g. "🦊", "🎓", "🚀", "🌟"
  password: string; // stored credentials for authentication
  dailyGoal: number; // target sentences per day (e.g. 3, 5, 10)
  streak: number;
  lastActiveDate?: string;
  createdAt: string;
  cards: ExpressionCard[];
}

export interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
}

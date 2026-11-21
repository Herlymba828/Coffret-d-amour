export type UserRole = 'owner' | 'partner';

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  welcomePhrase: string;
}

export interface Album {
  id: string;
  title: string;
  year: number | null;
  theme: string | null;
  coverMediaId: string | null;
  pinnedMediaId: string | null;
  mediaCount?: number;
  createdAt: string;
}

export interface Media {
  id: string;
  albumId: string | null;
  uploadedBy: string;
  mimeType: string;
  filename: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  readUrl: string | null;
  isPinned: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  type: 'text' | 'voice' | 'image' | 'video' | 'game_invite' | 'ephemeral';
  mediaUrl: string | null;
  isEphemeral: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface LovePhrase {
  id: number;
  content: string;
  isDefault: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ============================================================
// Outils & Fonctionnalités Couple du XXIe siècle
// ============================================================

export interface Voucher {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'romantic' | 'service' | 'fun' | 'naughty' | 'peace';
  issuedTo: string | null;
  isUsed: boolean;
  usedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateVoucherInput {
  title: string;
  description: string;
  icon?: string;
  category?: 'romantic' | 'service' | 'fun' | 'naughty' | 'peace';
}

export interface PartnerPreference {
  id: string;
  userId: string;
  category: 'drink' | 'sizes' | 'favorites' | 'allergies' | 'comfort' | 'wishlist' | 'custom';
  keyName: string;
  valueText: string;
  updatedAt: string;
}

export interface BucketItem {
  id: string;
  title: string;
  category: 'voyage' | 'aventure' | 'romantique' | 'quotidien' | 'gourmand';
  isCompleted: boolean;
  completedAt: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateBucketItemInput {
  title: string;
  category?: 'voyage' | 'aventure' | 'romantique' | 'quotidien' | 'gourmand';
  note?: string;
}

export interface DateIdea {
  id: string;
  title: string;
  category: 'resto' | 'activite' | 'cocooning' | 'insolite' | 'culture';
  description: string;
  durationMinutes: number;
  budgetLevel: 1 | 2 | 3;
}

export interface DateSpark {
  id: string;
  question: string;
  category: 'memoire' | 'intime' | 'futur' | 'drole' | 'philosophie';
}

export interface HeartCheckin {
  id: string;
  userId: string;
  userDisplayName?: string;
  energyLevel: number;
  affectionNeed: number;
  weekHappiness: number;
  favoriteMoment: string;
  weekDate: string;
  createdAt: string;
}

export interface CreateHeartCheckinInput {
  energyLevel: number;
  affectionNeed: number;
  weekHappiness: number;
  favoriteMoment: string;
}

export const NAV_TABS = [
  { id: 'gallery', label: 'Galerie', path: '/gallery' },
  { id: 'timeline', label: 'Timeline', path: '/timeline' },
  { id: 'poems', label: 'Poèmes', path: '/poems' },
  { id: 'tools', label: 'Outils', path: '/tools' },
  { id: 'chat', label: 'Chat', path: '/chat' },
] as const;


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

export const NAV_TABS = [
  { id: 'gallery', label: 'Galerie', path: '/gallery' },
  { id: 'timeline', label: 'Timeline', path: '/timeline' },
  { id: 'poems', label: 'Poèmes', path: '/poems' },
  { id: 'tools', label: 'Outils', path: '/tools' },
  { id: 'chat', label: 'Chat', path: '/chat' },
] as const;

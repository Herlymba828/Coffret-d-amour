import type {
  Album,
  AuthResponse,
  BucketItem,
  CreateBucketItemInput,
  CreateHeartCheckinInput,
  CreateVoucherInput,
  DateIdea,
  DateSpark,
  HeartCheckin,
  LovePhrase,
  Media,
  Message,
  PartnerPreference,
  User,
  Voucher,
} from '@coffret/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

/** Renvoie le nouvel access token, ou null si la session est définitivement perdue. */
type RefreshHandler = () => Promise<string | null>;

export class ApiClient {
  private token: string | null = null;
  private refreshHandler: RefreshHandler | null = null;
  private pendingRefresh: Promise<string | null> | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  /** Branché par le store d'auth : évite un import circulaire. */
  setRefreshHandler(handler: RefreshHandler | null) {
    this.refreshHandler = handler;
  }

  private async refreshOnce(): Promise<string | null> {
    if (!this.refreshHandler) return null;
    // Plusieurs requêtes peuvent recevoir un 401 en même temps : un seul refresh.
    this.pendingRefresh ??= this.refreshHandler().finally(() => {
      this.pendingRefresh = null;
    });
    return this.pendingRefresh;
  }

  private async request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401 && allowRetry && this.refreshHandler) {
      const token = await this.refreshOnce();
      if (token) {
        this.token = token;
        return this.request<T>(path, options, false);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(err.error?.message ?? 'Erreur API');
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  login(sharedCode: string, password: string, asRole?: 'owner' | 'partner') {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ sharedCode, password, asRole }),
    });
  }

  /** Volontairement hors du cycle de retry : un 401 ici est définitif. */
  refresh(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      false,
    );
  }

  getMe() {
    return this.request<User>('/auth/me');
  }

  getAlbums() {
    return this.request<Album[]>('/albums');
  }

  createAlbum(data: { title: string; year?: number; theme?: string }) {
    return this.request<Album>('/albums', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getAlbum(id: string) {
    return this.request<Album & { media: Media[] }>(`/albums/${id}`);
  }

  presignUpload(data: { filename: string; mimeType: string; albumId?: string }) {
    return this.request<{ mediaId: string; uploadUrl: string; expiresIn: number }>('/media/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  confirmUpload(mediaId: string) {
    return this.request<Media>(`/media/${mediaId}/confirm`, { method: 'POST' });
  }

  getMessages(params: { limit?: number; before?: string } = {}) {
    const search = new URLSearchParams();
    if (params.limit) search.set('limit', String(params.limit));
    if (params.before) search.set('before', params.before);
    const qs = search.toString();
    return this.request<Message[]>(`/chat/messages${qs ? `?${qs}` : ''}`);
  }

  sendMessage(content: string) {
    return this.request<Message>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  getUnreadCount() {
    return this.request<{ count: number }>('/chat/unread-count');
  }

  getPhrases() {
    return this.request<LovePhrase[]>('/chat/phrases');
  }

  markMessageRead(messageId: string) {
    return this.request<Message>(`/chat/messages/${messageId}/read`, { method: 'PATCH' });
  }

  // ============================================================
  // Outils & Fonctionnalités Couple du XXIe siècle
  // ============================================================

  getVouchers() {
    return this.request<Voucher[]>('/tools/vouchers');
  }

  createVoucher(data: CreateVoucherInput) {
    return this.request<Voucher>('/tools/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  redeemVoucher(id: string) {
    return this.request<Voucher>(`/tools/vouchers/${id}/redeem`, {
      method: 'POST',
    });
  }

  getPreferences() {
    return this.request<PartnerPreference[]>('/tools/preferences');
  }

  updatePreference(data: { category: string; keyName: string; valueText: string; userId?: string }) {
    return this.request<PartnerPreference>('/tools/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deletePreference(id: string) {
    return this.request<void>(`/tools/preferences/${id}`, {
      method: 'DELETE',
    });
  }

  getBucketList() {
    return this.request<BucketItem[]>('/tools/bucket-list');
  }

  createBucketItem(data: CreateBucketItemInput) {
    return this.request<BucketItem>('/tools/bucket-list', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  toggleBucketItem(id: string) {
    return this.request<BucketItem>(`/tools/bucket-list/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  deleteBucketItem(id: string) {
    return this.request<void>(`/tools/bucket-list/${id}`, {
      method: 'DELETE',
    });
  }

  getDateIdeas() {
    return this.request<DateIdea[]>('/tools/date-ideas');
  }

  getRandomSparks(count = 1) {
    return this.request<DateSpark[]>(`/tools/sparks/random?count=${count}`);
  }

  getHeartCheckins() {
    return this.request<HeartCheckin[]>('/tools/checkins');
  }

  createHeartCheckin(data: CreateHeartCheckinInput) {
    return this.request<HeartCheckin>('/tools/checkins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();


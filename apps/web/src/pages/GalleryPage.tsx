import { useEffect, useRef, useState } from 'react';
import { Plus, Pin } from 'lucide-react';
import type { Album, Media } from '@coffret/shared';
import { api } from '../lib/api';

export default function GalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadAlbumId, setUploadAlbumId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Incrémenté après chaque upload : force les cartes ouvertes à recharger leurs médias.
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAlbums = () => {
    api.getAlbums().then(setAlbums).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadAlbums(); }, []);

  const createAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await api.createAlbum({ title: newTitle.trim() });
    setNewTitle('');
    setShowNewAlbum(false);
    loadAlbums();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, albumId: string) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const { mediaId, uploadUrl } = await api.presignUpload({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        albumId,
      });

      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      // Un PUT S3 raté renvoie un 4xx/5xx sans lever : sans ce test, on
      // « confirmait » un fichier absent.
      if (!upload.ok) throw new Error(`Envoi refusé par le stockage (${upload.status})`);

      await api.confirmUpload(mediaId);
      setRefreshKey((k) => k + 1);
      loadAlbums();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : "L'envoi a échoué");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-500">Chargement…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-copper-gold">Galerie</h1>
        <button onClick={() => setShowNewAlbum(true)} className="btn-secondary flex items-center gap-2 py-2 text-sm">
          <Plus size={18} /> Album
        </button>
      </div>

      {showNewAlbum && (
        <form onSubmit={createAlbum} className="card mb-6 flex gap-2 p-4">
          <input
            className="input-field flex-1"
            placeholder="Nom de l'album"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary py-2">Créer</button>
          <button type="button" onClick={() => setShowNewAlbum(false)} className="btn-secondary py-2">Annuler</button>
        </form>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => uploadAlbumId && handleUpload(e, uploadAlbumId)}
      />

      {uploading && <p className="mb-4 text-sm text-copper-gold">Envoi en cours…</p>}
      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {albums.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-600">Aucun album pour l'instant.</p>
          <button onClick={() => setShowNewAlbum(true)} className="btn-primary mt-4">Créer le premier album</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              refreshKey={refreshKey}
              onUpload={() => {
                setUploadAlbumId(album.id);
                fileRef.current?.click();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumCard({
  album,
  refreshKey,
  onUpload,
}: {
  album: Album;
  refreshKey: number;
  onUpload: () => void;
}) {
  const [media, setMedia] = useState<Media[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      api.getAlbum(album.id).then((a) => setMedia(a.media)).catch(console.error);
    }
  }, [expanded, album.id, refreshKey]);

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">{album.title}</h2>
            <p className="text-sm text-gray-500">
              {[album.year, album.theme].filter(Boolean).join(' · ') || 'Sans catégorie'}
              {album.mediaCount != null && ` · ${album.mediaCount} photo${album.mediaCount > 1 ? 's' : ''}`}
            </p>
          </div>
          {album.pinnedMediaId && <Pin size={16} className="text-copper-gold" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-copper-gold/20 p-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {media.map((m) => {
              // La vignette fait ~40 Ko contre 3 à 5 Mo pour l'original ;
              // on ne retombe sur l'original que si elle manque.
              const src = m.thumbnailUrl ?? m.readUrl;
              return src ? (
                <img
                  key={m.id}
                  src={src}
                  alt={m.caption ?? ''}
                  width={m.width ?? undefined}
                  height={m.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : (
                <div key={m.id} className="aspect-square rounded-lg bg-powder-rose/40" />
              );
            })}
          </div>
          <button onClick={onUpload} className="btn-secondary w-full py-2 text-sm">
            <Plus size={16} className="mr-1 inline" /> Ajouter une photo
          </button>
        </div>
      )}
    </div>
  );
}

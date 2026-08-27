import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuthStore();
  const [sharedCode, setSharedCode] = useState('');
  const [password, setPassword] = useState('');
  const [asRole, setAsRole] = useState<'owner' | 'partner'>('partner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/gallery" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(sharedCode, password, asRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-cream via-powder-rose/30 to-cream px-4">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute animate-pulse text-2xl"
            style={{
              left: `${(i * 17 + 5) % 90}%`,
              top: `${(i * 23 + 10) % 80}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            💕
          </span>
        ))}
      </div>

      <div className="card relative z-10 w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-bold text-copper-gold">Coffret d'Amour</h1>
        <p className="mt-2 text-sm text-gray-600">Notre écrin numérique privé</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code partagé</label>
            <input
              className="input-field"
              placeholder="ex. 14-02-2020-Marie"
              value={sharedCode}
              onChange={(e) => setSharedCode(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Se connecter en tant que</label>
            <select
              className="input-field"
              value={asRole}
              onChange={(e) => setAsRole(e.target.value as 'owner' | 'partner')}
            >
              <option value="partner">Marie (partenaire)</option>
              <option value="owner">Toi (propriétaire)</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Entrer dans le coffret'}
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Lock size={14} />
          Ici, tout reste entre nous
        </p>
      </div>
    </div>
  );
}

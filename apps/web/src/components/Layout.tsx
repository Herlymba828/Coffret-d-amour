import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import BottomNav from './BottomNav';

export default function Layout() {
  const { isAuthenticated, welcomePhrase, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <header className="border-b border-copper-gold/20 bg-cream/80 px-6 py-4 backdrop-blur-sm">
        <p className="font-display text-sm text-copper-gold">
          Bonjour, {user?.displayName} 💕
        </p>
        {welcomePhrase && (
          <p className="mt-1 text-sm italic text-gray-600">{welcomePhrase}</p>
        )}
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

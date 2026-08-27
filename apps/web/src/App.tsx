import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Découpage par route : seule la page ouverte est téléchargée. La galerie et le
// chat n'ont plus à attendre le code des pages encore à l'état d'ébauche.
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const PoemsPage = lazy(() => import('./pages/PoemsPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

function PageFallback() {
  return <p className="py-12 text-center text-sm text-gray-400">Chargement…</p>;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/poems" element={<PoemsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/gallery" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

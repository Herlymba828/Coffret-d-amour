import { NavLink } from 'react-router-dom';
import { Images, CalendarHeart, Feather, Sparkles, MessageCircleHeart } from 'lucide-react';
import { NAV_TABS } from '@coffret/shared';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const icons: Record<string, React.ReactNode> = {
  gallery: <Images size={22} />,
  timeline: <CalendarHeart size={22} />,
  poems: <Feather size={22} />,
  tools: <Sparkles size={22} />,
  chat: <MessageCircleHeart size={22} />,
};

export default function BottomNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getUnreadCount().then((r) => setUnread(r.count)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount().then((r) => setUnread(r.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50">
      <div className="mx-auto flex max-w-lg items-center justify-around rounded-3xl border border-copper-gold/30 bg-cream/95 px-2 py-2 shadow-soft backdrop-blur-md">
        {NAV_TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-xs transition ${
                isActive ? 'text-copper-gold' : 'text-gray-500 hover:text-copper-gold/70'
              }`
            }
          >
            {icons[tab.id]}
            <span>{tab.label}</span>
            {tab.id === 'chat' && unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-powder-rose text-[10px] font-bold text-gray-800">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

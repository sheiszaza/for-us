import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarHeart, Heart, Home, Mail, MessageCircle, Settings, Sparkles } from 'lucide-react';
import { FloatingHearts } from './FloatingHearts';
import { InstallPrompt } from './InstallPrompt';

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/messages', label: 'Chat', icon: MessageCircle },
  { to: '/memories', label: 'Memories', icon: Heart },
  { to: '/letters', label: 'Letters', icon: Mail },
  { to: '/countdowns', label: 'Dates', icon: CalendarHeart },
  { to: '/date-ideas', label: 'Ideas', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div>
      <FloatingHearts />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-[max(1rem,var(--safe-top))] sm:px-6">
        {children}
      </main>
      <InstallPrompt />
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl px-3 pb-safe">
        <div className="glass-card no-scrollbar mx-auto flex gap-1 overflow-x-auto rounded-[2rem] p-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-3xl px-3 py-2 text-[0.68rem] font-bold transition ${
                  isActive ? 'bg-theme text-white shadow-lg shadow-theme' : 'text-theme'
                }`
              }
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

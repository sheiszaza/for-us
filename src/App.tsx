import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { NicknameProvider } from './context/NicknameContext';
import { RoleProvider } from './context/RoleContext';
import { ThemeProvider } from './context/ThemeContext';
import { RoleGate } from './components/RoleGate';
import { AppShell } from './components/AppShell';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Messages = lazy(() => import('./pages/Messages').then((module) => ({ default: module.Messages })));
const Memories = lazy(() => import('./pages/Memories').then((module) => ({ default: module.Memories })));
const Letters = lazy(() => import('./pages/Letters').then((module) => ({ default: module.Letters })));
const Countdowns = lazy(() => import('./pages/Countdowns').then((module) => ({ default: module.Countdowns })));
const DateIdeas = lazy(() => import('./pages/DateIdeas').then((module) => ({ default: module.DateIdeas })));
const Games = lazy(() => import('./pages/Games').then((module) => ({ default: module.Games })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));

function PageLoader() {
  return (
    <div className="glass-card rounded-[2rem] p-6 text-center">
      <div className="mx-auto mb-4 size-10 animate-pulse rounded-full bg-rose-200" />
      <p className="text-sm font-bold text-rose-700">Loading something lovely...</p>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/letters" element={<Letters />} />
          <Route path="/countdowns" element={<Countdowns />} />
          <Route path="/date-ideas" element={<DateIdeas />} />
          <Route path="/games" element={<Games />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NicknameProvider>
        <RoleProvider>
          <ThemeProvider>
            <BrowserRouter>
              <RoleGate>
                <AppShell>
                  <AnimatedRoutes />
                </AppShell>
              </RoleGate>
            </BrowserRouter>
          </ThemeProvider>
        </RoleProvider>
      </NicknameProvider>
    </AuthProvider>
  );
}

import { memo, useCallback, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import {
  CalendarHeart,
  ChevronDown,
  Gamepad2,
  Heart,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
} from "lucide-react";
// import { FloatingHearts } from "./FloatingHearts";
import { InstallPrompt } from "./InstallPrompt";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/messages", label: "Chat", icon: MessageCircle },
  { to: "/memories", label: "Memories", icon: Heart },
  { to: "/letters", label: "Letters", icon: Mail },
  { to: "/countdowns", label: "Dates", icon: CalendarHeart },
  { to: "/date-ideas", label: "Ideas", icon: Sparkles },
  { to: "/location", label: "Map", icon: MapPin },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

type BottomNavToggleProps = {
  onToggle: () => void;
};

const navVariants = {
  hidden: { y: 120, opacity: 0, scale: 0.96 },
  visible: { y: 0, opacity: 1, scale: 1 },
};

const HiddenBottomNavToggle = memo(function HiddenBottomNavToggle({
  onToggle,
}: BottomNavToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-label="Show bottom navigation"
      aria-expanded={false}
      className="fixed bottom-[max(1rem,var(--safe-bottom))] right-4 z-50 grid size-12 place-items-center rounded-full border border-white/80 bg-white/85 text-theme shadow-xl shadow-rose-200/60 backdrop-blur-xl transition-colors hover:bg-white active:bg-rose-50"
      initial={{ y: 16, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 16, opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <Menu className="size-5" />
    </motion.button>
  );
});

export function AppShell({ children }: AppShellProps) {
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);

  const handleToggleBottomNav = useCallback(() => {
    setIsBottomNavVisible((currentValue) => !currentValue);
  }, []);

  return (
    <div>
      {/* <FloatingHearts /> */}
      <main
        className={`mx-auto w-full max-w-3xl px-4 pt-[max(1rem,var(--safe-top))] transition-[padding-bottom] duration-300 sm:px-6 ${
          isBottomNavVisible ? "pb-28" : "pb-20"
        }`}
      >
        {children}
      </main>
      <InstallPrompt />
      <AnimatePresence>
        {!isBottomNavVisible && (
          <HiddenBottomNavToggle onToggle={handleToggleBottomNav} />
        )}
        {isBottomNavVisible && (
          <motion.nav
            className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl px-3 pb-safe"
            variants={navVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
          >
            <div className="glass-card mx-auto flex items-center gap-1 rounded-[2rem] p-2">
              <motion.button
                type="button"
                onClick={handleToggleBottomNav}
                aria-label="Hide bottom navigation"
                aria-expanded={true}
                className="grid size-12 shrink-0 place-items-center rounded-3xl bg-rose-50 text-theme transition-colors hover:bg-rose-100 active:bg-rose-200"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
              >
                <ChevronDown className="size-5" />
              </motion.button>
              <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      `flex min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-3xl px-3 py-2 text-[0.68rem] font-bold transition ${
                        isActive
                          ? "bg-theme text-white shadow-lg shadow-theme"
                          : "text-theme"
                      }`
                    }
                  >
                    <Icon className="size-5" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

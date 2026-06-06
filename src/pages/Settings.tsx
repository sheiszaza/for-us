import { useCallback, useState, type FormEvent } from 'react';
import { Check, Heart, LogOut, Palette, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRole } from '../context/RoleContext';
import { themes, useTheme, type ThemeName } from '../context/ThemeContext';
import { getRoleLabel, setStoredPin } from '../lib/roles';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Page } from '../components/Page';

const themeColors: Record<ThemeName, string> = {
  rose: 'bg-rose-500',
  lavender: 'bg-violet-500',
  ocean: 'bg-cyan-500',
  sunset: 'bg-orange-500',
};

export function Settings() {
  const { role, logout } = useRole();
  const { theme, setTheme } = useTheme();
  const [newPin, setNewPin] = useState('');

  const handleChangePin = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || newPin.trim().length < 4) {
        toast.error('Use at least 4 digits.');
        return;
      }

      setStoredPin(role, newPin.trim());
      setNewPin('');
      toast.success('PIN updated on this device.');
    },
    [newPin, role],
  );

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Locked the app.');
  }, [logout]);

  return (
    <Page eyebrow="Private controls" title="Settings" description="Personalize your theme, update your PIN, and make the app feel yours.">
      <Card>
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-500">
            <Heart className="size-6 fill-current" />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-500">Current role</p>
            <h2 className="text-2xl font-black text-rose-950">{role ? getRoleLabel(role) : 'Not selected'}</h2>
            <p className="mt-2 text-sm leading-6 text-rose-700/75">This is stored locally on this device for quick reopening from the iPhone Home Screen.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Shield className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Change PIN</h2>
        </div>
        <form onSubmit={handleChangePin} className="grid gap-4">
          <Field label={`New PIN for ${role ? getRoleLabel(role) : 'current role'}`} type="password" inputMode="numeric" value={newPin} onChange={(event) => setNewPin(event.target.value)} placeholder="At least 4 digits" />
          <Button type="submit">Save PIN</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Palette className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Theme</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(themes) as ThemeName[]).map((themeName) => (
            <button
              key={themeName}
              onClick={() => {
                setTheme(themeName);
                toast.success(`Switched to ${themes[themeName].label} theme.`);
              }}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition ${
                theme === themeName ? 'border-rose-400 bg-white/80' : 'border-transparent bg-white/50'
              }`}
            >
              <div className={`grid size-10 place-items-center rounded-xl ${themeColors[themeName]} text-white`}>
                {theme === themeName ? <Check className="size-5" /> : null}
              </div>
              <span className="text-sm font-bold text-rose-950">{themes[themeName].label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Button variant="danger" onClick={handleLogout}>
        <LogOut className="size-4" />
        Logout and lock app
      </Button>
    </Page>
  );
}

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Heart, LogOut, Palette, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNicknames } from '../context/NicknameContext';
import { usePins } from '../context/PinContext';
import { useRole } from '../context/RoleContext';
import { themes, useTheme, type ThemeName } from '../context/ThemeContext';
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
  const { getNickname, setNickname } = useNicknames();
  const { setPin } = usePins();
  const [newPin, setNewPin] = useState('');
  const [nickname, setNicknameValue] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (role) {
      setNicknameValue(getNickname(role));
    }
  }, [role, getNickname]);

  const handleSaveNickname = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role) return;

      setSavingNickname(true);
      try {
        await setNickname(role, nickname);
        toast.success('Nickname saved.');
      } catch (error) {
        console.error('Nickname save error:', error);
        toast.error(error instanceof Error ? error.message : 'Could not save nickname.');
      } finally {
        setSavingNickname(false);
      }
    },
    [nickname, role, setNickname],
  );

  const handleChangePin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || newPin.trim().length < 4) {
        toast.error('Use at least 4 digits.');
        return;
      }

      setSavingPin(true);
      try {
        await setPin(role, newPin.trim());
        setNewPin('');
        toast.success('PIN updated everywhere.');
      } catch (error) {
        console.error('PIN save error:', error);
        toast.error(error instanceof Error ? error.message : 'Could not save PIN.');
      } finally {
        setSavingPin(false);
      }
    },
    [newPin, role, setPin],
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
            <h2 className="text-2xl font-black text-rose-950">{role ? getNickname(role) : 'Not selected'}</h2>
            <p className="mt-2 text-sm leading-6 text-rose-700/75">This is stored locally on this device for quick reopening from the iPhone Home Screen.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <User className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Your Nickname</h2>
        </div>
        <form onSubmit={handleSaveNickname} className="grid gap-4">
          <Field
            label="What should we call you?"
            value={nickname}
            onChange={(event) => setNicknameValue(event.target.value)}
            placeholder="Enter your nickname"
          />
          <Button type="submit" disabled={savingNickname}>
            {savingNickname ? 'Saving...' : 'Save Nickname'}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Shield className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Change PIN</h2>
        </div>
        <form onSubmit={handleChangePin} className="grid gap-4">
          <Field
            label={`New PIN for ${role ? getNickname(role) : 'current role'}`}
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
            placeholder="At least 4 digits"
          />
          <Button type="submit" disabled={savingPin}>
            {savingPin ? 'Saving...' : 'Save PIN'}
          </Button>
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

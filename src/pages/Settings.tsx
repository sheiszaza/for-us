import { useCallback, useState, type FormEvent } from 'react';
import { Heart, LogOut, Palette, Shield, UserRoundCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRole } from '../context/RoleContext';
import { DEFAULT_PINS, getRoleLabel, setStoredPin, verifyPin } from '../lib/roles';
import type { Role } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Page } from '../components/Page';

export function Settings() {
  const { role, selectRole, logout } = useRole();
  const [switchRole, setSwitchRole] = useState<Role>(role === 'her' ? 'me' : 'her');
  const [switchPin, setSwitchPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleSwitchRole = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!verifyPin(switchRole, switchPin)) {
        toast.error('PIN does not match that role.');
        return;
      }

      selectRole(switchRole);
      setSwitchPin('');
      toast.success(`Switched to ${getRoleLabel(switchRole)}.`);
    },
    [selectRole, switchPin, switchRole],
  );

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
    <Page eyebrow="Private controls" title="Settings" description="Switch roles, update your local PIN, and keep the app feeling personal.">
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
          <UserRoundCog className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Change role</h2>
        </div>
        <form onSubmit={handleSwitchRole} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-rose-800">
            <span>Role</span>
            <select
              value={switchRole}
              onChange={(event) => setSwitchRole(event.target.value as Role)}
              className="w-full rounded-3xl border border-rose-100 bg-white/75 px-4 py-3 text-rose-950 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
            >
              <option value="me">{getRoleLabel('me')}</option>
              <option value="her">{getRoleLabel('her')}</option>
            </select>
          </label>
          <Field label="PIN" type="password" inputMode="numeric" value={switchPin} onChange={(event) => setSwitchPin(event.target.value)} placeholder="Enter role PIN" />
          <Button type="submit">Switch role</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Shield className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Change PIN</h2>
        </div>
        <form onSubmit={handleChangePin} className="grid gap-4">
          <Field label={`New PIN for ${role ? getRoleLabel(role) : 'current role'}`} type="password" inputMode="numeric" value={newPin} onChange={(event) => setNewPin(event.target.value)} placeholder="At least 4 digits" />
          <p className="text-xs leading-5 text-rose-600/75">
            Defaults are {getRoleLabel('me')} = {DEFAULT_PINS.me} and {getRoleLabel('her')} = {DEFAULT_PINS.her}. Changed PINs are stored locally on this device.
          </p>
          <Button type="submit">Save PIN</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <Palette className="size-5 text-rose-500" />
          <h2 className="text-xl font-black text-rose-950">Theme</h2>
        </div>
        <p className="text-sm leading-6 text-rose-700/75">Soft rose theme is active. This section is ready for future theme options like cream, night rose, and anniversary mode.</p>
      </Card>

      <Button variant="danger" onClick={handleLogout}>
        <LogOut className="size-4" />
        Logout and lock app
      </Button>
    </Page>
  );
}

import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LockKeyhole, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { ROLE_ACCENTS, ROLE_LABELS, verifyPin } from '../lib/roles';
import type { Role } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Field } from './Field';

type RoleGateProps = {
  children: ReactNode;
};

const roles: Role[] = ['me', 'her'];

export function RoleGate({ children }: RoleGateProps) {
  const { user, loading, error } = useAuth();
  const { role, selectRole } = useRole();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleSelectMe = useCallback(() => setSelectedRole('me'), []);
  const handleSelectHer = useCallback(() => setSelectedRole('her'), []);
  const handleBack = useCallback(() => {
    setSelectedRole(null);
    setPin('');
    setPinError(null);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedRole) {
        return;
      }

      if (!verifyPin(selectedRole, pin)) {
        setPinError('That PIN is not right yet.');
        return;
      }

      selectRole(selectedRole);
      toast.success(`Welcome back, ${ROLE_LABELS[selectedRole]}.`);
    },
    [pin, selectRole, selectedRole],
  );

  if (loading) {
    return (
      <div className="safe-screen grid place-items-center px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-rose-100 text-rose-500">
            <Sparkles className="size-7 animate-pulse" />
          </div>
          <p className="font-semibold text-rose-900">Preparing your little world...</p>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="safe-screen grid place-items-center px-4">
        <Card className="w-full max-w-sm text-center">
          <LockKeyhole className="mx-auto mb-3 size-9 text-rose-500" />
          <h1 className="text-2xl font-black text-rose-950">Could not unlock the app</h1>
          <p className="mt-3 text-sm leading-6 text-rose-700/80">{error ?? 'Firebase authentication is unavailable.'}</p>
        </Card>
      </div>
    );
  }

  if (role) {
    return <>{children}</>;
  }

  return (
    <div className="safe-screen grid place-items-center px-4">
      <Card className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-300/40">
            <Heart className="size-8 fill-current" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-rose-400">Private</p>
          <h1 className="mt-2 text-4xl font-black text-rose-950">For Us</h1>
          <p className="mt-3 text-sm leading-6 text-rose-700/75">A tiny romantic place made for only two people.</p>
        </div>

        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div
              key="roles"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="grid gap-3"
            >
              <Button className={`h-16 bg-gradient-to-r ${ROLE_ACCENTS.me}`} onClick={handleSelectMe}>
                Continue as {ROLE_LABELS.me}
              </Button>
              <Button className={`h-16 bg-gradient-to-r ${ROLE_ACCENTS.her}`} onClick={handleSelectHer}>
                Continue as {ROLE_LABELS.her}
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="pin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              <Field
                label={`PIN for ${ROLE_LABELS[selectedRole]}`}
                type="password"
                inputMode="numeric"
                value={pin}
                autoFocus
                placeholder="Enter PIN"
                onChange={(event) => {
                  setPin(event.target.value);
                  setPinError(null);
                }}
              />
              {pinError ? <p className="text-sm font-semibold text-rose-600">{pinError}</p> : null}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit">Unlock</Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

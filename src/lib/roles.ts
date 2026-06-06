import type { Role } from '../types';

const ROLE_KEY = 'for-us:role';
const PIN_PREFIX = 'for-us:pin:';

export const DEFAULT_PINS: Record<Role, string> = {
  me: '1432',
  her: '7777',
};

export const ROLE_LABELS: Record<Role, string> = {
  me: 'Him',
  her: 'Her',
};

export const ROLE_ACCENTS: Record<Role, string> = {
  me: 'from-rose-500 to-pink-500',
  her: 'from-fuchsia-500 to-rose-400',
};

const isRole = (value: string | null): value is Role => value === 'me' || value === 'her';

const storage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

export const getCurrentRole = (): Role | null => {
  const value = storage()?.getItem(ROLE_KEY) ?? null;
  return isRole(value) ? value : null;
};

export const setCurrentRole = (role: Role) => {
  storage()?.setItem(ROLE_KEY, role);
};

export const clearCurrentRole = () => {
  storage()?.removeItem(ROLE_KEY);
};

export const isMe = () => getCurrentRole() === 'me';

export const isHer = () => getCurrentRole() === 'her';

export const getRoleLabel = (role: Role) => ROLE_LABELS[role];

export const getStoredPin = (role: Role) => storage()?.getItem(`${PIN_PREFIX}${role}`) ?? DEFAULT_PINS[role];

export const setStoredPin = (role: Role, pin: string) => {
  storage()?.setItem(`${PIN_PREFIX}${role}`, pin);
};

export const verifyPin = (role: Role, pin: string) => getStoredPin(role) === pin.trim();

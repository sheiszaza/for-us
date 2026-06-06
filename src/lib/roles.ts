import type { Role } from '../types';

const ROLE_KEY = 'for-us:role';

export const DEFAULT_PINS: Record<Role, string> = {
  me: '1432',
  her: '7777',
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

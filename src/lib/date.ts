import type { Timestamp } from 'firebase/firestore';
import type { FirestoreDate } from '../types';

export const toDate = (value: FirestoreDate | null | undefined): Date => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  return (value as Timestamp).toDate();
};

export const formatShortDate = (value: FirestoreDate | string | null | undefined) => {
  const date = typeof value === 'string' ? new Date(value) : toDate(value);

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatTime = (value: FirestoreDate | null | undefined) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(value));

export const getCountdownParts = (targetDate: string) => {
  const distance = Math.max(new Date(targetDate).getTime() - Date.now(), 0);
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  return { days, hours, minutes, seconds, complete: distance === 0 };
};

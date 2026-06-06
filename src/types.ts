import type { Timestamp } from 'firebase/firestore';

export type Role = 'me' | 'her';

export type FirestoreDate = Timestamp | Date;

export type Message = {
  id: string;
  text: string;
  from: Role;
  createdAt: FirestoreDate;
  seenByMe: boolean;
  seenByHer: boolean;
};

export type Memory = {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  imagePath?: string;
  createdBy: Role;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type Letter = {
  id: string;
  title: string;
  content: string;
  createdBy: Role;
  createdAt: FirestoreDate;
};

export type Countdown = {
  id: string;
  title: string;
  targetDate: string;
  createdBy: Role;
};

export type DateIdeaStatus = 'planned' | 'upcoming' | 'completed';

export type DateIdea = {
  id: string;
  title: string;
  description: string;
  createdBy: Role;
  status: DateIdeaStatus;
};

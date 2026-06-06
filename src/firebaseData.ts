import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseApp } from './firebase';

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

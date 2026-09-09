import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Finding } from '../types';

export interface UserAlgorithmInput {
  algorithmName: string;
  algorithmFamily: string;
  keySize?: string | number;
  purpose: string;
  dataSensitivity: string;
  expectedShelfLife: number;
  migrationTime: number;
  internetExposure: boolean | string;
}

export interface StoredUserAlgorithm {
  id: string;
  userId: string;
  input: UserAlgorithmInput;
  finding: Finding;
  createdAt: string;
}

export const userAlgorithmService = {
  async saveAlgorithm(
    userId: string,
    finding: Finding,
    input: UserAlgorithmInput
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'algorithms', finding.id);
      await setDoc(docRef, {
        id: finding.id,
        userId,
        input,
        finding,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not persist algorithm to Firestore (offline/permission fallback):', err);
    }
  },

  async getAlgorithms(userId: string): Promise<Finding[]> {
    try {
      const colRef = collection(db, 'users', userId, 'algorithms');
      const snapshot = await getDocs(colRef);
      const findings: Finding[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.finding) {
          findings.push(data.finding as Finding);
        }
      });
      return findings;
    } catch (err) {
      console.warn('Could not read user algorithms from Firestore:', err);
      return [];
    }
  },

  async deleteAlgorithm(userId: string, algoId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'algorithms', algoId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Could not delete user algorithm from Firestore:', err);
    }
  },
};

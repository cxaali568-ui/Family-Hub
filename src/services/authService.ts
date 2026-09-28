import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, Role } from '../types';

class AuthService {
  /**
   * Translates Firebase error codes to user-friendly messages
   */
  private formatAuthError(error: any): string {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Unable to sign in. Please check your credentials.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 8 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      default:
        return error?.message || 'An unexpected authentication error occurred.';
    }
  }

  /**
   * Registers a new user with real Firebase Authentication and creates a user profile document in Firestore
   */
  async register(params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    profileImage?: string;
  }): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        params.email.trim(),
        params.password
      );

      const fbUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(fbUser, {
        displayName: params.fullName.trim(),
        photoURL: params.profileImage || undefined,
      });

      const now = new Date().toISOString();

      // Create User Profile in Firestore: users/{userId}
      const userProfile: User = {
        id: fbUser.uid,
        name: params.fullName.trim(),
        fullName: params.fullName.trim(),
        email: fbUser.email || params.email.trim(),
        phone: params.phone?.trim() || undefined,
        profileImage: params.profileImage || undefined,
        avatar: params.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.fullName.trim())}`,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        status: 'online',
      };

      await setDoc(doc(db, 'users', fbUser.uid), userProfile);

      return userProfile;
    } catch (error: any) {
      throw new Error(this.formatAuthError(error));
    }
  }

  /**
   * Signs in user with real Firebase Auth and updates lastLoginAt
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const fbUser = userCredential.user;
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      const now = new Date().toISOString();

      if (userSnap.exists()) {
        await updateDoc(userDocRef, {
          lastLoginAt: now,
          status: 'online',
        });
        const data = userSnap.data() as User;
        return {
          ...data,
          lastLoginAt: now,
          status: 'online',
        };
      } else {
        // Fallback create user document if absent
        const fallbackProfile: User = {
          id: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0],
          fullName: fbUser.displayName || email.split('@')[0],
          email: fbUser.email || email,
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || email)}`,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          status: 'online',
        };
        await setDoc(userDocRef, fallbackProfile);
        return fallbackProfile;
      }
    } catch (error: any) {
      throw new Error(this.formatAuthError(error));
    }
  }

  /**
   * Signs out user and marks status as offline
   */
  async logout(): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            status: 'offline',
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // Ignore offline status update if network fails
        }
      }
      await signOut(auth);
    } catch (error: any) {
      throw new Error(this.formatAuthError(error));
    }
  }

  /**
   * Sends password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      throw new Error(this.formatAuthError(error));
    }
  }

  /**
   * Fetches user profile from Firestore
   */
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return snap.data() as User;
      }
      return null;
    } catch (err) {
      console.warn("Could not fetch user profile:", err);
      return null;
    }
  }

  /**
   * Subscribes to real-time Firebase Auth state changes
   */
  onAuthStateChanged(callback: (user: User | null, loading: boolean) => void): () => void {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        callback(null, false);
        return;
      }

      try {
        const userProfile = await this.getUserProfile(fbUser.uid);
        if (userProfile) {
          callback(userProfile, false);
        } else {
          // Construct baseline profile if Firestore doc is indexing
          const baseline: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.uid)}`,
            createdAt: new Date().toISOString(),
            status: 'online',
          };
          callback(baseline, false);
        }
      } catch (err) {
        console.error("Error loading user profile on auth state change:", err);
        callback(null, false);
      }
    });
  }
}

export const authService = new AuthService();

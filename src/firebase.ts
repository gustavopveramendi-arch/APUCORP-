import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Auth Provider setup with needed scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");

// We enforce select_account so user can easily switch or authorize
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Handles Google Sign-In via Popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    if (!token) {
      throw new Error("No se pudo obtener el token de acceso de Google Sheets.");
    }
    
    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error("Error en googleSignIn:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the cached access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sign out of Firebase Auth
 */
export const googleSignOut = async (): Promise<void> => {
  try {
    await auth.signOut();
    cachedAccessToken = null;
  } catch (error: any) {
    console.error("Error en googleSignOut:", error);
    throw error;
  }
};

/**
 * Sets up auth state listener to manage cached token
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in but token is not in memory (e.g. reload), we need to sign in again to get the token
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

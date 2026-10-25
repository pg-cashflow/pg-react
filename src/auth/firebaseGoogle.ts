import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getFirebaseErrorMessage } from "@/auth/firebasePhone";

export async function signInWithGoogle(): Promise<string> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(firebaseAuth, provider);
    return await credential.user.getIdToken(true);
  } catch (err) {
    throw new Error(getFirebaseErrorMessage(err));
  }
}

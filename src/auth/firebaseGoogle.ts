import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getFirebaseErrorMessage } from "@/auth/firebasePhone";

export async function signInWithGoogle(): Promise<{ needsPhone: boolean; idToken: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(firebaseAuth, provider);
    if (!credential.user.phoneNumber) {
      return { needsPhone: true, idToken: "" };
    }
    const idToken = await credential.user.getIdToken(true);
    return { needsPhone: false, idToken };
  } catch (err) {
    throw new Error(getFirebaseErrorMessage(err));
  }
}

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC-xGKCJauxL5hlIhhlMs4nlSqSuGjGMd8',
  authDomain: 'piccolo-maxpoint.firebaseapp.com',
  projectId: 'piccolo-maxpoint',
  storageBucket: 'piccolo-maxpoint.firebasestorage.app',
  messagingSenderId: '473799249189',
  appId: '1:473799249189:web:593a93f75c0b2b146e1ecc'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let authPromise;

function ensureAnonymousSession() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authPromise) {
    authPromise = signInAnonymously(auth).then(result => result.user).catch(error => {
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}

function productId(value) {
  return String(value || '').split('|')[0];
}

window.piccoloFirebase = {
  async saveInquiry(data) {
    const user = await ensureAnonymousSession();
    const result = await addDoc(collection(db, 'inquiries'), {
      ...data,
      productId: productId(data.productValue),
      userId: user.uid,
      source: 'github-pages',
      status: 'new',
      createdAt: serverTimestamp()
    });
    return result.id;
  },

  async isAvailable(date, productValue) {
    await ensureAnonymousSession();
    const slotId = `${date}_${productId(productValue)}`;
    const snapshot = await getDoc(doc(db, 'occupiedDates', slotId));
    return !snapshot.exists();
  }
};

window.dispatchEvent(new CustomEvent('piccolo:firebase-ready'));


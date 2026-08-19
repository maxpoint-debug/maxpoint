import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { FIREBASE_CONFIG, FIREBASE_ENV } from './firebase-config.js';

const app = initializeApp(FIREBASE_CONFIG);
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
  environment: FIREBASE_ENV,
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

  async getCatalog() {
    const [productSnapshot, comboSnapshot, settingsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'products'), where('active', '==', true))),
      getDocs(query(collection(db, 'combos'), where('active', '==', true))),
      getDoc(doc(db, 'settings', 'public'))
    ]);
    const map = snapshot => snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return { products: map(productSnapshot), combos: map(comboSnapshot), settings: settingsSnapshot.data() || {} };
  }
};

window.dispatchEvent(new CustomEvent('piccolo:firebase-ready'));

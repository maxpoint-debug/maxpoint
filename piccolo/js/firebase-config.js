const production = {
  apiKey: 'AIzaSyC-xGKCJauxL5hlIhhlMs4nlSqSuGjGMd8',
  authDomain: 'piccolo-maxpoint.firebaseapp.com',
  projectId: 'piccolo-maxpoint',
  storageBucket: 'piccolo-maxpoint.firebasestorage.app',
  messagingSenderId: '473799249189',
  appId: '1:473799249189:web:593a93f75c0b2b146e1ecc'
};

// Reemplazar por otro proyecto antes de usar datos de desarrollo separados.
// Mientras no exista, localhost usa producción para facilitar la transición.
const development = { ...production };

export const FIREBASE_ENV = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'development'
  : 'production';

export const FIREBASE_CONFIG = FIREBASE_ENV === 'development'
  ? development
  : production;


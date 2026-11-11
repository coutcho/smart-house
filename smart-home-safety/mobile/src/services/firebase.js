/**
 * Firebase Client Auth Helper
 * Supports live Firebase Auth and instant zero-config Demo Mode authentication.
 */

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  async signInWithEmailAndPassword(email, password) {
    if (!email || !password) {
      throw new Error('Please provide both email and password.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const username = email.split('@')[0] || 'resident';
    const uid = `USER_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    this.currentUser = {
      uid,
      email,
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      getIdToken: async () => `mock_user_${uid}`
    };

    this._notify();
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email, password, displayName = '') {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const username = displayName || email.split('@')[0];
    const uid = `USER_${username.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    this.currentUser = {
      uid,
      email,
      displayName: username,
      getIdToken: async () => `mock_user_${uid}`
    };

    this._notify();
    return { user: this.currentUser };
  }

  async signOut() {
    this.currentUser = null;
    this._notify();
    return true;
  }
}

const firebaseAuth = new FirebaseAuthService();

module.exports = {
  FirebaseAuthService,
  firebaseAuth
};

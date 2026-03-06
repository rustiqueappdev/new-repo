import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Home, User } from 'lucide-react';

type Role = 'customer' | 'owner';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, signInWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim()) return 'Please enter your email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await register(email.trim(), password, fullName.trim());
      const uid = userCredential.user.uid;

      // Write user doc to Firestore with role
      await setDoc(
        doc(db, 'users', uid),
        {
          uid,
          displayName: fullName.trim(),
          email: email.trim(),
          role,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      showToast('Account created successfully!', 'success');

      if (role === 'owner') navigate('/owner');
      else navigate('/explore');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err?.code === 'auth/weak-password'
          ? 'Password is too weak. Please choose a stronger password.'
          : err?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(135deg, #0f1923 0%, #1b2838 50%, #0f1923 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
          >
            <span className="text-2xl font-bold text-white">R</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ReRoute</h1>
          <p className="text-gray-400 mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(212,175,55,0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h2 className="text-xl font-bold text-white mb-6">Get started</h2>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input-field"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="label mb-3 block">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Guest */}
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 text-left"
                  style={{
                    background: role === 'customer' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                    borderColor: role === 'customer' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  }}
                  disabled={loading}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
                      background: role === 'customer' ? '#22c55e' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <User
                      className="w-5 h-5"
                      style={{ color: role === 'customer' ? 'white' : '#9ca3af' }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: role === 'customer' ? '#22c55e' : '#d1d5db' }}
                    >
                      I'm a Guest
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Browse &amp; book stays</p>
                  </div>
                </button>

                {/* Property Owner */}
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 text-left"
                  style={{
                    background: role === 'owner' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                    borderColor: role === 'owner' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  }}
                  disabled={loading}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
                      background: role === 'owner' ? '#22c55e' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Home
                      className="w-5 h-5"
                      style={{ color: role === 'owner' ? 'white' : '#9ca3af' }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: role === 'owner' ? '#22c55e' : '#d1d5db' }}
                    >
                      I'm a Property Owner
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">List &amp; manage properties</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              className="btn-primary w-full py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#D4AF37' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Register;

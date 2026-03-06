import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, APP_CONTACT } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Layout from '../../components/layout/Layout';
import { Mail, Phone, Shield, Edit3, Save, X, MessageCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    if (user === null) navigate('/login');
  }, [user, navigate]);

  // Fetch Firestore user doc
  useEffect(() => {
    if (!user) return;

    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setDisplayName(data.displayName ?? user.displayName ?? '');
          setPhone(data.phone ?? '');
        } else {
          setDisplayName(user.displayName ?? '');
        }
      } catch {
        setDisplayName(user.displayName ?? '');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setError('');

    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    if (phone && !/^\+?[\d\s\-()]{7,15}$/.test(phone)) {
      setError('Please enter a valid phone number.');
      return;
    }

    setSaving(true);
    try {
      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
      }

      // Update Firestore user doc
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        phone: phone.trim(),
        updatedAt: new Date().toISOString(),
      });

      setUserData((prev: any) => ({
        ...prev,
        displayName: displayName.trim(),
        phone: phone.trim(),
      }));

      show('Profile updated successfully!', 'success');
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(userData?.displayName ?? user?.displayName ?? '');
    setPhone(userData?.phone ?? '');
    setError('');
    setEditing(false);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return <span className="badge-gold">Property Owner</span>;
      case 'admin':
        return <span className="badge-red">Admin</span>;
      default:
        return <span className="badge-green">Guest</span>;
    }
  };

  const avatarLetter = (displayName || user?.displayName || user?.email || '?')
    .charAt(0)
    .toUpperCase();

  if (user === null) return null;

  return (
    <Layout>
      <div className="page-wrap max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-12 h-12 rounded-full border-4 animate-spin"
              style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* Profile Header Card */}
            <div
              className="rounded-2xl p-8 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6"
              style={{
                background: 'linear-gradient(135deg, #1b2838 0%, #2d4060 100%)',
              }}
            >
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)', color: '#1b2838' }}
              >
                {avatarLetter}
              </div>

              {/* Info */}
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {userData?.displayName || user.displayName || 'User'}
                </h1>
                <p className="text-gray-400 text-sm mb-3">{user.email}</p>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  {getRoleBadge(userData?.role)}
                  {(user as any).emailVerified && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Shield className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile Card */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: '#1b2838' }}>
                  Profile Information
                </h2>
                {!editing ? (
                  <button
                    className="btn-outline text-sm py-2 px-4 flex items-center gap-2"
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      className="btn-outline text-sm py-2 px-4 flex items-center gap-2"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-60"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                {/* Display Name */}
                <div>
                  <label className="label" htmlFor="displayName">
                    Display Name
                  </label>
                  {editing ? (
                    <input
                      id="displayName"
                      type="text"
                      className="input-field"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      disabled={saving}
                    />
                  ) : (
                    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50">
                      <p className="text-gray-800 font-medium">
                        {userData?.displayName || user.displayName || '—'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="label">Email Address</label>
                  <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-gray-800">{user.email}</p>
                    <span className="ml-auto text-xs text-gray-400">(Cannot be changed)</span>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="label" htmlFor="phone">
                    Phone Number
                  </label>
                  {editing ? (
                    <input
                      id="phone"
                      type="tel"
                      className="input-field"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      disabled={saving}
                    />
                  ) : (
                    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-gray-800">{userData?.phone || '—'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Support Card */}
            {/* NOTE: This only shows APP_CONTACT details — never farmhouse owner contacts */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.25)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#1b2838' }}>
                    Contact Support
                  </h2>
                  <p className="text-gray-500 text-sm">
                    We're here to help with bookings, payments, and queries.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {APP_CONTACT?.supportEmail && (
                  <a
                    href={`mailto:${APP_CONTACT.supportEmail}`}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white hover:shadow-md transition-shadow duration-200"
                    style={{ border: '1px solid rgba(212,175,55,0.2)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.15)' }}
                    >
                      <Mail className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Email Support
                      </p>
                      <p className="text-gray-800 font-semibold text-sm">
                        {APP_CONTACT.supportEmail}
                      </p>
                    </div>
                  </a>
                )}

                {APP_CONTACT?.supportPhone && (
                  <a
                    href={`tel:${APP_CONTACT.supportPhone}`}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white hover:shadow-md transition-shadow duration-200"
                    style={{ border: '1px solid rgba(212,175,55,0.2)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(212,175,55,0.15)' }}
                    >
                      <Phone className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Phone Support
                      </p>
                      <p className="text-gray-800 font-semibold text-sm">
                        {APP_CONTACT.supportPhone}
                      </p>
                    </div>
                  </a>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Support hours: Mon–Sat, 9 AM – 7 PM IST.
              </p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Profile;

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Users, Search } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';

interface AppUser {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  createdAt?: unknown;
}

function toDateLabel(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleDateString();
  }
  return new Date(val as string).toLocaleDateString();
}

function RoleBadge({ role }: { role?: string }) {
  if (role === 'admin') return <span className="badge-red">Admin</span>;
  if (role === 'owner') return <span className="badge-gold">Owner</span>;
  return <span className="badge-blue">Customer</span>;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppUser)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function toTs(val: unknown): number {
    if (!val) return 0;
    if (typeof val === 'object' && val !== null && 'seconds' in val) return (val as { seconds: number }).seconds;
    return new Date(val as string).getTime() / 1000;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name ?? u.displayName ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, search]);

  const sorted = [...filtered].sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));

  if (!user || (user as any).role !== 'admin') return null;

  return (
    <Layout>
      <div className="page-wrap max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Users
            {!loading && (
              <span className="ml-2 text-base text-gray-400 font-normal">({users.length})</span>
            )}
          </h1>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {search ? 'No users match your search.' : 'No users found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Role</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xs flex-shrink-0">
                            {(u.name ?? u.displayName ?? u.email ?? '?')[0].toUpperCase()}
                          </div>
                          <span className="text-gray-800 font-medium">
                            {u.name ?? u.displayName ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {toDateLabel(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {sorted.map((u) => (
                <div key={u.id} className="card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold flex-shrink-0">
                    {(u.name ?? u.displayName ?? u.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold text-gray-800 truncate">
                        {u.name ?? u.displayName ?? '—'}
                      </p>
                      <RoleBadge role={u.role} />
                    </div>
                    <p className="text-sm text-gray-500 truncate">{u.email ?? '—'}</p>
                    <p className="text-xs text-gray-400">{toDateLabel(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

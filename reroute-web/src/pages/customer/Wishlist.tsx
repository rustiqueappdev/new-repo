import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import Layout from '../../components/layout/Layout';
import FarmhouseCard from '../../components/ui/FarmhouseCard';

const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();

  const [farmhouses, setFarmhouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (user === null) navigate('/login');
  }, [user, navigate]);

  // Fetch farmhouse details for each id in the wishlist
  useEffect(() => {
    if (!user) return;

    if (wishlist.length === 0) {
      setFarmhouses([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          wishlist.map(async (id) => {
            try {
              const snap = await getDoc(doc(db, 'farmhouses', id));
              if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        setFarmhouses(results.filter(Boolean) as any[]);
      } catch {
        setFarmhouses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, wishlist]);

  const handleShare = async (fh: any) => {
    const url = `${window.location.origin}/farmhouse/${fh.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: fh.name, text: `Check out ${fh.name} on ReRoute!`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // user cancelled or clipboard unavailable
    }
  };

  if (user === null) return null;

  return (
    <Layout>
      <div className="page-wrap">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
            >
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#1b2838' }}>
              My <span className="gold-text">Wishlist</span>
            </h1>
          </div>
          <p className="text-gray-500">Your saved farmhouses, ready when you are.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-12 h-12 rounded-full border-4 animate-spin"
              style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
            />
          </div>
        ) : wishlist.length === 0 ? (
          /* Empty State */
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(212,175,55,0.1)', border: '2px dashed #D4AF37' }}
            >
              <Heart className="w-9 h-9" style={{ color: '#D4AF37' }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No saved farmhouses</h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Tap the heart icon on any farmhouse to save it here for quick access later.
            </p>
            <Link to="/explore" className="btn-primary">
              Explore Farmhouses
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">
              {farmhouses.length} saved farmhouse{farmhouses.length !== 1 ? 's' : ''}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {farmhouses.map((fh) => (
                <FarmhouseCard
                  key={fh.id}
                  farmhouse={fh}
                  isWishlisted={true}
                  onWishlistToggle={() => toggleWishlist(fh.id)}
                  onShare={() => handleShare(fh)}
                  onClick={() => navigate(`/farmhouse/${fh.id}`)}
                />
              ))}
            </div>

            {/* Stale IDs (wishlisted but deleted from Firestore) */}
            {wishlist.length > farmhouses.length && (
              <p className="text-xs text-gray-400 mt-6 text-center">
                {wishlist.length - farmhouses.length} saved item
                {wishlist.length - farmhouses.length !== 1 ? 's' : ''} no longer available.
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWishlist } from '../../context/WishlistContext';
import Layout from '../../components/layout/Layout';
import FarmhouseCard from '../../components/ui/FarmhouseCard';
import Modal from '../../components/ui/Modal';
import { subscribeApprovedFarmhouses } from '../../services/farmhouseService';

type SortOption = 'name' | 'price-low' | 'price-high' | 'rating' | 'capacity';

interface FilterState {
  location: string;
  minPrice: string;
  maxPrice: string;
  minCapacity: string;
}

const DEFAULT_FILTERS: FilterState = {
  location: '',
  minPrice: '',
  maxPrice: '',
  minCapacity: '',
};

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [farmhouses, setFarmhouses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('name');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // No auth guard — explore is public

  // Subscribe to approved farmhouses
  useEffect(() => {
    const unsub = subscribeApprovedFarmhouses((data: any[]) => {
      setFarmhouses(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch ratings from reviews subcollection
  useEffect(() => {
    if (farmhouses.length === 0) return;

    const fetchRatings = async () => {
      const newRatings: Record<string, number> = {};
      await Promise.all(
        farmhouses.map(async (fh) => {
          try {
            const reviewsRef = collection(db, 'farmhouses', fh.id, 'reviews');
            const snap = await getDocs(query(reviewsRef, orderBy('createdAt', 'desc')));
            if (!snap.empty) {
              const total = snap.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0);
              newRatings[fh.id] = total / snap.docs.length;
            }
          } catch {
            // silently skip if no reviews
          }
        })
      );
      setRatings((prev) => ({ ...prev, ...newRatings }));
    };

    fetchRatings();
  }, [farmhouses]);

  const handleShare = useCallback(
    async (fh: any) => {
      const url = `${window.location.origin}/farmhouse/${fh.id}`;
      const text = `Check out ${fh.name} on ReRoute!`;
      try {
        if (navigator.share) {
          await navigator.share({ title: fh.name, text, url });
        } else {
          await navigator.clipboard.writeText(url);
          show('Link copied to clipboard!', 'success');
        }
      } catch {
        // user cancelled share or clipboard failed
      }
    },
    [show]
  );

  const handleWishlistToggle = useCallback(
    (id: string) => {
      if (isInWishlist(id)) removeFromWishlist(id);
      else addToWishlist(id);
    },
    [isInWishlist, addToWishlist, removeFromWishlist]
  );

  const applyFilters = () => {
    setFilters(pendingFilters);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters =
    filters.location || filters.minPrice || filters.maxPrice || filters.minCapacity;

  const filteredAndSorted = farmhouses
    .filter((fh) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        fh.name?.toLowerCase().includes(q) ||
        fh.location?.toLowerCase().includes(q) ||
        fh.description?.toLowerCase().includes(q);

      const matchesLocation =
        !filters.location ||
        fh.location?.toLowerCase().includes(filters.location.toLowerCase());

      const price = fh.pricePerNight ?? fh.price ?? 0;
      const matchesMinPrice = !filters.minPrice || price >= Number(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || price <= Number(filters.maxPrice);
      const matchesCapacity =
        !filters.minCapacity || (fh.capacity ?? 0) >= Number(filters.minCapacity);

      return matchesSearch && matchesLocation && matchesMinPrice && matchesMaxPrice && matchesCapacity;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'name':
          return (a.name ?? '').localeCompare(b.name ?? '');
        case 'price-low':
          return (a.pricePerNight ?? a.price ?? 0) - (b.pricePerNight ?? b.price ?? 0);
        case 'price-high':
          return (b.pricePerNight ?? b.price ?? 0) - (a.pricePerNight ?? a.price ?? 0);
        case 'rating':
          return (ratings[b.id] ?? 0) - (ratings[a.id] ?? 0);
        case 'capacity':
          return (b.capacity ?? 0) - (a.capacity ?? 0);
        default:
          return 0;
      }
    });

  return (
    <Layout>
      <div className="page-wrap">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-800 dark:text-gray-100">
            {user ? <>Welcome back, <span className="gold-text">{user.displayName?.split(' ')[0] || 'Explorer'}!</span></> : <span>Explore <span className="gold-text">Farmhouses</span></span>}
          </h1>
          <p className="text-gray-500 mt-1">Discover your next perfect farmhouse escape.</p>
        </div>

        {/* Search + Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort */}
          <select
            className="input-field sm:w-52"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
          >
            <option value="name">Sort: Name</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="capacity">Highest Capacity</option>
          </select>

          {/* Filter Button */}
          <button
            className={`btn-outline flex items-center gap-2 ${hasActiveFilters ? 'border-yellow-500' : ''}`}
            onClick={() => {
              setPendingFilters(filters);
              setFilterOpen(true);
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: '#D4AF37' }}
              />
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.location && (
              <span className="badge-gold flex items-center gap-1">
                Location: {filters.location}
              </span>
            )}
            {filters.minPrice && (
              <span className="badge-gold flex items-center gap-1">
                Min ₹{filters.minPrice}
              </span>
            )}
            {filters.maxPrice && (
              <span className="badge-gold flex items-center gap-1">
                Max ₹{filters.maxPrice}
              </span>
            )}
            {filters.minCapacity && (
              <span className="badge-gold flex items-center gap-1">
                Capacity ≥ {filters.minCapacity}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {filteredAndSorted.length} farmhouse{filteredAndSorted.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-12 h-12 rounded-full border-4 animate-spin"
              style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
            />
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🌾</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No farmhouses found</h3>
            <p className="text-gray-400">
              {hasActiveFilters || searchQuery
                ? 'Try adjusting your search or filters.'
                : 'No approved farmhouses are available right now. Check back soon!'}
            </p>
            {(hasActiveFilters || searchQuery) && (
              <button
                className="btn-outline mt-4"
                onClick={() => {
                  setSearchQuery('');
                  clearFilters();
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSorted.map((fh) => (
              <FarmhouseCard
                key={fh.id}
                farmhouse={fh}
                rating={ratings[fh.id]}
                isInWishlist={isInWishlist(fh.id)}
                onWishlist={() => handleWishlistToggle(fh.id)}
                onShare={() => handleShare(fh)}
                onClick={() => navigate(`/farmhouse/${fh.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <Modal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Farmhouses"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Location</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Pune, Lonavala"
              value={pendingFilters.location}
              onChange={(e) =>
                setPendingFilters((p) => ({ ...p, location: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min Price (₹/night)</label>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                min="0"
                value={pendingFilters.minPrice}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, minPrice: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Max Price (₹/night)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Any"
                min="0"
                value={pendingFilters.maxPrice}
                onChange={(e) =>
                  setPendingFilters((p) => ({ ...p, maxPrice: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Min Capacity (guests)</label>
            <input
              type="number"
              className="input-field"
              placeholder="Any"
              min="1"
              value={pendingFilters.minCapacity}
              onChange={(e) =>
                setPendingFilters((p) => ({ ...p, minCapacity: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="btn-outline flex-1"
              onClick={() => {
                setPendingFilters(DEFAULT_FILTERS);
              }}
            >
              Reset
            </button>
            <button className="btn-primary flex-1" onClick={applyFilters}>
              Apply Filters
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Explore;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CalendarCheck, Star, MapPin, Users, ChevronDown, Phone, Check } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { subscribeApprovedFarmhouses } from '../services/farmhouseService';
import type { Farmhouse } from '../types';
import { useWishlist } from '../context/WishlistContext';
import FarmhouseCard from '../components/ui/FarmhouseCard';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  useEffect(() => {
    const unsub = subscribeApprovedFarmhouses((list) => setFarmhouses(list));
    return unsub;
  }, []);

  const featured = farmhouses.slice(0, 6);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/explore${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  }

  function shareFarmhouse(f: Farmhouse) {
    if (navigator.share) navigator.share({ title: f.name, url: `/farmhouse/${f.id}` });
    else navigator.clipboard.writeText(window.location.origin + `/farmhouse/${f.id}`);
  }

  return (
    <Layout>
      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80"
            alt="Farmhouse"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy-800/60 to-transparent" />
        </div>

        <div className="relative page-wrap py-20 w-full">
          <div className="max-w-2xl">
            <div className="badge-gold mb-5 inline-flex">✦ Premium Farmhouse Stays</div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              Escape to
              <span className="block bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent">
                Nature's Finest
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-300 max-w-xl leading-relaxed">
              Handpicked farmhouses for your perfect countryside retreat. Browse, select your dates, and contact us to book instantly.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mt-8 flex items-center gap-2 bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-2 max-w-lg">
              <Search size={18} className="text-gray-400 ml-2 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-navy-800 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none py-2"
                placeholder="Search by name, city or area..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="btn-primary !px-5 !py-2.5 text-sm whitespace-nowrap">Search</button>
            </form>

            <div className="mt-10 flex flex-wrap gap-8">
              {[{ v: '50+', l: 'Farmhouses' }, { v: '1000+', l: 'Happy Guests' }, { v: '4.8★', l: 'Avg Rating' }].map(s => (
                <div key={s.l}>
                  <p className="text-2xl font-bold text-gold-400">{s.v}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
          <ChevronDown size={24} className="text-gold-400" />
        </div>
      </section>

      {/* ── FEATURED FARMHOUSES ── */}
      <section className="py-16 md:py-20 bg-gray-50 dark:bg-navy-900">
        <div className="page-wrap">
          <div className="text-center mb-10">
            <h2 className="section-title">Featured <span className="gold-text">Retreats</span></h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">Handpicked premium farmhouses — no login needed to browse</p>
          </div>

          {farmhouses.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {featured.map(f => (
                <FarmhouseCard
                  key={f.id}
                  farmhouse={f}
                  isInWishlist={isInWishlist(f.id)}
                  onClick={() => navigate(`/farmhouse/${f.id}`)}
                  onShare={() => shareFarmhouse(f)}
                  onWishlist={() => isInWishlist(f.id) ? removeFromWishlist(f.id) : addToWishlist(f.id)}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/explore" className="btn-outline">View All Farmhouses →</Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 md:py-20">
        <div className="page-wrap">
          <div className="text-center mb-12">
            <h2 className="section-title">How It <span className="gold-text">Works</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: '1', Icon: Search,        title: 'Discover',          desc: 'Browse curated farmhouses by location, amenities, and price — no account needed.' },
              { n: '2', Icon: CalendarCheck, title: 'Select Dates',      desc: 'Pick your check-in and check-out dates, choose guests, and see the full price breakdown.' },
              { n: '3', Icon: Phone,         title: 'Contact & Confirm', desc: 'Reach out via WhatsApp or call. We confirm availability and finalize your booking.' },
            ].map(s => (
              <div key={s.n} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4 shadow-gold group-hover:scale-110 transition-transform">
                  <s.Icon size={28} className="text-white" />
                </div>
                <div className="w-7 h-7 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 flex items-center justify-center text-xs font-bold mx-auto mb-3">{s.n}</div>
                <h3 className="font-semibold text-navy-800 dark:text-gray-100 mb-2">{s.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY REROUTE ── */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-navy-800 to-navy-600">
        <div className="page-wrap">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="badge-gold mb-4 inline-flex">Why ReRoute</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Trusted Stays, <span className="gold-text">Every Time</span>
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                Every farmhouse is personally verified before listing. We work directly with owners to ensure quality, hygiene, and honest pricing — no surprises.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Verified farmhouses only',
                  'Transparent pricing — no hidden fees',
                  'Dedicated support before & during your stay',
                  'Flexible booking for groups of all sizes',
                  'Real reviews from real guests',
                ].map(pt => (
                  <li key={pt} className="flex items-center gap-3 text-gray-300 text-sm">
                    <div className="w-5 h-5 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-gold-400" />
                    </div>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Farmhouses', value: '50+', icon: MapPin },
                { label: 'Happy Guests', value: '1000+', icon: Users },
                { label: 'Avg Rating', value: '4.8', icon: Star },
                { label: 'Cities', value: '10+', icon: Search },
              ].map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
                  <s.icon size={24} className="text-gold-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-gold-500 to-gold-400">
        <div className="page-wrap text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Ready for Your Getaway?</h2>
          <p className="mt-3 text-gold-100 text-lg">Browse farmhouses now — no account needed</p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link to="/explore" className="bg-white text-gold-700 font-semibold px-8 py-4 rounded-xl hover:bg-gold-50 transition-colors shadow-lg">
              Browse Farmhouses
            </Link>
            <Link to="/contact" className="border-2 border-white text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

import React from 'react';
import { Heart, Share2, Star, MapPin, Users } from 'lucide-react';
import type { Farmhouse } from '../../types';

interface Props {
  farmhouse: Farmhouse;
  rating?: number;
  isInWishlist?: boolean;
  onClick: () => void;
  onShare: () => void;
  onWishlist: () => void;
}

export default function FarmhouseCard({ farmhouse, rating, isInWishlist, onClick, onShare, onWishlist }: Props) {
  return (
    <div className="card hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={onClick}>
      <div className="relative h-52 overflow-hidden">
        <img
          src={farmhouse.photos?.[0] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600'}
          alt={farmhouse.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <button onClick={e => { e.stopPropagation(); onShare(); }}
            className="w-8 h-8 rounded-full bg-white/90 dark:bg-navy-800/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors">
            <Share2 size={13} className="text-navy-700 dark:text-gray-300" />
          </button>
          <button onClick={e => { e.stopPropagation(); onWishlist(); }}
            className="w-8 h-8 rounded-full bg-white/90 dark:bg-navy-800/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors">
            <Heart size={13} className={isInWishlist ? 'fill-red-500 text-red-500' : 'text-navy-700 dark:text-gray-300'} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-navy-800 dark:text-gray-100 line-clamp-1 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
            {farmhouse.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={13} className="fill-gold-400 text-gold-400" />
            <span className="text-sm font-medium text-navy-700 dark:text-gray-300">
              {rating && rating > 0 ? rating.toFixed(1) : 'New'}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
          <MapPin size={12} className="flex-shrink-0" />
          {farmhouse.city}, {farmhouse.area}
        </p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-navy-700">
          <div>
            <span className="font-bold text-gold-600 dark:text-gold-400">₹{farmhouse.weekendNight?.toLocaleString('en-IN')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/night</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Users size={12} /> Up to {farmhouse.capacity}
          </span>
        </div>
      </div>
    </div>
  );
}

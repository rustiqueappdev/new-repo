import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)} className={onChange ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}>
          <Star size={size} className={i <= value ? 'fill-gold-400 text-gold-400' : 'fill-gray-200 text-gray-200 dark:fill-navy-600 dark:text-navy-600'} />
        </button>
      ))}
    </div>
  );
}

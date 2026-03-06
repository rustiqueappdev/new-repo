// Ported from mobile pricing logic in FarmhouseDetailScreen
import type { Farmhouse, CustomPricing } from '../types';

export const PLATFORM_FEE_PCT = 0.02;
export const PROCESSING_FEE = 50;

export const isWeekend = (d: string) => { const day = new Date(d).getDay(); return day === 0 || day === 6; };

function findCustom(farmhouse: Farmhouse, dateStr: string): CustomPricing | null {
  const cp = farmhouse.customPricing;
  if (!cp?.length) return null;
  const key = dateStr.replace(/-/g, '/');
  return cp.find(c => (c.label || '').trim() === key) || null;
}

export function getNightPrice(farmhouse: Farmhouse, dateStr: string): number {
  const c = findCustom(farmhouse, dateStr);
  if (c) {
    const wknd = isWeekend(dateStr);
    return Number(wknd ? c.weekendNight : c.weeklyNight) || Number(c.price) || (wknd ? farmhouse.weekendNight : farmhouse.weeklyNight);
  }
  return isWeekend(dateStr) ? farmhouse.weekendNight : farmhouse.weeklyNight;
}

export function getDayPrice(farmhouse: Farmhouse, dateStr: string): number {
  const c = findCustom(farmhouse, dateStr);
  if (c) return Number(c.price) || (isWeekend(dateStr) ? farmhouse.weekendDay : farmhouse.weeklyDay);
  return isWeekend(dateStr) ? farmhouse.weekendDay : farmhouse.weeklyDay;
}

export function calculateTotal(farmhouse: Farmhouse, checkIn: string, checkOut: string, type: 'overnight' | 'dayuse') {
  const dates: string[] = [];
  const cur = new Date(checkIn);
  const last = new Date(checkOut);
  while (cur < last) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }
  const nights = Math.max(1, dates.length);
  const baseAmount = type === 'overnight'
    ? dates.reduce((s, d) => s + getNightPrice(farmhouse, d), 0)
    : getDayPrice(farmhouse, checkIn);
  const platformFee = Math.round(baseAmount * PLATFORM_FEE_PCT);
  return { baseAmount, platformFee, processingFee: PROCESSING_FEE, total: baseAmount + platformFee + PROCESSING_FEE, nights };
}

export const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

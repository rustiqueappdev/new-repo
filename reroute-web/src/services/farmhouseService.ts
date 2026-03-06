// Ported from mobile services/farmhouseService.ts
// Removed React Native imports; logic identical
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc,
  addDoc, onSnapshot, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import type { Farmhouse } from '../types';

const toTitleCase = (s: string) =>
  (s || '').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function convertFarmhouseData(id: string, data: any): Farmhouse {
  const b = data.basicDetails || {};
  const p = data.pricing || {};
  const am = data.amenities || {};
  const ru = data.rules || {};
  return {
    id,
    name: toTitleCase(b.name || data.name || 'Unnamed Farmhouse'),
    location: toTitleCase(b.area || b.location || data.location || 'Unknown'),
    city: toTitleCase(b.city || data.city || 'Unknown City'),
    area: toTitleCase(b.area || data.area || 'Unknown Area'),
    description: b.description || data.description || '',
    mapLink: b.mapLink || data.mapLink || '',
    bedrooms: parseInt(b.bedrooms || data.bedrooms) || 1,
    capacity: parseInt(b.capacity || data.capacity) || 1,
    weeklyNight: parseInt(p.weeklyNight || data.weeklyNight) || 0,
    weekendNight: parseInt(p.weekendNight || data.weekendNight) || 0,
    weeklyDay: parseInt(p.weeklyDay || data.weeklyDay) || 0,
    weekendDay: parseInt(p.weekendDay || data.weekendDay) || 0,
    occasionalDay: parseInt(p.occasionalDay || data.occasionalDay) || 0,
    occasionalNight: parseInt(p.occasionalNight || data.occasionalNight) || 0,
    extraGuestPrice: parseInt(p.extraGuestPrice || data.extraGuestPrice) || 500,
    customPricing: (p.customPricing || data.customPricing || []).map((c: any) => ({
      label: c.name || c.label || '',
      price: parseInt(c.price) || 0,
      weeklyNight: parseInt(c.weeklyNight) || undefined,
      weekendNight: parseInt(c.weekendNight) || undefined,
    })),
    photos: data.photoUrls || data.photos || [],
    photoUrls: data.photoUrls,
    amenities: {
      tv: am.tv || 0,
      geyser: am.geyser || 0,
      bonfire: am.bonfire > 0 ? 1 : 0,
      chess: am.chess > 0 ? 1 : 0,
      carroms: am.carroms > 0 ? 1 : 0,
      volleyball: am.volleyball > 0 ? 1 : 0,
      pool: am.pool || false,
    },
    rules: {
      unmarriedCouples: !ru.unmarriedNotAllowed,
      pets: !ru.petsNotAllowed,
      quietHours: !!ru.quietHours,
    },
    ownerId: data.ownerId || '',
    status: data.status || 'pending',
    rating: data.rating,
    reviews: data.reviews,
    bookedDates: data.bookedDates || [],
    blockedDates: data.blockedDates || [],
    createdAt: data.createdAt,
    approvedAt: data.approvedAt,
    // Owner phones kept internal, NOT returned for customer views
  };
}

export function subscribeApprovedFarmhouses(cb: (list: Farmhouse[]) => void) {
  const q = query(
    collection(db, 'farmhouses'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => convertFarmhouseData(d.id, d.data()))));
}

export async function getFarmhouse(id: string): Promise<Farmhouse | null> {
  const snap = await getDoc(doc(db, 'farmhouses', id));
  if (!snap.exists()) return null;
  return convertFarmhouseData(snap.id, snap.data());
}

// Owner-only — includes contact details
export async function getOwnerFarmhouse(id: string): Promise<(Farmhouse & { contactPhone1?: string; contactPhone2?: string }) | null> {
  const snap = await getDoc(doc(db, 'farmhouses', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  const b = data.basicDetails || {};
  return {
    ...convertFarmhouseData(snap.id, data),
    contactPhone1: b.contactPhone1 || data.contactPhone1,
    contactPhone2: b.contactPhone2 || data.contactPhone2,
  };
}

export function subscribeOwnerFarmhouses(ownerId: string, cb: (list: Farmhouse[]) => void) {
  const q = query(collection(db, 'farmhouses'), where('ownerId', '==', ownerId));
  return onSnapshot(q, snap => cb(snap.docs.map(d => {
    const data = d.data();
    const f = convertFarmhouseData(d.id, data);
    const b = data.basicDetails || {};
    return { ...f, contactPhone1: b.contactPhone1 || data.contactPhone1, contactPhone2: b.contactPhone2 || data.contactPhone2 };
  })));
}

export async function updateFarmhouseStatus(id: string, status: 'approved' | 'rejected') {
  await updateDoc(doc(db, 'farmhouses', id), {
    status,
    approvedAt: status === 'approved' ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBlockedDates(id: string, blockedDates: string[]) {
  await updateDoc(doc(db, 'farmhouses', id), { blockedDates, updatedAt: serverTimestamp() });
}

export async function uploadFarmhousePhoto(farmhouseId: string, file: File): Promise<string> {
  const ref = storageRef(storage, `farmhouses/${farmhouseId}/${Date.now()}_${file.name}`);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

export async function createFarmhouse(data: any, ownerId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'farmhouses'), {
    ...data,
    ownerId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFarmhouse(id: string, data: any) {
  await updateDoc(doc(db, 'farmhouses', id), { ...data, updatedAt: serverTimestamp() });
}

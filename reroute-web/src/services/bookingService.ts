import {
  collection, doc, addDoc, updateDoc, getDoc, query,
  where, orderBy, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Booking } from '../types';

const mapDoc = (d: any): Booking => ({ id: d.id, ...d.data() });

export async function createBooking(data: Omit<Booking, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'bookings'), {
    ...data,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitUTR(bookingId: string, utrNumber: string) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    utrNumber,
    status: 'payment_pending',
    paymentStatus: 'utr_submitted',
    updatedAt: serverTimestamp(),
  });
}

export async function cancelBooking(bookingId: string, reason?: string) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'cancelled',
    cancelReason: reason || '',
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Admin: confirm payment & mark booked dates
export async function adminVerifyPayment(bookingId: string) {
  const bRef = doc(db, 'bookings', bookingId);
  const bSnap = await getDoc(bRef);
  if (!bSnap.exists()) throw new Error('Booking not found');
  const b = bSnap.data();
  const dates = getDatesBetween(b.checkInDate, b.checkOutDate);
  const fRef = doc(db, 'farmhouses', b.farmhouseId);
  const fSnap = await getDoc(fRef);
  if (fSnap.exists()) {
    const existing: string[] = fSnap.data().bookedDates || [];
    await updateDoc(fRef, { bookedDates: [...new Set([...existing, ...dates])] });
  }
  await updateDoc(bRef, { status: 'confirmed', paymentStatus: 'verified', updatedAt: serverTimestamp() });
}

export function subscribeUserBookings(userId: string, cb: (list: Booking[]) => void) {
  const q = query(collection(db, 'bookings'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(mapDoc)));
}

export function subscribeOwnerBookings(farmhouseId: string, cb: (list: Booking[]) => void) {
  const q = query(collection(db, 'bookings'), where('farmhouseId', '==', farmhouseId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(mapDoc)));
}

export function subscribeAllBookings(cb: (list: Booking[]) => void) {
  return onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), snap => cb(snap.docs.map(mapDoc)));
}

export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Coupon } from '../types';

export function subscribeCoupons(cb: (list: Coupon[]) => void) {
  return onSnapshot(collection(db, 'coupons'), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)))
  );
}

export async function createCoupon(data: Omit<Coupon, 'id'>) {
  return addDoc(collection(db, 'coupons'), { ...data, usedCount: 0, createdAt: serverTimestamp() });
}

export async function toggleCoupon(id: string, active: boolean) {
  await updateDoc(doc(db, 'coupons', id), { active });
}

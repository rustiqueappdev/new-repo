import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Review } from '../types';

export function subscribeReviews(farmhouseId: string, cb: (list: Review[]) => void, count = 10) {
  const q = query(collection(db, 'farmhouses', farmhouseId, 'reviews'), orderBy('createdAt', 'desc'), limit(count));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review))), err => {
    if (!err.message.includes('Missing or insufficient permissions')) console.error(err);
    cb([]);
  });
}

export async function addReview(farmhouseId: string, review: Omit<Review, 'id'>) {
  await addDoc(collection(db, 'farmhouses', farmhouseId, 'reviews'), { ...review, createdAt: serverTimestamp() });
}

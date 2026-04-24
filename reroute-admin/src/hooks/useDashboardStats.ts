import { useState, useEffect } from 'react';
import { collection, query, where, getCountFromServer, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DashboardStats } from '../types';

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalFarmhouses: 0,
    pendingFarmhouses: 0,
    totalUsers: 0,
    totalBookings: 0,
    activeCoupons: 0,
    todayBookings: 0,
    weekBookings: 0,
    monthBookings: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const farmhousesRef = collection(db, 'farmhouses');
        const usersRef = collection(db, 'users');
        const bookingsRef = collection(db, 'bookings');
        const couponsRef = collection(db, 'coupons');

        const [
          totalFarmhouses,
          pendingFarmhouses,
          totalUsers,
          totalBookings,
          activeCoupons
        ] = await Promise.all([
          getCountFromServer(farmhousesRef),
          getCountFromServer(query(farmhousesRef, where('status', '==', 'pending'))),
          getCountFromServer(usersRef),
          getCountFromServer(bookingsRef),
          getCountFromServer(query(couponsRef, where('is_active', '==', true)))
        ]);

        const now = new Date();
        const todayTs = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        const weekAgoTs = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
        const monthAgoTs = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));

        const [todayBookings, weekBookings, monthBookings, paidBookingsSnap] = await Promise.all([
          getCountFromServer(query(bookingsRef, where('createdAt', '>=', todayTs))),
          getCountFromServer(query(bookingsRef, where('createdAt', '>=', weekAgoTs))),
          getCountFromServer(query(bookingsRef, where('createdAt', '>=', monthAgoTs))),
          getDocs(query(bookingsRef, where('paymentStatus', '==', 'paid')))
        ]);

        let totalRevenue = 0;
        paidBookingsSnap.forEach((doc) => {
          const data = doc.data();
          const price = Number(data.totalPrice ?? data.total_price ?? data.amount ?? 0);
          totalRevenue += price;
        });

        setStats({
          totalFarmhouses: totalFarmhouses.data().count,
          pendingFarmhouses: pendingFarmhouses.data().count,
          totalUsers: totalUsers.data().count,
          totalBookings: totalBookings.data().count,
          activeCoupons: activeCoupons.data().count,
          todayBookings: todayBookings.data().count,
          weekBookings: weekBookings.data().count,
          monthBookings: monthBookings.data().count,
          totalRevenue
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};

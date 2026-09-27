'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!user.onboarded) {
      router.replace('/onboarding');
    } else {
      router.replace('/today');
    }
  }, [user, loading, router]);

  return (
    <div className="loading-page">
      <div className="spinner spinner-lg"></div>
    </div>
  );
}

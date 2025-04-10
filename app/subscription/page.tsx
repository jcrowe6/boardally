// app/subscription/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import SubscriptionButton from '../components/SubscriptionButton';
import { getUserRequestInfo, tierLimits } from 'utils/userDDBClient';
import { fetchUserUsage } from 'app/actions/usage';

export default function SubscriptionPage() {
  const { data: session, status } = useSession()
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userTier, setUserTier] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Check if coming back from successful checkout
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }
    
    if (status === 'authenticated' && session.user) {
      fetchUserData();
    }
  }, [status, session]);
  
  const fetchUserData = async () => {
    try {
      const userData = await fetchUserUsage()
      if (!userData) {
        throw new Error('User data not found');
      }
      setUserTier(userData.tier);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }
  
  return (
    <div className="bg-app-background min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4">
      <h1 className="text-3xl text-primary-text font-bold mb-6">Subscription Management</h1>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Subscription successful! Your account has been upgraded.
        </div>
      )}
      
      {canceled && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Subscription process was canceled.
        </div>
      )}
      
      <div className="bg-primary-container shadow-md rounded-lg p-6 mb-6 text-primary-text">
        <h2 className="text-xl font-semibold mb-4">Your Current Plan</h2>
        <div className="mb-6">
          <span className="font-medium ">Current Tier:</span> {userTier === 'paid' ? 'Premium' : 'Free'}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-primary-text">
          <div className="border rounded-lg p-6 ">
            <h3 className="text-lg font-medium mb-2">Free Tier</h3>
            <ul className="mb-4">
              <li className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{tierLimits['free']} requests per day</span>
              </li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-6 bg-notice-background">
            <h3 className="text-lg font-medium mb-2">Premium Tier</h3>
            <ul className="mb-4">
              <li className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Unlimited requests</span>
              </li>
              <li className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Priority Support</span>
              </li>
              <h3 className="text-md font-medium mb-2">Coming soon</h3>
              <li className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8V6a.75.75 0 011.5 0v3.25H13a.75.75 0 010 1.5h-3.75A.75.75 0 019.25 10z" clipRule="evenodd" />
                </svg>
                <span>Image Context Upload</span>
              </li>
            </ul>
            <p className="text-lg font-bold mb-4">$0.99/month</p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <SubscriptionButton />
        </div>
      </div>
    </div>
  );
}
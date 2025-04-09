// app/subscription/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import SubscriptionButton from '../components/SubscriptionButton';
import { getUserRequestInfo } from 'utils/userDDBClient';
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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>
      
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
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Current Plan</h2>
        <div className="mb-6">
          <span className="font-medium">Current Tier:</span> {userTier === 'paid' ? 'Premium' : 'Free'}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-2">Free Tier</h3>
            <p className="text-gray-600 mb-4">Basic access to board game rule questions</p>
            <ul className="mb-4">
              <li className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>10 requests per day</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Basic rule lookups</span>
              </li>
            </ul>
            <p className="text-lg font-bold mb-4">$0/month</p>
          </div>
          
          <div className="border rounded-lg p-6 bg-blue-50">
            <h3 className="text-lg font-medium mb-2">Premium Tier</h3>
            <p className="text-gray-600 mb-4">Enhanced access with more features</p>
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
                <span>Advanced rule explanations</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Strategy suggestions</span>
              </li>
            </ul>
            <p className="text-lg font-bold mb-4">$4.99/month</p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <SubscriptionButton />
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import StonerFeePoolActions from '../components/StonerFeePoolActions';

export default function StonerStaking() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-center sm:text-left">Stoner NFT Staking</h1>
        <Link 
          to="/" 
          className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold text-sm shadow hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors rounded-lg flex items-center gap-2"
        >
          ← Back to Swap Pools
        </Link>
      </div>
      <StonerFeePoolActions />
    </div>
  );
}

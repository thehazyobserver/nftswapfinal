import React from 'react';
import StonerFeePoolActions from '../components/StonerFeePoolActions';

export default function StonerStaking() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🍃</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Stoner NFT Staking
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          Stake your Stoner NFTs to earn multiple token rewards and participate in the ecosystem
        </p>
      </div>
      <StonerFeePoolActions />
    </div>
  );
}

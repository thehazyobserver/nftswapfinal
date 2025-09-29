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
        
        {/* Get Stoner NFTs Link */}
        <div className="mt-6">
          <a 
            href="https://nft.paintswap.io/sonic/collections/stoner-404/listings" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <span className="text-lg">🛒</span>
            Get Stoner NFTs
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
      <StonerFeePoolActions />
    </div>
  );
}

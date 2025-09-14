import React, { useState } from 'react'
import PoolList from './components/PoolList'

export default function App() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">NFT Swap Dashboard</h1>
          <div>
            <small className="text-sm text-gray-500">Sonic Network</small>
          </div>
        </header>

        <main>
          <PoolList />
        </main>
      </div>
    </div>
  )
}

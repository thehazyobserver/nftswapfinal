import React, { useState } from 'react'
import PoolList from './components/PoolList'

export default function App() {
  return (
    <div className="min-h-screen p-0 bg-gradient-to-br from-indigo-100 via-white to-blue-200">
      <div className="max-w-5xl mx-auto p-6">
        <header className="flex items-center justify-between mb-10 py-6 px-4 rounded-lg shadow-lg bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src="/logo192.png" alt="Logo" className="w-10 h-10 rounded-full shadow" />
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400 bg-clip-text text-transparent drop-shadow">NFT Swap Dashboard</h1>
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-sm shadow">Sonic Network</span>
          </div>
        </header>
        <main>
          <PoolList />
        </main>
      </div>
    </div>
  )
}

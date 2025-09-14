import React, { useState } from 'react'
import PoolList from './components/PoolList'

export default function App() {
  React.useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])
  return (
    <div className="min-h-screen p-0 bg-gradient-to-br from-primary via-secondary to-surface dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-surface">
      <div className="max-w-2xl mx-auto p-2 sm:p-4 md:p-6 w-full">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-6 py-4 px-2 sm:px-4 rounded-lg shadow-lg bg-card/90 dark:bg-card/90 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo192.png" alt="Logo" className="w-10 h-10 rounded-full shadow" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-300 bg-clip-text text-transparent drop-shadow">NFT Swap Dashboard</h1>
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-accent/20 text-accent rounded-full font-semibold text-xs sm:text-sm shadow">Sonic Network</span>
          </div>
        </header>
        <main>
          <PoolList />
        </main>
      </div>
    </div>
  )
}

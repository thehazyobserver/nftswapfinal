import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PoolList from './components/PoolList';
import SwapDiagnostics from './components/SwapDiagnostics';
import StonerStaking from './pages/StonerStaking';

export default function App() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, default to true (dark mode)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      return stored === 'light' ? false : true
    }
    return true
  })
  
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    // Persist theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])
  
  return (
    <div className="min-h-screen p-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-gray-900 dark:to-slate-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6 w-full">
          <header className="flex flex-col sm:flex-row items-center justify-between mb-6 py-4 px-2 sm:px-4 rounded-lg shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-md gap-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full shadow flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏊</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400 bg-clip-text text-transparent drop-shadow">NFT Swap Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              {location.pathname === '/' && (
                <Link to="/staking" className="px-4 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold text-sm shadow hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors">Stoner Staking</Link>
              )}
              {location.pathname === '/staking' && (
                <Link to="/" className="px-4 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold text-sm shadow hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center gap-2">
                  ← Back to Swap Pools
                </Link>
              )}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                title="Toggle theme"
              >
                {isDark ? '🌙' : '☀️'}
              </button>
              <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full font-semibold text-xs sm:text-sm shadow">Sonic Network</span>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={
                <>
                  <SwapDiagnostics />
                  <div className="mt-6">
                    <PoolList />
                  </div>
                </>
              } />
              <Route path="/staking" element={<StonerStaking />} />
            </Routes>
          </main>
        </div>
      </div>
  );
}

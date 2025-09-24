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
          <header className="flex flex-col sm:flex-row items-center justify-between mb-8 py-6 px-4 sm:px-6 rounded-2xl shadow-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg gap-4 border border-gray-200 dark:border-gray-700 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-blue-500 to-teal-500 rounded-xl shadow-lg flex items-center justify-center group-hover:shadow-glow transition-all duration-300">
                <span className="text-white font-bold text-xl">🏊</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400 bg-clip-text text-transparent">
                  NFT Swap Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                  Decentralized NFT trading on Sonic Network
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {location.pathname === '/' && (
                <Link to="/staking" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                  🍃 Stoner Staking
                </Link>
              )}
              {location.pathname === '/staking' && (
                <Link to="/" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
                  ← Back to Swap Pools
                </Link>
              )}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                title="Toggle theme"
              >
                <span className="text-lg">{isDark ? '🌙' : '☀️'}</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 text-indigo-800 dark:text-indigo-200 rounded-xl font-semibold text-sm shadow-sm border border-indigo-200 dark:border-indigo-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Sonic Network
              </div>
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

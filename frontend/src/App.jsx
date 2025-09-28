import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PoolList from './components/PoolList';
import StonerStaking from './pages/StonerStaking';
import NetworkChecker from './components/NetworkChecker';
import { ToastProvider } from './components/ToastProvider';
import { WalletProvider } from './components/WalletProvider';
import WalletButton from './components/WalletButton';

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
    <WalletProvider>
      <ToastProvider>
        <div className="min-h-screen p-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-gray-900 dark:to-slate-900 text-gray-900 dark:text-gray-100">
        <NetworkChecker />
        <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6 w-full">
          <header className="flex flex-col sm:flex-row items-center justify-between mb-8 py-6 px-4 sm:px-6 rounded-2xl shadow-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg gap-4 border border-gray-200 dark:border-gray-700 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-blue-500 to-teal-500 rounded-xl shadow-lg flex items-center justify-center group-hover:shadow-glow transition-all duration-300 overflow-hidden">
                <img 
                  src="/pass-the-jpeg-logo.png" 
                  alt="PASS THE JPEG Logo" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <span className="text-white font-bold text-xl hidden">🤝</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400 bg-clip-text text-transparent">
                  PASS THE JPEG
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                  SWAP YOUR NFTS WITH NFTS IN THE SWAP POOLS
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
              <WalletButton />
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
          
          {/* Experimental Protocol Warning */}
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-lg animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm mb-1">
                  Experimental Protocol Warning
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                  This is an experimental protocol that has not been audited. Use at your own risk. 
                  Only interact with funds you can afford to lose. Smart contracts may contain bugs or vulnerabilities.
                </p>
              </div>
            </div>
          </div>

          <main>
            <Routes>
              <Route path="/" element={<PoolList />} />
              <Route path="/staking" element={<StonerStaking />} />
            </Routes>
          </main>
        </div>
      </div>
    </ToastProvider>
  </WalletProvider>
  );
}

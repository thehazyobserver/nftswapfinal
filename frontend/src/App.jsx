import React, { useState } from 'react'
import PoolList from './components/PoolList'

export default function App() {
  const [isDark, setIsDark] = useState(true)
  
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])
  
  return (
    <div className="min-h-screen p-0 bg-gradient-to-br from-primary via-secondary to-surface dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-surface">
      <div className="max-w-6xl mx-auto p-2 sm:p-4 md:p-6 w-full">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-6 py-4 px-2 sm:px-4 rounded-lg shadow-lg bg-card/90 dark:bg-card/90 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-indigo-600 rounded-full shadow flex items-center justify-center">
              <span className="text-white font-bold text-lg">🏊</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-300 bg-clip-text text-transparent drop-shadow">NFT Swap Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              title="Toggle theme"
            >
              {isDark ? '🌙' : '☀️'}
            </button>
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

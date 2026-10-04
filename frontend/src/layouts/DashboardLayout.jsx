import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#111512] text-[#f4f4ed]">
      {/* Mobile overlay */}
      {menuOpen && (
        <button
          aria-label="Tutup menu navigasi"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-[2px] md:hidden"
        />
      )}

      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-h-screen flex-col md:pl-[252px]">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-10 xl:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Factory, User, Settings, Shield, Wrench, Menu, X } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  onAdminPanel?: () => void
  onAssemblyTracking?: () => void
  onHome?: () => void
}

export function Layout({ children, onAdminPanel, onAssemblyTracking, onHome }: LayoutProps) {
  const { user, userProfile, signOut, isAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={onHome}
              className="flex items-center space-x-3 group"
              aria-label="Ana ekrana dön"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-gray-950">İmalat Takip Sistemi</h1>
            </button>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {isAdmin && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-gray-700">
                <User className="w-5 h-5" />
                <div className="text-sm">
                  <div>{userProfile?.full_name || user?.email}</div>
                  {userProfile?.role && userProfile.role !== 'user' && (
                    <div className="text-xs text-gray-500 capitalize">{userProfile.role}</div>
                  )}
                </div>
              </div>
              {/* Desktop actions */}
              <div className="hidden sm:flex items-center gap-2">
                {onAssemblyTracking && (
                  <button 
                    onClick={onAssemblyTracking}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Wrench className="w-5 h-5" />
                    <span className="text-sm">Montaj Takip</span>
                  </button>
                )}
                {isAdmin && onAdminPanel && (
                  <button 
                    onClick={onAdminPanel}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm">Yönetim</span>
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Çıkış</span>
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                aria-label="Menü"
                onClick={() => setMobileOpen(v => !v)}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="sm:hidden border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-2">
            {onAssemblyTracking && (
              <button
                onClick={() => { setMobileOpen(false); onAssemblyTracking() }}
                className="w-full flex items-center justify-start gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Wrench className="w-5 h-5" />
                <span className="text-sm">Montaj Takip</span>
              </button>
            )}
            {isAdmin && onAdminPanel && (
              <button
                onClick={() => { setMobileOpen(false); onAdminPanel() }}
                className="w-full flex items-center justify-start gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm">Yönetim</span>
              </button>
            )}
            <button
              onClick={() => { setMobileOpen(false); handleSignOut() }}
              className="w-full flex items-center justify-start gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Çıkış</span>
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
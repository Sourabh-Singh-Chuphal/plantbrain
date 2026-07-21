import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Shield,
  Network,
  Settings,
  User,
  ShieldCheck,
  Bot,
  Sun,
  Moon,
} from 'lucide-react'
import LoginModal from './LoginModal'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/copilot',    icon: MessageSquare,   label: 'Copilot'   },
  { to: '/compliance', icon: Shield,          label: 'Compliance'},
  { to: '/graph',      icon: Network,         label: 'Graph'     },
  { to: '/settings',   icon: Settings,        label: 'Settings'  },
]

export default function Sidebar() {
  const [showLogin, setShowLogin] = useState(false)
  const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark-mode'))
  const [currentUser, setCurrentUser] = useState({
    name: 'Admin',
    role: 'Plant Safety Officer',
    email: 'admin@vindhyasteel.com',
  })

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }

  return (
    <>
      <nav
        style={{
          width: 44,
          minHeight: '100vh',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          paddingBottom: 16,
          gap: 4,
          flexShrink: 0,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(61, 99, 70, 0.25)',
          }}
        >
          <Bot size={18} strokeWidth={2.2} />
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: isActive ? 'var(--teal-dim)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--teal)' : '2px solid transparent',
                color: isActive ? 'var(--teal)' : 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.15s, background 0.15s',
              })}
            >
              <Icon size={18} />
            </NavLink>
          ))}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Warm Cream Mode' : 'Switch to Dark Enterprise Mode'}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            transition: 'all 0.15s',
          }}
        >
          {isDark ? <Sun size={16} style={{ color: 'var(--amber)' }} /> : <Moon size={16} style={{ color: 'var(--teal)' }} />}
        </button>

        {/* User Login / Auth Avatar Icon */}
        <button
          onClick={() => setShowLogin(true)}
          title={`Logged in as ${currentUser.name} (${currentUser.role})`}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '1px solid var(--teal)',
            color: 'var(--teal)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <User size={16} />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--teal)',
              border: '1px solid var(--surface)',
            }}
          />
        </button>
      </nav>

      {/* Auth Modal */}
      {showLogin && (
        <LoginModal
          user={currentUser}
          onClose={() => setShowLogin(false)}
          onLogin={updated => setCurrentUser(updated)}
        />
      )}
    </>
  )
}

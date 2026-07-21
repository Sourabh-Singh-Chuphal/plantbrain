import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, User, ShieldCheck, CheckCircle, X, Building2, KeyRound } from 'lucide-react'

interface Props {
  onClose: () => void
  user: { name: string; role: string; email: string }
  onLogin: (user: { name: string; role: string; email: string }) => void
}

export default function LoginModal({ onClose, user, onLogin }: Props) {
  const [email, setEmail] = useState(user.email || 'admin@vindhyasteel.com')
  const [password, setPassword] = useState('••••••••••••')
  const [role, setRole] = useState(user.role || 'Plant Safety Officer')
  const [loggedIn, setLoggedIn] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoggedIn(true)
    onLogin({ name: email.split('@')[0], role, email })
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 440, maxWidth: '90vw' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase' }}>ENTERPRISE SINGLE SIGN-ON</span>

              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>PlantBrain Auth</h3>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>

          {loggedIn ? (
            <div style={{ padding: 24, textAlign: 'center', background: 'var(--teal-dim)', borderRadius: 8, border: '1px solid var(--teal)' }}>
              <CheckCircle size={36} style={{ color: 'var(--teal)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>Authentication Successful</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Logged in as {email} ({role})</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Facility Site</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 13, border: '1px solid var(--border)' }}>
                  <Building2 size={16} style={{ color: 'var(--teal)' }} /> Vindhya Steelworks Pvt. Ltd. (Zone 1)
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>User Role & Permissions</label>
                <select
                  className="input-dark"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option>Plant Safety Officer (Level 4)</option>
                  <option>Maintenance Lead Engineer</option>
                  <option>Compliance & Quality Auditor</option>
                  <option>Operations Director</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Enterprise Email</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-dark"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ paddingLeft: 34, width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SSO Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-dark"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingLeft: 34, width: '100%' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: 'var(--amber)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginTop: 8,
                }}
              >
                Authenticate Session
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

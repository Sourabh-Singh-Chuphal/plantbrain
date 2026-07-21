import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Copilot from './pages/Copilot'
import Compliance from './pages/Compliance'
import GraphExplorer from './pages/GraphExplorer'
import Timeline from './pages/Timeline'

import Settings from './pages/Settings'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/copilot" element={<Layout><Copilot /></Layout>} />
        <Route path="/compliance" element={<Layout><Compliance /></Layout>} />
        <Route path="/graph" element={<Layout><GraphExplorer /></Layout>} />
        <Route path="/timeline/:tag" element={<Layout><Timeline /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}


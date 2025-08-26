import React from 'react'
import { Routes, Route, Link, NavLink } from 'react-router-dom'
import { WalletProvider } from './contexts/WalletContext'
import CreateFundPage from './pages/CreateFundPage'
import InvestorPortalPage from './pages/InvestorPortalPage'
import ManagerDashboard from './pages/ManagerDashboard'
import WalletStatus from './components/WalletStatus'

const App: React.FC = () => {
  return (
    <WalletProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 bg-white/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
            <NavLink to="/" className="font-semibold">Fund Portal</NavLink>
            <nav className="ml-auto flex gap-3 text-sm">
              <NavLink to="/create" className="px-3 py-1.5 rounded hover:bg-gray-100">Create Fund</NavLink>
              <NavLink to="/investor" className="px-3 py-1.5 rounded hover:bg-gray-100">Investor Portal</NavLink>
              <NavLink to="/dashboard/manager" className="px-3 py-1.5 rounded hover:bg-gray-100">Manager Dashboard</NavLink>
            </nav>
            <div className="ml-2"><WalletStatus /></div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border bg-white">
                  <h2 className="text-xl font-bold mb-2">Create a Fund</h2>
                  <p className="text-gray-600 mb-4">Launch a new fund via Enzyme FundDeployer.</p>
                  <Link to="/create" className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white">Open</Link>
                </div>
                <div className="p-6 rounded-2xl border bg-white">
                  <h2 className="text-xl font-bold mb-2">Investor Portal</h2>
                  <p className="text-gray-600 mb-4">Subscribe/Redeem with an ERC-4626 vault.</p>
                  <Link to="/investor" className="inline-block px-4 py-2 rounded-lg border">Open</Link>
                </div>
              </div>
            }/>
            <Route path="/create" element={<CreateFundPage />} />
            <Route path="/investor" element={<InvestorPortalPage />} />
            <Route path="/dashboard/manager" element={<ManagerDashboard />} />
          </Routes>
        </main>
      </div>
    </WalletProvider>
  )
}
export default App

import React from 'react'
import { useWallet } from '../contexts/WalletContext'

const WalletConnectionPrompt: React.FC<{roleToConnect: 'manager'|'investor', message?: string, subMessage?: string}> = ({ roleToConnect, message, subMessage }) => {
  const { connect, setRole } = useWallet()
  return (
    <div className="p-6 rounded-2xl border bg-white max-w-xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-2">{message || '請連接錢包'}</h2>
      {subMessage && <p className="text-gray-600 mb-4">{subMessage}</p>}
      <div className="flex justify-center gap-2 mb-4">
        <button onClick={()=>setRole('manager')} className={`px-3 py-1.5 rounded border`}>Manager</button>
        <button onClick={()=>setRole('investor')} className={`px-3 py-1.5 rounded border`}>Investor</button>
      </div>
      <button onClick={connect} className="px-4 py-2 rounded-lg bg-blue-600 text-white">連接錢包</button>
      <p className="text-xs text-gray-500 mt-3">需要瀏覽器錢包 (MetaMask 等)。</p>
    </div>
  )
}
export default WalletConnectionPrompt

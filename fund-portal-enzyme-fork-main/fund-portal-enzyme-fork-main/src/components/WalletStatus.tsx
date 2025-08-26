import React, { useEffect, useMemo, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'

function shorten(addr: string, n = 4) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-n)}`
}

function chainName(id: bigint | number | null) {
  if (id === 1n || id === 1) return 'Ethereum'
  if (id === 11155111n || id === 11155111) return 'Sepolia'
  if (!id) return '—'
  return `Chain ${id.toString()}`
}

const WalletStatus: React.FC = () => {
  const { provider, address, isConnected, connect, disconnect, role, setRole } = useWallet()
  const [open, setOpen] = useState(false)
  const [chainId, setChainId] = useState<bigint | null>(null)

  useEffect(() => {
    let sub: any
    async function load() {
      if (!provider) { setChainId(null); return }
      const net = await provider.getNetwork()
      setChainId(net?.chainId ?? null)
      const eth = (window as any).ethereum
      if (eth?.on) {
        sub = (cid: any) => setChainId(BigInt(cid))
        eth.on('chainChanged', sub)
      }
    }
    load()
    return () => {
      const eth = (window as any).ethereum
      if (eth?.removeListener && sub) eth.removeListener('chainChanged', sub)
    }
  }, [provider])

  const dotClass = useMemo(() => {
    if (!isConnected) return 'bg-gray-300'
    if (chainId === 11155111n) return 'bg-emerald-500'
    return 'bg-amber-500'
  }, [isConnected, chainId])

  return (
    <div className="relative">
      {!isConnected ? (
        <button onClick={connect} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm">
          Connect Wallet
        </button>
      ) : (
        <button onClick={() => setOpen(v=>!v)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white text-sm hover:bg-gray-50">
          <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`}></span>
          <span className="font-mono">{shorten(address)}</span>
          <span className="text-gray-500 hidden sm:inline">· {chainName(chainId)}</span>
        </button>
      )}

      {open && isConnected && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-md p-2 z-50">
          <div className="px-2 py-1 text-xs text-gray-500">Connected</div>
          <div className="px-2 py-1 font-mono text-sm break-all">{address}</div>
          <div className="my-2 border-t" />
          <div className="px-2 py-1 text-xs text-gray-500">Role</div>
          <div className="px-2 py-2 flex gap-2">
            <button onClick={()=>setRole('manager')} className={`px-2 py-1 rounded border text-xs ${role==='manager'?'bg-gray-900 text-white':'bg-white'}`}>Manager</button>
            <button onClick={()=>setRole('investor')} className={`px-2 py-1 rounded border text-xs ${role==='investor'?'bg-gray-900 text-white':'bg-white'}`}>Investor</button>
          </div>
          <div className="my-2 border-t" />
          <div className="px-2 py-1 flex flex-col gap-1">
            <button
              onClick={() => { navigator.clipboard.writeText(address); }}
              className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm">
              Copy address
            </button>
            <button
              onClick={() => { setOpen(false); disconnect(); }}
              className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm text-red-600">
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletStatus

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'

type Role = 'manager' | 'investor'

type WalletCtx = {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  address: string
  isConnected: boolean
  role: Role
  connect: () => Promise<void>
  disconnect: () => void
  setRole: (r: Role) => void
}

const Ctx = createContext<WalletCtx>(null as any)

export const WalletProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [address, setAddress] = useState('')
  const [role, setRole] = useState<Role>('manager')

  useEffect(() => {
    if ((window as any).ethereum) {
      const p = new ethers.BrowserProvider((window as any).ethereum)
      setProvider(p)
    }
  }, [])

  const connect = async () => {
    if (!provider) throw new Error('No wallet found')
    await provider.send('eth_requestAccounts', [])
    const s = await provider.getSigner()
    setSigner(s)
    setAddress(await s.getAddress())
  }

  const disconnect = () => {
    setSigner(null)
    setAddress('')
  }

  const value = useMemo(() => ({
    provider, signer, address,
    isConnected: !!signer && !!address,
    role, setRole,
    connect, disconnect,
  }), [provider, signer, address, role])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useWallet = () => useContext(Ctx)

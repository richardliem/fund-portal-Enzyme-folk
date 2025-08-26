import React, { useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../contexts/WalletContext'

const ERC20_ABI = [
  { "constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function" },
  { "constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function" },
  { "constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function" },
]

const ERC4626_ABI = [
  { "inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],"name":"deposit","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"redeem","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"withdraw","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[],"name":"asset","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function" },
]

const InvestorPortalPage: React.FC = () => {
  const { signer, isConnected, address, connect } = useWallet()
  const [vault, setVault] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('')

  const ready = isConnected && signer && vault

  async function ensureSepolia() {
    if (!signer) return
    const provider = signer.provider as ethers.BrowserProvider
    const net = await provider.getNetwork()
    if ((net?.chainId ?? 0n) !== 11155111n) {
      const w = (window as any).ethereum
      if (!w) throw new Error('No injected wallet')
      await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
    }
  }

  async function getAssetAndDecimals(vaultAddr: string){
    if (!signer) throw new Error('no signer')
    const provider = signer.provider as ethers.BrowserProvider
    const v = new ethers.Contract(vaultAddr, ERC4626_ABI, provider)
    const asset = await v.asset()
    const erc20 = new ethers.Contract(asset, ERC20_ABI, provider)
    const d = await erc20.decimals()
    return { asset, decimals: Number(d) }
  }

  async function approve(spender: string, amount: bigint, asset: string){
    const provider = signer!.provider as ethers.BrowserProvider
    const erc20 = new ethers.Contract(asset, ERC20_ABI, provider).connect(signer!)
    const tx = await erc20.approve(spender, amount)
    setStatus(`Approve tx: ${tx.hash}`)
    await tx.wait()
  }

  async function onDeposit() {
    if (!ready) { await connect(); return }
    await ensureSepolia()
    const { asset, decimals } = await getAssetAndDecimals(vault)
    const provider = signer!.provider as ethers.BrowserProvider
    const v = new ethers.Contract(vault, ERC4626_ABI, provider).connect(signer!)
    const amt = ethers.parseUnits(amount || '0', decimals)
    await approve(vault, amt, asset)
    const tx = await v.deposit(amt, address)
    setStatus(`Deposit tx: ${tx.hash}`)
    await tx.wait()
    setStatus(`Deposit confirmed: ${tx.hash}`)
  }

  async function onWithdraw() {
    if (!ready) { await connect(); return }
    await ensureSepolia()
    const provider = signer!.provider as ethers.BrowserProvider
    const v = new ethers.Contract(vault, ERC4626_ABI, provider).connect(signer!)
    const shares = ethers.parseUnits(amount || '0', 18)
    const tx = await v.withdraw(shares, address, address)
    setStatus(`Withdraw tx: ${tx.hash}`)
    await tx.wait()
    setStatus(`Withdraw confirmed: ${tx.hash}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="p-6 rounded-2xl border bg-white">
        <h2 className="text-xl font-bold mb-3">Investor Portal (ERC-4626)</h2>
        <label className="block text-sm font-medium">Vault Address</label>
        <input value={vault} onChange={e=>setVault(e.target.value)} placeholder="0x..." className="w-full px-3 py-2 border rounded mb-3" />
        <label className="block text-sm font-medium">Amount</label>
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 100" className="w-full px-3 py-2 border rounded mb-4" />
        <div className="flex gap-2">
          <button onClick={onDeposit} className="px-4 py-2 rounded bg-blue-600 text-white">Deposit</button>
          <button onClick={onWithdraw} className="px-4 py-2 rounded border">Withdraw</button>
        </div>
        <p className="text-sm text-gray-600 mt-3 break-all">{status}</p>
      </div>
    </div>
  )
}
export default InvestorPortalPage

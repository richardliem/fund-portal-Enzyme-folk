import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import WalletConnectionPrompt from '../components/WalletConnectionPrompt';

const ADDR = {
  FUND_DEPLOYER: import.meta.env.VITE_FUND_DEPLOYER_ADDRESS as string,
  ENTRANCE_RATE_DIRECT_FEE: import.meta.env.VITE_ENTRANCE_RATE_DIRECT_FEE as string,
  ALLOW_DEPOSIT_RECIPIENTS_POLICY: import.meta.env.VITE_ALLOW_DEPOSIT_RECIPIENTS_POLICY as string,
  USDC: import.meta.env.VITE_USDC_ADDRESS as string,
  WETH: import.meta.env.VITE_WETH_ADDRESS as string,
};
const DENOMINATION_ASSET_ADDRESSES: Record<string, string> = {
  USDC: ADDR.USDC,
  WETH: ADDR.WETH,
  ASVT: (import.meta.env.VITE_ASVT_ADDRESS as string) || '',
};

const FUND_DEPLOYER_ABI_TUPLE = [{ "inputs":[{"internalType":"address","name":"_fundOwner","type":"address"},{"internalType":"string","name":"_fundName","type":"string"},{"internalType":"string","name":"_fundSymbol","type":"string"},{"components":[{"internalType":"address","name":"denominationAsset","type":"address"},{"internalType":"uint256","name":"sharesActionTimelock","type":"uint256"},{"internalType":"bytes","name":"feeManagerConfigData","type":"bytes"},{"internalType":"bytes","name":"policyManagerConfigData","type":"bytes"},{"components":[{"internalType":"address","name":"extension","type":"address"},{"internalType":"bytes","name":"configData","type":"bytes"}],"internalType":"struct IComptroller.ExtensionConfigInput[]","name":"extensionsConfig","type":"tuple[]"}],"internalType":"struct IComptroller.ConfigInput","name":"_comptrollerConfig","type":"tuple"}],"name":"createNewFund","outputs":[{"internalType":"address","name":"comptrollerProxy_","type":"address"},{"internalType":"address","name":"vaultProxy_","type":"address"}],"stateMutability":"nonpayable","type":"function"}] as const;
const FUND_DEPLOYER_ABI_FLAT = [{ "inputs":[{"internalType":"address","name":"_fundOwner","type":"address"},{"internalType":"string","name":"_fundName","type":"string"},{"internalType":"string","name":"_fundSymbol","type":"string"},{"internalType":"address","name":"_denominationAsset","type":"address"},{"internalType":"uint256","name":"_sharesActionTimelock","type":"uint256"},{"internalType":"bytes","name":"_feeManagerConfigData","type":"bytes"},{"internalType":"bytes","name":"_policyManagerConfigData","type":"bytes"}],"name":"createNewFund","outputs":[{"internalType":"address","name":"comptrollerProxy_","type":"address"},{"internalType":"address","name":"vaultProxy_","type":"address"}],"stateMutability":"nonpayable","type":"function"}] as const;

async function ensureSepolia(signer: ethers.Signer) {
  const provider = signer.provider as ethers.BrowserProvider | null;
  if (!provider) return;
  const net = await provider.getNetwork();
  if ((net?.chainId ?? 0n) !== 11155111n) {
    const w = (window as any).ethereum;
    if (!w) throw new Error('No injected wallet');
    await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
  }
}

const CreateFundPage: React.FC = () => {
  const { signer, isConnected, role, connect } = useWallet();
  const navigate = useNavigate();

  const [fundName, setFundName] = useState('');
  const [fundSymbol, setFundSymbol] = useState('');
  const [denominationAsset, setDenominationAsset] = useState<'USDC'|'WETH'|'ASVT'>('USDC');
  const [entranceRate, setEntranceRate] = useState(1);
  const [useMinimal, setUseMinimal] = useState(true); // NEW: start with minimal config to avoid fee/policy issues
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advBypassSim, setAdvBypassSim] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [predictedComptroller, setPredictedComptroller] = useState<string>('');
  const [predictedVault, setPredictedVault] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) { await connect(); return; }
    if (!fundName.trim() || !fundSymbol.trim()) { alert('請填寫基金名稱和代號。'); return; }

    setError(''); setTxHash(''); setIsSubmitting(true);
    try {
      await ensureSepolia(signer);
      const provider = signer.provider as ethers.BrowserProvider;
      const code = await provider.getCode(ADDR.FUND_DEPLOYER);
      if (!code || code === '0x') throw new Error('FUND_DEPLOYER 不是合約地址（請檢查 .env 的地址與網路）');

      const me = await signer.getAddress();
      const assetAddress = DENOMINATION_ASSET_ADDRESSES[denominationAsset];
      if (!assetAddress) throw new Error(`不支援的計價資產: ${denominationAsset}`);

      const lockupEl = document.getElementById('lockupPeriod') as HTMLInputElement | null;
      const lockupHours = lockupEl ? Number(lockupEl.value || '0') : 0;
      const sharesActionTimelock = BigInt(Math.max(0, Math.floor(lockupHours * 3600)));

      const coder = ethers.AbiCoder.defaultAbiCoder();

      const feeManagerConfigData = useMinimal
        ? coder.encode(['address[]','bytes[]'], [[],[]])
        : (function(){
            const entranceRateBps = BigInt(Math.floor((entranceRate ?? 0) * 100));
            const feeRecipient = me;
            const entranceFeeSettings = coder.encode(['uint256','address'], [entranceRateBps, feeRecipient]);
            return coder.encode(['address[]','bytes[]'], [[ADDR.ENTRANCE_RATE_DIRECT_FEE],[entranceFeeSettings]]);
          })();

      const policyManagerConfigData = coder.encode(['address[]','bytes[]'], [[],[]]); // keep empty first

      const tuple = new ethers.Contract(ADDR.FUND_DEPLOYER, FUND_DEPLOYER_ABI_TUPLE, provider).connect(signer);
      const flat  = new ethers.Contract(ADDR.FUND_DEPLOYER, FUND_DEPLOYER_ABI_FLAT, provider).connect(signer);
      const comptrollerConfig = { denominationAsset: assetAddress, sharesActionTimelock, feeManagerConfigData, policyManagerConfigData, extensionsConfig: [] as Array<{extension: string; configData: string}> };

      // 先 simulate（static call）
      let predicted: [string,string] = ['',''];
      if (!advBypassSim) {
        try {
          predicted = await tuple.createNewFund.staticCall(me, fundName, fundSymbol, comptrollerConfig);
        } catch (e1) {
          try {
            predicted = await flat.createNewFund.staticCall(me, fundName, fundSymbol, assetAddress, sharesActionTimelock, feeManagerConfigData, policyManagerConfigData);
          } catch (e2) {
            console.warn('staticCall failed, but will continue if bypass is enabled or sending directly...', e2);
            if (advBypassSim) predicted = ['',''];
            else throw e2;
          }
        }
      }
      setPredictedComptroller(predicted[0]||''); setPredictedVault(predicted[1]||'');

      // 送交易
      let tx;
      if (advBypassSim) {
        // 強制使用平面 ABI 並以 "0x" 空 bytes 作為 fee/policy
        tx = await flat.createNewFund(me, fundName, fundSymbol, assetAddress, sharesActionTimelock, '0x', '0x');
      } else {
        try { tx = await tuple.createNewFund(me, fundName, fundSymbol, comptrollerConfig); }
        catch (e2) { tx = await flat.createNewFund(me, fundName, fundSymbol, assetAddress, sharesActionTimelock, feeManagerConfigData, policyManagerConfigData); }
      }
      try {
        tx = await tuple.createNewFund(me, fundName, fundSymbol, comptrollerConfig);
      } catch (e2) {
        tx = await flat.createNewFund(me, fundName, fundSymbol, assetAddress, sharesActionTimelock, feeManagerConfigData, policyManagerConfigData);
      }
      setTxHash(tx.hash);
      await tx.wait();

      alert('基金創建成功！');
      navigate('/dashboard/manager');
    } catch (err: any) {
      const details = JSON.stringify({ code: err?.code, reason: err?.reason, shortMessage: err?.shortMessage, data: err?.data, message: err?.message }, null, 2);
      console.error('createNewFund failed:', details);
      const msg = err?.reason || err?.shortMessage || err?.message || '發生未知錯誤';
      setError(msg);
      alert(`基金創建失敗: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || role !== 'manager') {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <WalletConnectionPrompt roleToConnect="manager" message="請連接您的基金經理錢包" subMessage="您必須以基金經理身份登入才能創建新基金。" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="w-full md:w-1/4 p-8 bg-gray-50 border-r border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800 mb-8">創建您的基金</h1>
          </div>
          <div className="w-full md:w-3/4 p-8 md:p-12">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">基金名稱</label>
                  <input value={fundName} onChange={e=>setFundName(e.target.value)} placeholder="例如：穩健增長一號" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">基金代號</label>
                  <input value={fundSymbol} onChange={e=>setFundSymbol(e.target.value)} placeholder="例如：SGF01" className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">計價資產</label>
                  <select value={denominationAsset} onChange={e=>setDenominationAsset(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg">
                    <option value="USDC">USDC - USD Coin</option>
                    <option value="WETH">WETH - Wrapped Ether</option>
                  </select>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">申購費 (Entrance Fee)</h3>
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={!useMinimal} onChange={e=>setUseMinimal(!e.target.checked)} />
                      啟用 Entrance Fee
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-gray-700">費率 (%)</label>
                  <input type="number" value={entranceRate} onChange={e=>setEntranceRate(Number(e.target.value))} className="w-full mt-1 px-4 py-2 border rounded-lg" disabled={useMinimal} />
                  <p className="text-xs text-gray-500 mt-1">{useMinimal ? '目前以最小設定部署（暫不啟用任何費用/政策），先確認能成功創建。' : '會以 EntranceRateDirectFee 設定進行部署。'}</p>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold">份額鎖倉期</h3>
                  <label className="block text-sm font-medium text-gray-700">鎖倉時間 (小時)</label>
                  <input id="lockupPeriod" type="number" defaultValue={0} className="w-full mt-1 px-4 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={advBypassSim} onChange={e=>setAdvBypassSim(e.target.checked)} />
                  Advanced：跳過本地模擬（可能繞過 MetaMask circuit breaker，僅供測試）
                </label>
              </div>
              <div className="mt-6">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg" disabled={isSubmitting || !fundName || !fundSymbol}>
                  {isSubmitting ? '交易處理中...' : '創建基金'}
                </button>
              </div>
              <div className="mt-6 text-sm space-y-2">
                {predictedComptroller && <p className="break-all">Predicted Comptroller: <b>{predictedComptroller}</b></p>}
                {predictedVault && <p className="break-all">Predicted Vault: <b>{predictedVault}</b></p>}
                {txHash && <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-blue-500 underline break-all">在 Sepolia Etherscan 上查看</a>}
                {error && <p className="text-red-600 font-semibold">錯誤: {error}</p>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFundPage;
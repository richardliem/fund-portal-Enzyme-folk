import React from 'react'
const ManagerDashboard: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl border bg-white">
      <h2 className="text-xl font-bold mb-2">Manager Dashboard</h2>
      <p className="text-gray-600">在這裡顯示你創建的基金、Vault 地址、AUM、費用等（可日後擴充）。</p>
    </div>
  )
}
export default ManagerDashboard

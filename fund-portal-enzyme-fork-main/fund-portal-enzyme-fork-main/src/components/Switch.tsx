import React from 'react'
type Props = { checked: boolean; onChange: (v:boolean)=>void }
const Switch: React.FC<Props> = ({ checked, onChange }) => {
  return (
    <button type="button"
      onClick={()=>onChange(!checked)}
      className={`inline-flex w-10 h-6 rounded-full transition ${checked?'bg-emerald-500':'bg-gray-300'}`}>
      <span className={`block w-5 h-5 bg-white rounded-full transform transition ${checked?'translate-x-5':'translate-x-0.5'} mt-0.5`}></span>
    </button>
  )
}
export default Switch

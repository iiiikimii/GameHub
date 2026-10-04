import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function FormInput({ label, icon: Icon, type = 'text', ...inputProps }) {
  const inputId = useId()
  const [isVisible, setIsVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="block space-y-2 text-sm font-medium text-white/80" htmlFor={inputId}>
      <span>{label}</span>
      <span className="relative flex items-center">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-4 size-[18px] text-white/40" />
        <input
          {...inputProps}
          id={inputId}
          type={isPassword && isVisible ? 'text' : type}
          className="h-12 w-full rounded-xl border border-white/10 bg-[#171b19] pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#c8f169]/70 focus:ring-2 focus:ring-[#c8f169]/15"
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 grid size-9 place-items-center rounded-lg text-white/50 transition hover:bg-white/5 hover:text-white"
            onClick={() => setIsVisible((visible) => !visible)}
            aria-label={isVisible ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
    </label>
  )
}

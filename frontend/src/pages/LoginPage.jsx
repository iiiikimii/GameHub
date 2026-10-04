import { ArrowRight, AtSign, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout.jsx'
import FormInput from '../components/FormInput.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login({ identifier, password })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Tidak dapat masuk. Periksa koneksi dan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Masuk ke GameHub"
      description="Gunakan username atau email untuk melanjutkan."
      footer={<>Belum punya akun? <Link className="font-semibold text-[#c8f169] hover:text-[#d7fa91]" to="/register">Buat akun</Link></>}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <p className="rounded-xl border border-[#ef8b72]/30 bg-[#ef8b72]/10 px-4 py-3 text-sm text-[#ffad98]" role="alert">{error}</p>}
        <FormInput
          label="Username atau email"
          icon={AtSign}
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <FormInput
          label="Password"
          icon={LockKeyhole}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button disabled={submitting} className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c8f169] px-5 font-semibold text-[#172015] transition hover:bg-[#d7fa91] disabled:cursor-not-allowed disabled:opacity-55">
          {submitting ? 'Memeriksa akun...' : 'Masuk'} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </button>
      </form>
    </AuthLayout>
  )
}

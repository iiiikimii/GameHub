import { ArrowRight, AtSign, LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout.jsx'
import FormInput from '../components/FormInput.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setSubmitting(true)
    try {
      await register(form)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Akun belum dapat dibuat. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Start your run"
      title="Buat akun pemain"
      description="Satu akun untuk menyimpan skor dan bersiap masuk ke papan peringkat."
      footer={<>Sudah punya akun? <Link className="font-semibold text-[#c8f169] hover:text-[#d7fa91]" to="/login">Masuk</Link></>}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="rounded-xl border border-[#ef8b72]/30 bg-[#ef8b72]/10 px-4 py-3 text-sm text-[#ffad98]" role="alert">{error}</p>}
        <FormInput label="Username" icon={UserRound} name="username" autoComplete="username" minLength={3} maxLength={50} pattern="[A-Za-z0-9_]+" value={form.username} onChange={updateField} required />
        <FormInput label="Email" icon={AtSign} type="email" name="email" autoComplete="email" maxLength={254} value={form.email} onChange={updateField} required />
        <FormInput label="Password" icon={LockKeyhole} type="password" name="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={updateField} required />
        <FormInput label="Konfirmasi password" icon={LockKeyhole} type="password" name="confirmPassword" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={updateField} required />
        <button disabled={submitting} className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c8f169] px-5 font-semibold text-[#172015] transition hover:bg-[#d7fa91] disabled:cursor-not-allowed disabled:opacity-55">
          {submitting ? 'Membuat akun...' : 'Buat akun'} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </button>
      </form>
    </AuthLayout>
  )
}

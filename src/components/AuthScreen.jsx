import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'

export default function AuthScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!password.trim() || submitting) {
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await onLogin?.(password)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '验证失败，请重试。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:items-center sm:px-6 sm:py-10 lg:px-8">
      <section className="card w-full max-w-md p-6 sm:p-8">
        <p className="label">身份验证</p>
        <h1 className="section-title">输入访问密码</h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-muted-foreground">访问密码</span>
            <div className="relative">
              <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入访问密码"
                className="surface-input pl-12"
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl border border-negative/30 bg-negative/10 px-4 py-3 text-sm leading-6 text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="control-button-primary w-full disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.02] disabled:text-muted"
          >
            {submitting ? '正在验证...' : '进入面板'}
          </button>
        </form>
      </section>
    </div>
  )
}

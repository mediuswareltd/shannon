import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { useTheme } from '../theme/ThemeContext'

export function SettingsPage(): JSX.Element {
  const { theme, setTheme } = useTheme()
  const [token, setToken] = useState('')
  const [accounts, setAccounts] = useState<{ id: string; login: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const accs = await window.peApi.listAccounts()
      setAccounts(accs)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onAdd(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!token.trim()) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      const res = await window.peApi.addAccount(token.trim())
      setInfo(`Connected as ${res.login}`)
      setToken('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function onRemove(id: string): Promise<void> {
    setError(null)
    setInfo(null)
    try {
      await window.peApi.removeAccount(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-kicker">Shannon</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Sources, appearance, and tokens for this monitor board.</p>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {info ? (
        <div className="banner success">
          <span>{info}</span>
          <button type="button" className="btn ghost" onClick={() => setInfo(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="card card-raised">
        <h2 className="card-title">Appearance</h2>
        <p className="card-subtitle muted">Match your environment — also available from the sidebar.</p>
        <div className="segmented" role="group" aria-label="Theme">
          <button
            type="button"
            className={`segment ${theme === 'light' ? 'is-active' : ''}`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`segment ${theme === 'dark' ? 'is-active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="card card-raised">
        <h2 className="card-title">Integrations</h2>
        <p className="card-subtitle muted">Connect tools you use — Shannon aggregates them on your board.</p>
        <div className="integration-grid">
          <div className="integration-card is-live">
            <div className="integration-card-head">
              <span className="integration-logo gh" aria-hidden />
              <div>
                <div className="integration-card-title">GitHub</div>
                <div className="muted small">Activity, repos, org timelines</div>
              </div>
              <span className="status-pill ok">Active</span>
            </div>
            <p className="muted small integration-card-body">
              {accounts.length === 0
                ? 'Add a token below to connect.'
                : `${accounts.length} account${accounts.length === 1 ? '' : 's'} connected.`}
            </p>
          </div>
          <div className="integration-card is-muted">
            <div className="integration-card-head">
              <span className="integration-logo cu" aria-hidden />
              <div>
                <div className="integration-card-title">ClickUp</div>
                <div className="muted small">Tasks &amp; workspaces</div>
              </div>
              <span className="status-pill soon">Soon</span>
            </div>
            <p className="muted small integration-card-body">We&apos;re wiring this in next — same board, unified view.</p>
          </div>
        </div>
      </section>

      <section className="card card-raised">
        <h2 className="card-title">GitHub access</h2>
        <p className="card-subtitle muted">
          Classic PAT: <code>repo</code> and <code>read:org</code> for org-wide feeds. Fine-grained tokens need equivalent
          access. Tokens use OS encryption when available.
        </p>
        <form className="form" onSubmit={(e) => void onAdd(e)}>
          <label className="field">
            <span>Personal access token</span>
            <input
              type="password"
              autoComplete="off"
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <button type="submit" className="btn primary" disabled={saving || !token.trim()}>
            {saving ? 'Verifying…' : 'Connect GitHub account'}
          </button>
        </form>
      </section>

      <section className="card card-raised">
        <div className="card-header">
          <div>
            <h2 className="card-title">Connected GitHub accounts</h2>
            <p className="card-subtitle muted">Remove a login to revoke access from Shannon.</p>
          </div>
          <button type="button" className="btn ghost" onClick={() => void load()} disabled={loading}>
            Reload
          </button>
        </div>
        {loading ? (
          <p className="muted pad">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="muted pad">No accounts yet.</p>
        ) : (
          <ul className="list-plain">
            {accounts.map((a) => (
              <li key={a.id} className="list-row">
                <div>
                  <div className="strong">{a.login}</div>
                  <div className="muted small">id: {a.id}</div>
                </div>
                <button type="button" className="btn danger" onClick={() => void onRemove(a.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { ActivityRowDTO } from '../../../shared/api'
import { CommitMessages } from '../components/CommitMessages'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { ErrorBanner } from '../components/ErrorBanner'
import { ExternalLink } from '../components/ExternalLink'
import {
  defaultDashboardPrefs,
  loadDashboardPrefs,
  saveDashboardPrefs,
  type DashboardPrefs
} from '../lib/dashboardPrefs'
import { type DateRangeId, rangeStart } from '../lib/dateRange'

function PanelToggle({
  id,
  label,
  description,
  checked,
  onChange
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <label className="pref-row" htmlFor={id}>
      <div className="pref-row-text">
        <span className="pref-row-label">{label}</span>
        <span className="pref-row-desc">{description}</span>
      </div>
      <input
        id={id}
        type="checkbox"
        className="pref-check"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

export function DashboardPage(): JSX.Element {
  const [accounts, setAccounts] = useState<{ id: string; login: string }[]>([])
  const [activity, setActivity] = useState<ActivityRowDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRangeId>('24h')
  const [prefs, setPrefs] = useState<DashboardPrefs>(() => loadDashboardPrefs())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accs, act] = await Promise.all([
        window.peApi.listAccounts(),
        window.peApi.listActivity()
      ])
      setAccounts(accs)
      setActivity(act)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updatePrefs = useCallback((next: DashboardPrefs) => {
    setPrefs(next)
    saveDashboardPrefs(next)
  }, [])

  const inRange = useMemo(() => {
    const start = rangeStart(range)
    return activity.filter((r) => parseISO(r.createdAt) >= start)
  }, [activity, range])

  const recent = inRange.slice(0, 10)

  const mix = useMemo(() => {
    let push = 0
    let issues = 0
    let pr = 0
    for (const r of inRange) {
      if (r.type === 'PushEvent') push += 1
      else if (r.type === 'IssuesEvent' || r.type === 'IssueCommentEvent') issues += 1
      else if (
        r.type === 'PullRequestEvent' ||
        r.type === 'PullRequestReviewEvent' ||
        r.type === 'PullRequestReviewCommentEvent'
      ) {
        pr += 1
      }
    }
    return { push, issues, pr }
  }, [inRange])

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-kicker">Shannon</p>
          <h1 className="page-title">Board</h1>
          <p className="page-subtitle">
            Choose what you want to see below. Data comes from connected sources for the selected period.
          </p>
        </div>
        <div className="header-actions">
          <DateRangeSelect value={range} onChange={setRange} />
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <details className="customize-panel">
        <summary className="customize-summary">
          <span className="customize-title">Customize this board</span>
          <span className="customize-hint">Show or hide panels</span>
        </summary>
        <div className="customize-body">
          <PanelToggle
            id="p-summary"
            label="Summary metrics"
            description="Accounts, events, and repos in range"
            checked={prefs.summaryMetrics}
            onChange={(v) => updatePrefs({ ...prefs, summaryMetrics: v })}
          />
          <PanelToggle
            id="p-activity"
            label="Recent GitHub activity"
            description="Latest events with links and commit lines when available"
            checked={prefs.recentGitHubActivity}
            onChange={(v) => updatePrefs({ ...prefs, recentGitHubActivity: v })}
          />
          <PanelToggle
            id="p-int"
            label="Integrations"
            description="Connection status for GitHub and upcoming tools"
            checked={prefs.integrationStatus}
            onChange={(v) => updatePrefs({ ...prefs, integrationStatus: v })}
          />
          <PanelToggle
            id="p-mix"
            label="Activity mix"
            description="Push vs issue vs PR-style events in this period"
            checked={prefs.eventTypeMix}
            onChange={(v) => updatePrefs({ ...prefs, eventTypeMix: v })}
          />
          <button
            type="button"
            className="btn ghost small customize-reset"
            onClick={() => updatePrefs({ ...defaultDashboardPrefs })}
          >
            Reset to defaults
          </button>
        </div>
      </details>

      {accounts.length === 0 ? (
        <div className="card card-spotlight empty">
          <div className="empty-visual" aria-hidden />
          <h2 className="empty-title">Connect a source</h2>
          <p className="muted empty-copy">
            Start with GitHub (personal access token). ClickUp and more integrations will plug into this same board.
          </p>
          <Link className="btn primary" to="/settings">
            Open settings
          </Link>
        </div>
      ) : (
        <>
          {prefs.integrationStatus ? (
            <section className="card card-flat integration-strip" aria-label="Integrations">
              <div className="integration-pill is-live">
                <span className="integration-dot" />
                <span className="integration-name">GitHub</span>
                <span className="integration-meta">{accounts.length} account{accounts.length === 1 ? '' : 's'}</span>
              </div>
              <div className="integration-pill is-soon">
                <span className="integration-name">ClickUp</span>
                <span className="integration-badge">Soon</span>
              </div>
            </section>
          ) : null}

          {prefs.summaryMetrics ? (
            <div className="grid stats">
              <div className="stat-card">
                <div className="stat-label">Connected accounts</div>
                <div className="stat-value">{accounts.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Events in period</div>
                <div className="stat-value">{inRange.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Repos touched</div>
                <div className="stat-value">{new Set(inRange.map((a) => a.repo)).size}</div>
              </div>
            </div>
          ) : null}

          {prefs.eventTypeMix ? (
            <section className="card card-flat mix-row" aria-label="Activity mix">
              <div className="mix-item">
                <span className="mix-value">{mix.push}</span>
                <span className="mix-label">Push events</span>
              </div>
              <div className="mix-divider" />
              <div className="mix-item">
                <span className="mix-value">{mix.issues}</span>
                <span className="mix-label">Issue activity</span>
              </div>
              <div className="mix-divider" />
              <div className="mix-item">
                <span className="mix-value">{mix.pr}</span>
                <span className="mix-label">PR activity</span>
              </div>
            </section>
          ) : null}

          {prefs.recentGitHubActivity ? (
            <section className="card card-raised">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Recent GitHub activity</h2>
                  <p className="card-subtitle muted">Filtered by your period selector above</p>
                </div>
                <Link className="link-arrow" to="/feed">
                  View all
                </Link>
              </div>
              {loading ? (
                <p className="muted pad">Loading…</p>
              ) : recent.length === 0 ? (
                <p className="muted pad">
                  No events in this period. Widen the window or refresh — or check token scopes in Settings.
                </p>
              ) : (
                <ul className="feed-list">
                  {recent.map((row) => (
                    <li key={row.key} className="feed-item">
                      <div className="feed-meta">
                        <span className="pill">{row.accountLogin}</span>
                        <span className="muted">{formatDistanceToNow(parseISO(row.createdAt), { addSuffix: true })}</span>
                      </div>
                      <ExternalLink href={row.url} className="feed-title link-btn">
                        {row.title}
                      </ExternalLink>
                      {row.commitMessages?.length ? (
                        <div className="dash-commits">
                          <CommitMessages messages={row.commitMessages} />
                        </div>
                      ) : null}
                      <div className="muted small">
                        {row.type} · {row.repo}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

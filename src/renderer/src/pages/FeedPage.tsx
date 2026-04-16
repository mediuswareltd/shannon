import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { ActivityRowDTO } from '../../../shared/api'
import { CommitMessages } from '../components/CommitMessages'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { ErrorBanner } from '../components/ErrorBanner'
import { ExternalLink } from '../components/ExternalLink'
import { type DateRangeId, rangeStart } from '../lib/dateRange'

export function FeedPage(): JSX.Element {
  const [rows, setRows] = useState<ActivityRowDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [range, setRange] = useState<DateRangeId>('24h')

  const load = useCallback(async (refresh?: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.peApi.listActivity({ refresh })
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const accounts = useMemo(() => {
    const s = new Set(rows.map((r) => r.accountLogin))
    return Array.from(s).sort()
  }, [rows])

  const types = useMemo(() => {
    const s = new Set(rows.map((r) => r.type))
    return Array.from(s).sort()
  }, [rows])

  const orgsInFeed = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (r.orgContext) s.add(r.orgContext)
    }
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const start = rangeStart(range)
    return rows.filter((r) => {
      if (parseISO(r.createdAt) < start) return false
      if (accountFilter !== 'all' && r.accountLogin !== accountFilter) return false
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (orgFilter === 'personal' && r.orgContext) return false
      if (orgFilter !== 'all' && orgFilter !== 'personal' && r.orgContext !== orgFilter) return false
      return true
    })
  }, [rows, range, accountFilter, typeFilter, orgFilter])

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-kicker">Shannon · GitHub</p>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">
            Your events plus org timelines where you have access. Classic PATs need <code>read:org</code> to list
            organizations.
          </p>
        </div>
        <div className="header-actions">
          <DateRangeSelect value={range} onChange={setRange} />
          <button type="button" className="btn" onClick={() => void load(true)} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <p className="muted small filter-hint">
        Period filters by event time (day / week / month). Commit lines come from GitHub push payloads when present (org
        feeds often omit them).
      </p>

      <div className="toolbar">
        <label className="field inline">
          <span>Account</span>
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="all">All</option>
            {accounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="field inline">
          <span>Event type</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field inline">
          <span>Org</span>
          <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
            <option value="all">All sources</option>
            <option value="personal">Personal feed only</option>
            {orgsInFeed.map((o) => (
              <option key={o} value={o}>
                Org: {o}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card card-raised table-wrap">
        {loading ? (
          <p className="muted pad">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted pad">No rows. Connect an account in Settings or adjust filters.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Account</th>
                <th>Org</th>
                <th>Actor</th>
                <th>Summary</th>
                <th>Commit messages</th>
                <th>Type</th>
                <th>Repo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.key}>
                  <td className="nowrap">{format(parseISO(r.createdAt), 'MMM d, HH:mm')}</td>
                  <td>
                    <span className="pill">{r.accountLogin}</span>
                  </td>
                  <td className="muted">
                    {r.orgContext ? <span className="pill subtle">{r.orgContext}</span> : '—'}
                  </td>
                  <td className="muted">{r.actorLogin ?? '—'}</td>
                  <td>
                    <ExternalLink href={r.url} className="link-btn left">
                      {r.title}
                    </ExternalLink>
                  </td>
                  <td className="commit-cell">
                    <CommitMessages messages={r.commitMessages} />
                  </td>
                  <td>
                    <code>{r.type}</code>
                  </td>
                  <td className="muted">{r.repo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

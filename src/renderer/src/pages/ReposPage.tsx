import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { RepoRowDTO } from '../../../shared/api'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { ErrorBanner } from '../components/ErrorBanner'
import { ExternalLink } from '../components/ExternalLink'
import { type DateRangeId, rangeStart } from '../lib/dateRange'

function repoActiveInRange(r: RepoRowDTO, start: Date): boolean {
  const updated = parseISO(r.updated_at)
  if (updated >= start) return true
  if (r.pushed_at) {
    return parseISO(r.pushed_at) >= start
  }
  return false
}

export function ReposPage(): JSX.Element {
  const [rows, setRows] = useState<RepoRowDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<DateRangeId>('24h')

  const load = useCallback(async (refresh?: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.peApi.listRepos({ refresh })
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

  const filtered = useMemo(() => {
    const start = rangeStart(range)
    return rows.filter((r) => repoActiveInRange(r, start))
  }, [rows, range])

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-kicker">Shannon · GitHub</p>
          <h1 className="page-title">Repositories</h1>
          <p className="page-subtitle">Everything your tokens can see — filter by last activity window.</p>
        </div>
        <div className="header-actions">
          <DateRangeSelect value={range} onChange={setRange} />
          <button type="button" className="btn" onClick={() => void load(true)} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="card card-raised table-wrap">
        {loading ? (
          <p className="muted pad">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted pad">No repositories. Add a token in Settings.</p>
        ) : filtered.length === 0 ? (
          <p className="muted pad">No repositories updated in this period. Try a longer window or Refresh.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Account</th>
                <th>Updated</th>
                <th>Default branch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.accountLogin}-${r.id}`}>
                  <td>
                    <ExternalLink href={r.html_url} className="link-btn left">
                      {r.full_name}
                    </ExternalLink>
                    {r.description ? <div className="muted small">{r.description}</div> : null}
                  </td>
                  <td>
                    <span className="pill">{r.accountLogin}</span>
                  </td>
                  <td className="nowrap muted">{format(parseISO(r.updated_at), 'MMM d, yyyy HH:mm')}</td>
                  <td>
                    <code>{r.default_branch}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

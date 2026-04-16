import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import type { ActivityRowDTO } from '../../../shared/api'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { ErrorBanner } from '../components/ErrorBanner'
import { type DateRangeId, rangeStart } from '../lib/dateRange'

export function AnalyticsPage(): JSX.Element {
  const [rows, setRows] = useState<ActivityRowDTO[]>([])
  const [range, setRange] = useState<DateRangeId>('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.peApi.listActivity()
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
    return rows.filter((r) => parseISO(r.createdAt) >= start)
  }, [rows, range])

  const summary = useMemo(() => {
    let pushes = 0
    let issues = 0
    let prs = 0
    const perRepo = new Map<string, number>()
    for (const r of filtered) {
      if (r.type === 'PushEvent') {
        pushes += 1
      } else if (r.type === 'IssuesEvent' || r.type === 'IssueCommentEvent') {
        issues += 1
      } else if (
        r.type === 'PullRequestEvent' ||
        r.type === 'PullRequestReviewEvent' ||
        r.type === 'PullRequestReviewCommentEvent'
      ) {
        prs += 1
      }
      perRepo.set(r.repo, (perRepo.get(r.repo) ?? 0) + 1)
    }
    const topRepos = Array.from(perRepo.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return { pushes, issues, prs, topRepos }
  }, [filtered])

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-kicker">Shannon · GitHub</p>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Event-based counts from your loaded GitHub feed — not a full audit log.</p>
        </div>
        <div className="header-actions">
          <DateRangeSelect value={range} onChange={setRange} />
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="grid stats">
            <div className="stat-card">
              <div className="stat-label">Push events</div>
              <div className="stat-value">{summary.pushes}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Issue activity</div>
              <div className="stat-value">{summary.issues}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">PR activity</div>
              <div className="stat-value">{summary.prs}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Events in range</div>
              <div className="stat-value">{filtered.length}</div>
            </div>
          </div>

          <section className="card card-raised">
            <div className="card-header">
              <h2 className="card-title">Most active repositories</h2>
            </div>
            {summary.topRepos.length === 0 ? (
              <p className="muted pad">No data in this window.</p>
            ) : (
              <ul className="list-plain">
                {summary.topRepos.map(([name, count]) => (
                  <li key={name} className="list-row">
                    <span>{name}</span>
                    <span className="muted">{count} events</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

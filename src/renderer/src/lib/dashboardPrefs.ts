const KEY = 'shannon-dashboard-panels'

export type DashboardPrefs = {
  /** Accounts, events, repos KPI cards */
  summaryMetrics: boolean
  /** Latest GitHub events list */
  recentGitHubActivity: boolean
  /** GitHub / ClickUp connection status */
  integrationStatus: boolean
  /** Push / issues / PRs mix for the selected period */
  eventTypeMix: boolean
}

export const defaultDashboardPrefs: DashboardPrefs = {
  summaryMetrics: true,
  recentGitHubActivity: true,
  integrationStatus: true,
  eventTypeMix: true
}

export function loadDashboardPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultDashboardPrefs }
    const p = JSON.parse(raw) as Partial<DashboardPrefs>
    return { ...defaultDashboardPrefs, ...p }
  } catch {
    return { ...defaultDashboardPrefs }
  }
}

export function saveDashboardPrefs(p: DashboardPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

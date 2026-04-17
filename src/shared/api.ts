export interface ActivityRowDTO {
  key: string
  accountLogin: string
  type: string
  createdAt: string
  repo: string
  title: string
  url: string | null
  /** Set when the row came from an org timeline (includes other members' activity). */
  orgContext?: string | null
  /** GitHub user who triggered the event (when API provides it). */
  actorLogin?: string | null
  /** First line of each commit message for PushEvent (when GitHub includes `payload.commits`). */
  commitMessages?: string[]
}

export interface RepoRowDTO {
  accountLogin: string
  id: number
  full_name: string
  description: string | null
  updated_at: string
  pushed_at: string | null
  html_url: string
  default_branch: string
}

export type UpdateCheckResponse =
  | { ok: true; message: string; mode?: 'dev' }
  | { ok: false; message: string }

export interface PeApi {
  listAccounts: () => Promise<{ id: string; login: string }[]>
  addAccount: (token: string) => Promise<{ id: string; login: string }>
  removeAccount: (id: string) => Promise<void>
  listActivity: (opts?: { refresh?: boolean }) => Promise<ActivityRowDTO[]>
  listRepos: () => Promise<RepoRowDTO[]>
  openExternal: (url: string) => Promise<void>
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<UpdateCheckResponse>
}

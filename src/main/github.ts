import type { StoredAccount } from './store'
import { getToken } from './store'

const API = 'https://api.github.com'
const HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
} as const

export interface GitHubUser {
  login: string
  id: number
  name: string | null
}

export interface GitHubEvent {
  id: string
  type: string
  created_at: string
  actor?: { login: string }
  repo: { id: number; name: string; url: string }
  payload: Record<string, unknown>
}

export interface GitHubRepo {
  id: number
  full_name: string
  description: string | null
  pushed_at: string | null
  updated_at: string
  html_url: string
  default_branch: string
}

type RequestOptions = {
  ttlMs?: number
  force?: boolean
}

const requestCache = new Map<string, { expiresAt: number; value: unknown }>()
const requestInFlight = new Map<string, Promise<unknown>>()
const DEFAULT_EVENT_PAGES = 1
const DEFAULT_ORG_EVENT_PAGES = 1
const MAX_ORGS_PER_ACCOUNT = 10

function requestKey(path: string, token: string): string {
  return `${token}::${path}`
}

function readCached<T>(key: string): T | undefined {
  const cached = requestCache.get(key)
  if (!cached) return undefined
  if (Date.now() >= cached.expiresAt) {
    requestCache.delete(key)
    return undefined
  }
  return cached.value as T
}

async function ghJson<T>(path: string, token: string, opts?: RequestOptions): Promise<T> {
  const ttlMs = opts?.ttlMs ?? 0
  const force = Boolean(opts?.force)
  const key = requestKey(path, token)
  if (!force && ttlMs > 0) {
    const cached = readCached<T>(key)
    if (cached !== undefined) return cached
  }
  if (!force) {
    const inFlight = requestInFlight.get(key)
    if (inFlight) return inFlight as Promise<T>
  }

  const run = (async () => {
    const res = await fetch(`${API}${path}`, {
      headers: { ...HEADERS, Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub ${res.status}: ${text.slice(0, 500)}`)
    }
    const data = (await res.json()) as T
    if (ttlMs > 0) {
      requestCache.set(key, { expiresAt: Date.now() + ttlMs, value: data })
    }
    return data
  })()
  requestInFlight.set(key, run)
  try {
    return await run
  } finally {
    requestInFlight.delete(key)
  }
}

export async function verifyToken(token: string): Promise<GitHubUser> {
  return ghJson<GitHubUser>('/user', token)
}

export async function fetchUserEvents(
  login: string,
  token: string,
  pages = DEFAULT_EVENT_PAGES,
  opts?: RequestOptions
): Promise<GitHubEvent[]> {
  const out: GitHubEvent[] = []
  for (let page = 1; page <= pages; page++) {
    const path = `/users/${encodeURIComponent(login)}/events?per_page=30&page=${page}`
    const batch = await ghJson<GitHubEvent[]>(path, token, { ttlMs: 60_000, force: opts?.force })
    out.push(...batch)
    if (batch.length < 30) break
  }
  return out
}

export interface GitHubOrg {
  login: string
  id: number
}

async function ghJsonOptional<T>(path: string, token: string, opts?: RequestOptions): Promise<T | null> {
  const ttlMs = opts?.ttlMs ?? 0
  const force = Boolean(opts?.force)
  const key = requestKey(path, token)
  if (!force && ttlMs > 0) {
    const cached = readCached<T | null>(key)
    if (cached !== undefined) return cached
  }
  if (!force) {
    const inFlight = requestInFlight.get(key)
    if (inFlight) return inFlight as Promise<T | null>
  }

  const run = (async () => {
    const res = await fetch(`${API}${path}`, {
      headers: { ...HEADERS, Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      if (ttlMs > 0) {
        requestCache.set(key, { expiresAt: Date.now() + ttlMs, value: null })
      }
      return null
    }
    const data = (await res.json()) as T
    if (ttlMs > 0) {
      requestCache.set(key, { expiresAt: Date.now() + ttlMs, value: data })
    }
    return data
  })()
  requestInFlight.set(key, run)
  try {
    return await run
  } finally {
    requestInFlight.delete(key)
  }
}

/** Orgs the authenticated user belongs to (classic PAT: `read:org`). */
export async function fetchUserOrgs(token: string, maxPages = 5, opts?: RequestOptions): Promise<GitHubOrg[]> {
  const out: GitHubOrg[] = []
  for (let page = 1; page <= maxPages; page++) {
    const batch = await ghJsonOptional<GitHubOrg[]>(`/user/orgs?per_page=100&page=${page}`, token, {
      ttlMs: 10 * 60 * 1000,
      force: opts?.force
    })
    if (!batch || batch.length === 0) break
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

/**
 * Activity in repositories owned by this org (other members included).
 * @see https://docs.github.com/en/rest/activity/events#list-organization-events-for-the-authenticated-user
 */
export async function fetchUserOrgEvents(
  userLogin: string,
  orgLogin: string,
  token: string,
  pages = DEFAULT_ORG_EVENT_PAGES,
  opts?: RequestOptions
): Promise<GitHubEvent[]> {
  const out: GitHubEvent[] = []
  for (let page = 1; page <= pages; page++) {
    const path = `/users/${encodeURIComponent(userLogin)}/events/orgs/${encodeURIComponent(orgLogin)}?per_page=30&page=${page}`
    const batch = await ghJsonOptional<GitHubEvent[]>(path, token, { ttlMs: 60_000, force: opts?.force })
    if (!batch || batch.length === 0) break
    out.push(...batch)
    if (batch.length < 30) break
  }
  return out
}

export async function fetchUserRepos(token: string, pages = 1, opts?: RequestOptions): Promise<GitHubRepo[]> {
  const out: GitHubRepo[] = []
  for (let page = 1; page <= pages; page++) {
    const path = `/user/repos?per_page=100&page=${page}&sort=updated`
    const batch = await ghJson<GitHubRepo[]>(path, token, { ttlMs: 5 * 60 * 1000, force: opts?.force })
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

/** GitHub's /users/.../events feed often omits or zeroes `size`; prefer commits / distinct_size. */
function pushEventCommitCount(p: Record<string, unknown>): number | null {
  const commits = p.commits
  if (Array.isArray(commits) && commits.length > 0) {
    return commits.length
  }
  if (typeof p.distinct_size === 'number' && p.distinct_size > 0) {
    return p.distinct_size
  }
  if (typeof p.size === 'number' && p.size > 0) {
    return p.size
  }
  if (typeof p.distinct_size === 'number') {
    return p.distinct_size
  }
  if (typeof p.size === 'number') {
    return p.size
  }
  return null
}

export function eventTitle(ev: GitHubEvent): string {
  const p = ev.payload
  switch (ev.type) {
    case 'PushEvent': {
      const ref = typeof p.ref === 'string' ? p.ref.replace('refs/heads/', '') : 'branch'
      const n = pushEventCommitCount(p)
      if (n == null || n === 0) {
        return `Push to ${ref}`
      }
      return `Push (${n} commit${n === 1 ? '' : 's'}) to ${ref}`
    }
    case 'PullRequestEvent': {
      const action = typeof p.action === 'string' ? p.action : 'update'
      const pr = p.pull_request as { title?: string; number?: number } | undefined
      const title = pr?.title ?? 'Pull request'
      const num = pr?.number != null ? `#${pr.number}` : ''
      return `PR ${action} ${num} ${title}`.trim()
    }
    case 'IssuesEvent': {
      const action = typeof p.action === 'string' ? p.action : 'update'
      const issue = p.issue as { title?: string; number?: number } | undefined
      const title = issue?.title ?? 'Issue'
      const num = issue?.number != null ? `#${issue.number}` : ''
      return `Issue ${action} ${num} ${title}`.trim()
    }
    case 'CreateEvent': {
      const ref = typeof p.ref === 'string' ? p.ref : 'resource'
      const refType = typeof p.ref_type === 'string' ? p.ref_type : 'ref'
      return `Created ${refType} ${ref}`
    }
    case 'DeleteEvent': {
      const ref = typeof p.ref === 'string' ? p.ref : 'resource'
      return `Deleted ${ref}`
    }
    case 'ForkEvent': {
      return 'Forked repository'
    }
    case 'WatchEvent': {
      return 'Starred repository'
    }
    case 'ReleaseEvent': {
      const action = typeof p.action === 'string' ? p.action : 'publish'
      const rel = p.release as { name?: string; tag_name?: string } | undefined
      const name = rel?.name ?? rel?.tag_name ?? 'release'
      return `Release ${action}: ${name}`
    }
    case 'IssueCommentEvent': {
      return 'Issue comment'
    }
    case 'PullRequestReviewEvent': {
      return 'PR review'
    }
    case 'PullRequestReviewCommentEvent': {
      return 'PR review comment'
    }
    default:
      return ev.type
  }
}

/** GitHub includes up to ~20 commits in push payloads when present; org feeds may omit them. */
function messageFromCommitPayload(raw: object): string | null {
  const top = (raw as { message?: unknown }).message
  if (typeof top === 'string' && top.trim()) return top
  const nested = (raw as { commit?: { message?: unknown } }).commit?.message
  if (typeof nested === 'string' && nested.trim()) return nested
  return null
}

export function pushCommitMessages(ev: GitHubEvent, maxMessages = 20): string[] {
  if (ev.type !== 'PushEvent') return []
  const p = ev.payload
  const commits = p.commits
  if (!Array.isArray(commits)) return []
  const out: string[] = []
  for (const raw of commits.slice(0, maxMessages)) {
    if (!raw || typeof raw !== 'object') continue
    const msg = messageFromCommitPayload(raw)
    if (!msg) continue
    const firstLine = msg.split('\n')[0]?.trim() ?? msg.trim()
    out.push(firstLine.length > 240 ? `${firstLine.slice(0, 237)}…` : firstLine)
  }
  return out
}

function firstLineFromGitMessage(message: string, maxLen = 240): string {
  const line = message.split('\n')[0]?.trim() ?? ''
  if (!line) return ''
  return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line
}

function commitMessagesFromApiObjects(
  items: Array<{ commit?: { message?: string } | null } | null | undefined>,
  maxMessages: number
): string[] {
  const out: string[] = []
  for (const item of items) {
    const m = item?.commit?.message
    if (typeof m !== 'string' || !m.trim()) continue
    const line = firstLineFromGitMessage(m)
    if (line) out.push(line)
    if (out.length >= maxMessages) break
  }
  return out
}

export function parseOwnerRepoFromRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(repoUrl)
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('repos')
    if (idx === -1 || parts.length < idx + 3) return null
    return { owner: parts[idx + 1], repo: parts[idx + 2] }
  } catch {
    return null
  }
}

/** `repo.name` is often `owner/repo` per GitHub Events API docs. */
function parseOwnerRepoFromRepoName(name: string | undefined): { owner: string; repo: string } | null {
  if (!name || !name.includes('/')) return null
  const i = name.indexOf('/')
  const owner = name.slice(0, i)
  const repo = name.slice(i + 1)
  if (!owner || !repo) return null
  return { owner, repo }
}

export function parseOwnerRepoFromEvent(ev: GitHubEvent): { owner: string; repo: string } | null {
  const fromUrl = ev.repo?.url ? parseOwnerRepoFromRepoUrl(ev.repo.url) : null
  if (fromUrl) return fromUrl
  return parseOwnerRepoFromRepoName(ev.repo?.name)
}

function resolvePushHeadSha(p: Record<string, unknown>): string {
  const head = p.head
  if (typeof head === 'string' && head.length > 0) return head
  const after = (p as { after?: unknown }).after
  if (typeof after === 'string' && after.length > 0) return after
  const commits = p.commits
  if (Array.isArray(commits) && commits.length > 0) {
    const last = commits[commits.length - 1] as { sha?: unknown }
    if (typeof last?.sha === 'string' && last.sha.length > 0) return last.sha
  }
  return ''
}

function resolvePushBeforeSha(p: Record<string, unknown>): string {
  const before = p.before
  return typeof before === 'string' ? before : ''
}

async function resolveHeadShaFromRef(
  owner: string,
  repoName: string,
  ref: string,
  token: string,
  opts?: RequestOptions
): Promise<string | null> {
  const branch = ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '')
  if (!branch) return null
  const path = `/repos/${owner}/${repoName}/commits?sha=${encodeURIComponent(branch)}&per_page=1`
  const list = await ghJsonOptional<Array<{ sha?: string }>>(path, token, {
    ttlMs: 10 * 60 * 1000,
    force: opts?.force
  })
  const sha = list?.[0]?.sha
  return typeof sha === 'string' && sha.length > 0 ? sha : null
}

async function fetchCommitMessageBySha(
  owner: string,
  repoName: string,
  sha: string,
  token: string,
  opts?: RequestOptions
): Promise<string[]> {
  const path = `/repos/${owner}/${repoName}/commits/${encodeURIComponent(sha)}`
  const data = await ghJsonOptional<{ commit?: { message?: string } }>(path, token, {
    ttlMs: 10 * 60 * 1000,
    force: opts?.force
  })
  const m = data?.commit?.message
  if (typeof m !== 'string' || !m.trim()) return []
  const line = firstLineFromGitMessage(m)
  return line ? [line] : []
}

/**
 * When the events feed omits `payload.commits`, load messages via Compare or Commits API (needs `repo` scope).
 * Never throws — network/parsing errors would otherwise break the whole activity feed.
 */
export async function enrichPushCommitMessages(
  ev: GitHubEvent,
  token: string,
  maxMessages = 20,
  force = false
): Promise<string[]> {
  try {
    const inlined = pushCommitMessages(ev)
    if (inlined.length > 0) return inlined
    if (ev.type !== 'PushEvent') return []

    const p = ev.payload
    const loc = parseOwnerRepoFromEvent(ev)
    if (!loc) return []

    const { owner, repo: repoName } = loc
    let head = resolvePushHeadSha(p)
    const before = resolvePushBeforeSha(p)
    const ref = typeof p.ref === 'string' ? p.ref : ''

    if (!head && ref) {
      head = (await resolveHeadShaFromRef(owner, repoName, ref, token, { force })) ?? ''
    }
    if (!head) return []

    const rawSize = typeof p.size === 'number' && p.size > 0 ? p.size : 0
    const rawDistinct = typeof p.distinct_size === 'number' && p.distinct_size > 0 ? p.distinct_size : 0
    const sizeHint = Math.min(
      maxMessages,
      rawSize > 0 ? rawSize : rawDistinct > 0 ? rawDistinct : 5
    )
    const isNullBefore = !before || /^0+$/.test(before)

    if (!isNullBefore && before.length >= 7 && head.length >= 7) {
      const comparePath = `/repos/${owner}/${repoName}/compare/${before}...${head}`
      const compared = await ghJsonOptional<{
        commits?: Array<{ commit?: { message?: string } }>
      }>(comparePath, token, { ttlMs: 5 * 60 * 1000, force })
      const msgs = commitMessagesFromApiObjects(compared?.commits ?? [], maxMessages)
      if (msgs.length > 0) return msgs
    }

    const listPath = `/repos/${owner}/${repoName}/commits?sha=${encodeURIComponent(head)}&per_page=${sizeHint}`
    const listed = await ghJsonOptional<Array<{ commit?: { message?: string } }>>(listPath, token, {
      ttlMs: 5 * 60 * 1000,
      force
    })
    if (listed?.length) {
      const chronological = [...listed].reverse()
      const fromList = commitMessagesFromApiObjects(chronological, maxMessages)
      if (fromList.length > 0) return fromList
    }

    const single = await fetchCommitMessageBySha(owner, repoName, head, token, { force })
    if (single.length > 0) return single

    return []
  } catch (e) {
    console.error('[enrichPushCommitMessages]', e instanceof Error ? e.message : e)
    return []
  }
}

export function eventWebUrl(ev: GitHubEvent): string | null {
  const p = ev.payload
  const repoUrl = ev.repo?.url
  if (!repoUrl) return null
  const web = repoUrl.replace('api.github.com/repos', 'github.com')
  switch (ev.type) {
    case 'PushEvent':
      return web
    case 'PullRequestEvent': {
      const pr = p.pull_request as { number?: number } | undefined
      return pr?.number != null ? `${web}/pull/${pr.number}` : web
    }
    case 'IssuesEvent':
    case 'IssueCommentEvent': {
      const issue = p.issue as { number?: number } | undefined
      return issue?.number != null ? `${web}/issues/${issue.number}` : `${web}/issues`
    }
    default:
      return web
  }
}

export type CollectedEventRow = {
  key: string
  accountLogin: string
  event: GitHubEvent
  title: string
  url: string | null
  orgContext: string | null
}

export async function collectEvents(
  accounts: StoredAccount[],
  opts?: { forceRefresh?: boolean }
): Promise<CollectedEventRow[]> {
  const byEventId = new Map<string, CollectedEventRow>()
  const force = Boolean(opts?.forceRefresh)

  const add = (row: CollectedEventRow): void => {
    const dedupeKey = String(row.event.id)
    const existing = byEventId.get(dedupeKey)
    if (!existing) {
      byEventId.set(dedupeKey, row)
      return
    }
    if (!existing.orgContext && row.orgContext) {
      byEventId.set(dedupeKey, row)
    }
  }

  for (const acc of accounts) {
    const token = getToken(acc)
    const personal = await fetchUserEvents(acc.login, token, DEFAULT_EVENT_PAGES, { force })
    for (const ev of personal) {
      add({
        key: `${acc.login}-u-${ev.id}`,
        accountLogin: acc.login,
        event: ev,
        title: eventTitle(ev),
        url: eventWebUrl(ev),
        orgContext: null
      })
    }

    let orgs: GitHubOrg[] = []
    try {
      orgs = await fetchUserOrgs(token, 5, { force })
    } catch {
      orgs = []
    }
    for (const org of orgs.slice(0, MAX_ORGS_PER_ACCOUNT)) {
      let orgEvents: GitHubEvent[] = []
      try {
        orgEvents = await fetchUserOrgEvents(acc.login, org.login, token, DEFAULT_ORG_EVENT_PAGES, { force })
      } catch {
        orgEvents = []
      }
      for (const ev of orgEvents) {
        add({
          key: `${acc.login}-o-${org.login}-${ev.id}`,
          accountLogin: acc.login,
          event: ev,
          title: eventTitle(ev),
          url: eventWebUrl(ev),
          orgContext: org.login
        })
      }
    }
  }

  const rows = Array.from(byEventId.values())
  rows.sort((a, b) => (a.event.created_at < b.event.created_at ? 1 : -1))
  return rows
}

export async function collectRepos(
  accounts: StoredAccount[],
  opts?: { forceRefresh?: boolean }
): Promise<
  Array<{ accountLogin: string; repo: GitHubRepo }>
> {
  const rows: Array<{ accountLogin: string; repo: GitHubRepo }> = []
  const force = Boolean(opts?.forceRefresh)
  for (const acc of accounts) {
    const token = getToken(acc)
    const repos = await fetchUserRepos(token, 1, { force })
    for (const repo of repos) {
      rows.push({ accountLogin: acc.login, repo })
    }
  }
  rows.sort((a, b) => (a.repo.updated_at < b.repo.updated_at ? 1 : -1))
  return rows
}

import { ipcMain, shell } from 'electron'
import type { ActivityRowDTO, RepoRowDTO } from '../shared/api'
import { addAccount, getToken, loadAccounts, removeAccount, type StoredAccount } from './store'
import { collectEvents, collectRepos, enrichPushCommitMessages, pushCommitMessages, verifyToken } from './github'

let activityCache: { at: number; rows: ActivityRowDTO[] } | null = null
let reposCache: { at: number; rows: RepoRowDTO[] } | null = null
let activityInFlight: Promise<ActivityRowDTO[]> | null = null
let reposInFlight: Promise<RepoRowDTO[]> | null = null
const ACTIVITY_TTL_MS = 5 * 60 * 1000
const REPOS_TTL_MS = 5 * 60 * 1000

/** Avoid blocking the UI on dozens of REST calls (rate limits / multi-minute waits). */
const MAX_REMOTE_COMMIT_ENRICH = 12
const ENRICH_TIMEOUT_MS = 6000

let registered = false

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('enrich timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

function findAccountForEvent(accounts: StoredAccount[], accountLogin: string): StoredAccount | undefined {
  const lower = accountLogin.toLowerCase()
  return accounts.find((a) => a.login.toLowerCase() === lower)
}

export function registerIpc(): void {
  if (registered) return
  registered = true

  ipcMain.handle('accounts:list', async () => {
    const accounts = await loadAccounts()
    return accounts.map(({ id, login }) => ({ id, login }))
  })

  ipcMain.handle('accounts:add', async (_e, token: string) => {
    const user = await verifyToken(token)
    const acc = await addAccount(user.login, token)
    activityCache = null
    reposCache = null
    return { id: acc.id, login: acc.login }
  })

  ipcMain.handle('accounts:remove', async (_e, id: string) => {
    await removeAccount(id)
    activityCache = null
    reposCache = null
  })

  ipcMain.handle('activity:list', async (_e, opts?: { refresh?: boolean }) => {
    const forceRefresh = Boolean(opts?.refresh)
    if (!forceRefresh && activityCache && Date.now() - activityCache.at < ACTIVITY_TTL_MS) {
      return activityCache.rows
    }
    if (activityInFlight) {
      return activityInFlight
    }

    const run = (async () => {
      try {
        const accounts = await loadAccounts()
        if (accounts.length === 0) return [] as ActivityRowDTO[]
        const collected = await collectEvents(accounts, { forceRefresh })
        const rows: ActivityRowDTO[] = []
        let remoteEnrichUsed = 0
        for (const c of collected) {
          const acc = findAccountForEvent(accounts, c.accountLogin)
          let token = ''
          if (acc) {
            try {
              token = getToken(acc)
            } catch (e) {
              console.error('[activity:list] token decrypt failed for', acc.login, e)
            }
          } else {
            console.warn('[activity:list] no stored account for event login', c.accountLogin)
          }

          let commitMessages: string[] | undefined
          if (c.event.type === 'PushEvent') {
            const inlined = pushCommitMessages(c.event)
            if (inlined.length > 0) {
              commitMessages = inlined
            } else if (token && remoteEnrichUsed < MAX_REMOTE_COMMIT_ENRICH) {
              remoteEnrichUsed += 1
              try {
                const msgs = await withTimeout(
                  enrichPushCommitMessages(c.event, token, 20, forceRefresh),
                  ENRICH_TIMEOUT_MS
                )
                if (msgs.length > 0) commitMessages = msgs
              } catch (e) {
                console.warn('[activity:list] commit enrich failed', c.key, e)
              }
            }
          }

          rows.push({
            key: c.key,
            accountLogin: c.accountLogin,
            type: c.event.type,
            createdAt: c.event.created_at,
            repo: c.event.repo?.name ?? 'unknown',
            title: c.title,
            url: c.url,
            orgContext: c.orgContext,
            actorLogin: c.event.actor?.login ?? null,
            commitMessages
          })
        }
        activityCache = { at: Date.now(), rows }
        return rows
      } catch (e) {
        console.error('[activity:list]', e)
        throw e
      }
    })()

    activityInFlight = run
    void run.finally(() => {
      if (activityInFlight === run) {
        activityInFlight = null
      }
    })
    return run
  })

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('repos:list', async (_e, opts?: { refresh?: boolean }) => {
    const forceRefresh = Boolean(opts?.refresh)
    if (!forceRefresh && reposCache && Date.now() - reposCache.at < REPOS_TTL_MS) {
      return reposCache.rows
    }
    if (reposInFlight) {
      return reposInFlight
    }

    reposInFlight = (async () => {
      const accounts = await loadAccounts()
      if (accounts.length === 0) return [] as RepoRowDTO[]
      const merged = await collectRepos(accounts, { forceRefresh })
      const rows = merged.map(({ accountLogin, repo }) => ({
        accountLogin,
        id: repo.id,
        full_name: repo.full_name,
        description: repo.description,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        html_url: repo.html_url,
        default_branch: repo.default_branch
      }))
      reposCache = { at: Date.now(), rows }
      return rows
    })()

    try {
      return await reposInFlight
    } finally {
      reposInFlight = null
    }
  })
}

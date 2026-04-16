import pkg from '../../package.json'

type Pkg = {
  homepage?: string
  repository?: string | { type?: string; url?: string }
  bugs?: { url?: string }
}

const p = pkg as Pkg

/** Normalize GitHub (or other) base URL from package.json — edit `homepage` / `repository` there. */
function repoBase(): string {
  if (p.homepage && /^https?:\/\//i.test(p.homepage)) {
    return p.homepage.replace(/\/$/, '')
  }
  const r = p.repository
  const raw = typeof r === 'string' ? r : r?.url
  if (raw) {
    const u = raw.replace(/^git\+/, '').replace(/\.git$/i, '').trim()
    if (/^https?:\/\//i.test(u)) return u.replace(/\/$/, '')
  }
  return 'https://github.com'
}

const base = repoBase()

export const REPO_BASE = base

export const ISSUES_URL =
  p.bugs?.url && /^https?:\/\//i.test(p.bugs.url) ? p.bugs.url.replace(/\/$/, '') : `${base}/issues`

/** Default branch paths — adjust if your default branch is not `main`. */
export const LICENSE_URL = `${base}/blob/main/LICENSE`
export const README_URL = `${base}/blob/main/README.md`

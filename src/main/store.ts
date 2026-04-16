import { app, safeStorage } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface StoredAccount {
  id: string
  login: string
  tokenEnc: string
}

async function accountsFile(): Promise<string> {
  const dir = app.getPath('userData')
  await mkdir(dir, { recursive: true })
  return join(dir, 'accounts.json')
}

function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64')
  }
  console.warn('[pe-board-monitor] safeStorage unavailable; storing token in plaintext (dev only).')
  return `plain:${token}`
}

function decryptToken(enc: string): string {
  if (enc.startsWith('plain:')) return enc.slice('plain:'.length)
  return safeStorage.decryptString(Buffer.from(enc, 'base64'))
}

export async function loadAccounts(): Promise<StoredAccount[]> {
  try {
    const raw = await readFile(await accountsFile(), 'utf-8')
    const parsed = JSON.parse(raw) as StoredAccount[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveAccounts(accounts: StoredAccount[]): Promise<void> {
  await writeFile(await accountsFile(), JSON.stringify(accounts, null, 2), 'utf-8')
}

export async function addAccount(login: string, token: string): Promise<StoredAccount> {
  const accounts = await loadAccounts()
  const tokenEnc = encryptToken(token)
  const existing = accounts.find((a) => a.login === login)
  if (existing) {
    existing.tokenEnc = tokenEnc
    await saveAccounts(accounts)
    return existing
  }
  const created: StoredAccount = { id: randomUUID(), login, tokenEnc }
  accounts.push(created)
  await saveAccounts(accounts)
  return created
}

export async function removeAccount(id: string): Promise<void> {
  const accounts = (await loadAccounts()).filter((a) => a.id !== id)
  await saveAccounts(accounts)
}

export function getToken(account: StoredAccount): string {
  return decryptToken(account.tokenEnc)
}

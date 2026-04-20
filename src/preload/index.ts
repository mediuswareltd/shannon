import { contextBridge, ipcRenderer } from 'electron'
import type { PeApi } from '../shared/api'

const api: PeApi = {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: (token: string) => ipcRenderer.invoke('accounts:add', token),
  removeAccount: (id: string) => ipcRenderer.invoke('accounts:remove', id),
  listActivity: (opts?: { refresh?: boolean }) => ipcRenderer.invoke('activity:list', opts),
  listRepos: (opts?: { refresh?: boolean }) => ipcRenderer.invoke('repos:list', opts),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check')
}

contextBridge.exposeInMainWorld('peApi', api)

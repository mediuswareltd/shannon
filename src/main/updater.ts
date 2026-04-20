import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import { APP_VERSION } from './appVersion'

let initialized = false

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const { autoUpdater } = electronUpdater

export function initUpdater(mainWindow: BrowserWindow): void {
  if (initialized) return
  initialized = true

  ipcMain.handle('app:version', () => APP_VERSION)

  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) {
      return {
        ok: true as const,
        mode: 'dev' as const,
        message: 'Updates are disabled in development builds.'
      }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      if (!result) {
        return { ok: true as const, message: 'Update check finished.' }
      }
      if (result.isUpdateAvailable) {
        return {
          ok: true as const,
          message: `Version ${result.updateInfo.version} is available — downloading in the background.`
        }
      }
      return { ok: true as const, message: 'You are on the latest version.' }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false as const, message: msg }
    }
  })

  if (!app.isPackaged) return

  autoUpdater.autoDownload = true

  autoUpdater.on('error', (err) => {
    console.error('[autoUpdater]', err)
  })

  autoUpdater.on('update-downloaded', () => {
    const parent =
      BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? mainWindow
    void dialog
      .showMessageBox(parent, {
        type: 'info',
        title: 'Update ready',
        message: 'A new version has been downloaded. Restart Shannon to install it.',
        buttons: ['Restart & install', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })

  const runCheck = (): void => {
    void autoUpdater.checkForUpdates()
  }

  setTimeout(runCheck, 5000)
  setInterval(runCheck, CHECK_INTERVAL_MS)
}

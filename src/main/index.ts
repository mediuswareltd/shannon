import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import { ISSUES_URL, LICENSE_URL, README_URL, RELEASES_LATEST_URL, REPO_BASE } from './appLinks'
import { APP_VERSION } from './appVersion'
import { registerIpc } from './ipc'
import { initUpdater } from './updater'

registerIpc()

function openUrl(url: string): void {
  void shell.openExternal(url)
}

function installMenu(): void {
  const isMac = process.platform === 'darwin'
  const isDev = !app.isPackaged

  const helpSubmenu: Electron.MenuItemConstructorOptions[] = [
    { label: `Version ${APP_VERSION}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Repository',
      click: () => openUrl(REPO_BASE)
    },
    {
      label: 'Download & releases',
      click: () => openUrl(RELEASES_LATEST_URL)
    },
    {
      label: 'Issues & feedback',
      click: () => openUrl(ISSUES_URL)
    },
    {
      label: 'License',
      click: () => openUrl(LICENSE_URL)
    },
    {
      label: 'Readme',
      click: () => openUrl(README_URL)
    }
  ]

  const template: Electron.MenuItemConstructorOptions[] = []

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  template.push({
    label: 'File',
    submenu: isMac
      ? [{ role: 'close' }]
      : [
          { role: 'quit',
            label: 'Exit'
          }
        ]
  })

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'delete' },
      { type: 'separator' },
      { role: 'selectAll' }
    ]
  })

  const viewSubmenu: Electron.MenuItemConstructorOptions[] = [
    { role: 'reload' },
    { role: 'forceReload' },
    ...(isDev ? ([{ role: 'toggleDevTools' }] as const) : []),
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' }
  ]

  template.push({
    label: 'View',
    submenu: viewSubmenu
  })

  if (isMac) {
    template.push({
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    })
  }

  template.push({
    label: 'Help',
    submenu: helpSubmenu
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'Shannon',
    icon: join(__dirname, '../../assets/logo-1024x1024.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  installMenu()
  const win = createWindow()
  initUpdater(win)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

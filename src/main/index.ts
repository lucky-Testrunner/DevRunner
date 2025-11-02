import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { registerProjectHandlers } from './ipc/project-handlers.js'
import { registerCommandHandlers } from './ipc/command-handlers.js'
import { registerProcessHandlers } from './ipc/process-handlers.js'
import { getProjectStore } from './store/store.js'
import { getProcessManager } from './services/process-manager.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

const preloadPath = join(currentDir, '../preload/index.mjs')
const indexHtml = join(currentDir, '../../dist/index.html')

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1f2933',
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL

  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl)
  } else {
    await mainWindow.loadFile(indexHtml)
  }
}

app.whenReady().then(async () => {
  getProjectStore()
  getProcessManager()
  
  registerProjectHandlers()
  registerCommandHandlers()
  registerProcessHandlers()
  
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

ipcMain.handle('ping', async () => 'pong')

ipcMain.handle('dialog:openDirectory', async () => {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  if (result.canceled) {
    return { canceled: true }
  } else {
    return { canceled: false, filePaths: result.filePaths }
  }
})

app.on('window-all-closed', async () => {
  const processManager = getProcessManager()
  await processManager.stopAllProcesses()
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async (event) => {
  event.preventDefault()
  const processManager = getProcessManager()
  await processManager.stopAllProcesses()
  app.exit(0)
})

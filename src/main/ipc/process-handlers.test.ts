import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventEmitter } from 'events'
import { ChildProcess } from 'child_process'

vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

let mockStoreData = {
  version: 1,
  projects: [
    {
      id: 'proj-1',
      name: 'Test Project',
      commands: [
        {
          id: 'cmd-1',
          name: 'Dev Server',
          type: 'service' as const,
          shell: 'bash' as const,
          command: 'npm run dev',
          workingDirectory: '/test/path',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'cmd-2',
          name: 'Build',
          type: 'oneoff' as const,
          shell: 'bash' as const,
          command: 'npm run build',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

vi.mock('../store/store', () => ({
  getProjectStore: vi.fn(() => ({
    getData: vi.fn(() => mockStoreData),
    setData: vi.fn((data) => {
      mockStoreData = data
    })
  }))
}))

vi.mock('../repository/command-repository', () => ({
  getCommandRepository: vi.fn(() => ({
    getCommandById: vi.fn((projectId: string, commandId: string) => {
      const project = mockStoreData.projects.find((p) => p.id === projectId)
      return project?.commands.find((c) => c.id === commandId)
    })
  }))
}))

import { spawn } from 'child_process'
import { getProcessManager, resetProcessManager } from '../services/process-manager'

class MockChildProcess extends EventEmitter {
  pid: number
  stdout: EventEmitter
  stderr: EventEmitter
  killed = false

  constructor(pid: number) {
    super()
    this.pid = pid
    this.stdout = new EventEmitter()
    this.stderr = new EventEmitter()
  }

  kill() {
    this.killed = true
    return true
  }
}

class MockTaskkillProcess extends EventEmitter {
  constructor(exitCode = 0) {
    super()
    setImmediate(() => {
      this.emit('exit', exitCode, null)
    })
  }
}

describe('Process Manager Integration', () => {
  beforeEach(() => {
    resetProcessManager()
    vi.clearAllMocks()
  })

  describe('service command execution', () => {
    it('should execute a service command and track PID', async () => {
      const mockProcess = new MockChildProcess(11111)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const result = await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        workingDirectory: '/test/path',
        isService: true
      })

      expect(result.success).toBe(true)
      expect(result.pid).toBe(11111)
      expect(manager.isProcessRunning('cmd-1')).toBe(true)

      const info = manager.getProcessInfo('cmd-1')
      expect(info?.projectId).toBe('proj-1')
      expect(info?.status).toBe('running')
    })
  })

  describe('one-off command execution', () => {
    it('should execute a one-off command and wait for completion', async () => {
      const mockProcess = new MockChildProcess(11112)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const resultPromise = manager.executeCommand({
        commandId: 'cmd-2',
        projectId: 'proj-1',
        command: 'npm run build',
        shell: 'bash',
        isService: false
      })

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Build complete\n'))
        mockProcess.emit('exit', 0)
      }, 10)

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.exitCode).toBe(0)
      expect(result.output).toContain('Build complete')
      expect(manager.isProcessRunning('cmd-2')).toBe(false)
    })
  })

  describe('process stopping', () => {
    it('should stop a running process', async () => {
      const mockProcess = new MockChildProcess(11113)
      const spawnQueue: ChildProcess[] = []

      spawnQueue.push(mockProcess as unknown as ChildProcess)
      if (process.platform === 'win32') {
        spawnQueue.push(new MockTaskkillProcess() as unknown as ChildProcess)
      }

      vi.mocked(spawn).mockImplementation(() => {
        const next = spawnQueue.shift()
        if (!next) {
          throw new Error('Unexpected spawn call')
        }
        return next
      })

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      expect(manager.isProcessRunning('cmd-1')).toBe(true)

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (signal === 0) {
          throw new Error('Process not found')
        }
        return true
      })

      const stopped = await manager.stopProcess('cmd-1')

      expect(stopped).toBe(true)
      expect(manager.isProcessRunning('cmd-1')).toBe(false)
    })

    it('should stop multiple processes', async () => {
      const mockProcess1 = new MockChildProcess(11114)
      const mockProcess2 = new MockChildProcess(11115)
      const spawnQueue: ChildProcess[] = []

      spawnQueue.push(mockProcess1 as unknown as ChildProcess)
      spawnQueue.push(mockProcess2 as unknown as ChildProcess)
      if (process.platform === 'win32') {
        spawnQueue.push(new MockTaskkillProcess() as unknown as ChildProcess)
        spawnQueue.push(new MockTaskkillProcess() as unknown as ChildProcess)
      }

      vi.mocked(spawn).mockImplementation(() => {
        const next = spawnQueue.shift()
        if (!next) {
          throw new Error('Unexpected spawn call')
        }
        return next
      })

      const manager = getProcessManager()

      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      await manager.executeCommand({
        commandId: 'cmd-2',
        projectId: 'proj-1',
        command: 'npm run test',
        shell: 'bash',
        isService: true
      })

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (signal === 0) {
          throw new Error('Process not found')
        }
        return true
      })

      const stoppedCount = await manager.stopAllProcesses('proj-1')

      expect(stoppedCount).toBe(2)
      expect(manager.isProcessRunning('cmd-1')).toBe(false)
      expect(manager.isProcessRunning('cmd-2')).toBe(false)
    })
  })

  describe('process info retrieval', () => {
    it('should get process info for running processes', async () => {
      const mockProcess = new MockChildProcess(11116)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      const info = manager.getProcessInfo('cmd-1')

      expect(info).toBeDefined()
      expect(info?.commandId).toBe('cmd-1')
      expect(info?.projectId).toBe('proj-1')
      expect(info?.pid).toBe(11116)
      expect(info?.status).toBe('running')
    })

    it('should get all process info filtered by project', async () => {
      const mockProcess1 = new MockChildProcess(11117)
      const mockProcess2 = new MockChildProcess(11118)

      vi.mocked(spawn)
        .mockReturnValueOnce(mockProcess1 as unknown as ChildProcess)
        .mockReturnValueOnce(mockProcess2 as unknown as ChildProcess)

      const manager = getProcessManager()

      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      await manager.executeCommand({
        commandId: 'cmd-2',
        projectId: 'proj-1',
        command: 'npm run test',
        shell: 'bash',
        isService: true
      })

      const allInfo = manager.getAllProcessInfo('proj-1')

      expect(allInfo).toHaveLength(2)
      expect(allInfo.every((i) => i.projectId === 'proj-1')).toBe(true)
    })
  })

  describe('output capture', () => {
    it('should capture stdout and stderr from service processes', async () => {
      const mockProcess = new MockChildProcess(11119)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      mockProcess.stdout.emit('data', Buffer.from('Server started\n'))
      mockProcess.stderr.emit('data', Buffer.from('Warning: deprecated\n'))

      const output = manager.getProcessOutput('cmd-1')

      expect(output).toHaveLength(2)
      expect(output[0].type).toBe('stdout')
      expect(output[0].data).toContain('Server started')
      expect(output[1].type).toBe('stderr')
      expect(output[1].data).toContain('Warning: deprecated')
    })
  })

  describe('cross-platform shell selection', () => {
    it('should use correct shell for Windows cmd', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const mockProcess = new MockChildProcess(11120)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'dir',
        shell: 'cmd',
        isService: true
      })

      expect(spawn).toHaveBeenCalledWith(
        'cmd.exe',
        ['/c', 'dir'],
        expect.objectContaining({
          shell: false,
          windowsHide: true
        })
      )

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should use correct shell for Unix bash', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux' })

      const mockProcess = new MockChildProcess(11121)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'ls -la',
        shell: 'bash',
        isService: true
      })

      expect(spawn).toHaveBeenCalledWith(
        '/bin/bash',
        ['-c', 'ls -la'],
        expect.objectContaining({
          shell: false,
          windowsHide: true
        })
      )

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })
  })
})

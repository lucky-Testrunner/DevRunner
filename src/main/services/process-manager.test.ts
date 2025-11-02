import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventEmitter } from 'events'
import { ChildProcess } from 'child_process'

vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

vi.mock('../store/store', () => ({
  getProjectStore: vi.fn(() => ({
    getData: vi.fn(() => ({
      version: 1,
      projects: []
    })),
    setData: vi.fn()
  }))
}))

import { spawn } from 'child_process'
import { getProcessManager, resetProcessManager } from './process-manager'

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

describe('ProcessManager', () => {
  beforeEach(() => {
    resetProcessManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetProcessManager()
  })

  describe('executeCommand', () => {
    it('should execute a service command and track PID', async () => {
      const mockProcess = new MockChildProcess(12345)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const result = await manager.executeCommand({
        commandId: 'cmd-1',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      expect(result.success).toBe(true)
      expect(result.pid).toBe(12345)
      expect(result.commandId).toBe('cmd-1')
      expect(manager.isProcessRunning('cmd-1')).toBe(true)
    })

    it('should execute a one-off command and wait for completion', async () => {
      const mockProcess = new MockChildProcess(12346)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const resultPromise = manager.executeCommand({
        commandId: 'cmd-2',
        projectId: 'proj-1',
        command: 'echo hello',
        shell: 'bash',
        isService: false
      })

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('hello\n'))
        mockProcess.emit('exit', 0)
      }, 10)

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.exitCode).toBe(0)
      // oneoff 命令不捕获输出
      expect(result.output).toBeUndefined()
      expect(manager.isProcessRunning('cmd-2')).toBe(false)
    })

    it('should reject if command is already running', async () => {
      const mockProcess = new MockChildProcess(12347)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-3',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      const result = await manager.executeCommand({
        commandId: 'cmd-3',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already running')
    })

    it('should use correct shell command for Windows cmd', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const mockProcess = new MockChildProcess(12348)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-4',
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

    it('should use correct shell command for Windows PowerShell', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const mockProcess = new MockChildProcess(12349)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-5',
        projectId: 'proj-1',
        command: 'Get-Process',
        shell: 'powershell',
        isService: true
      })

      expect(spawn).toHaveBeenCalledWith(
        'powershell.exe',
        ['-NoProfile', '-Command', 'Get-Process'],
        expect.objectContaining({
          shell: false,
          windowsHide: true
        })
      )

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should use correct shell command for Unix bash', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux' })

      const mockProcess = new MockChildProcess(12350)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-6',
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

    it('should respect working directory', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux' })

      const mockProcess = new MockChildProcess(12351)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-7',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        workingDirectory: '/path/to/project',
        isService: true
      })

      expect(spawn).toHaveBeenCalledWith(
        '/bin/bash',
        ['-c', 'npm run dev'],
        expect.objectContaining({
          cwd: '/path/to/project'
        })
      )

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should merge environment variables', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux' })

      const mockProcess = new MockChildProcess(12352)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-8',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        env: { NODE_ENV: 'development', PORT: '3000' },
        isService: true
      })

      expect(spawn).toHaveBeenCalledWith(
        '/bin/bash',
        ['-c', 'npm run dev'],
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_ENV: 'development',
            PORT: '3000'
          })
        })
      )

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })
  })

  describe('stopProcess', () => {
    it('should stop a running process', async () => {
      const mockProcess = new MockChildProcess(12353)
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
        commandId: 'cmd-9',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      expect(manager.isProcessRunning('cmd-9')).toBe(true)

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (signal === 0) {
          throw new Error('Process not found')
        }
        return true
      })

      const stopped = await manager.stopProcess('cmd-9')

      expect(stopped).toBe(true)
      expect(manager.isProcessRunning('cmd-9')).toBe(false)
    })

    it('should return false when stopping non-existent process', async () => {
      const manager = getProcessManager()
      const stopped = await manager.stopProcess('non-existent')

      expect(stopped).toBe(false)
    })

    it('should handle process kill errors gracefully', async () => {
      const mockProcess = new MockChildProcess(12354)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-10',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        throw new Error('Process not found')
      })

      const stopped = await manager.stopProcess('cmd-10')

      expect(stopped).toBe(false)
    })
  })

  describe('stopAllProcesses', () => {
    it('should stop all processes in a project', async () => {
      const mockProcess1 = new MockChildProcess(12355)
      const mockProcess2 = new MockChildProcess(12356)
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
        commandId: 'cmd-11',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      await manager.executeCommand({
        commandId: 'cmd-12',
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
      expect(manager.isProcessRunning('cmd-11')).toBe(false)
      expect(manager.isProcessRunning('cmd-12')).toBe(false)
    })

    it('should stop all processes when no projectId is provided', async () => {
      const mockProcess1 = new MockChildProcess(12357)
      const mockProcess2 = new MockChildProcess(12358)
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
        commandId: 'cmd-13',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      await manager.executeCommand({
        commandId: 'cmd-14',
        projectId: 'proj-2',
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

      const stoppedCount = await manager.stopAllProcesses()

      expect(stoppedCount).toBe(2)
      expect(manager.isProcessRunning('cmd-13')).toBe(false)
      expect(manager.isProcessRunning('cmd-14')).toBe(false)
    })
  })

  describe('getProcessInfo', () => {
    it('should return process info for running process', async () => {
      const mockProcess = new MockChildProcess(12359)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-15',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      const info = manager.getProcessInfo('cmd-15')

      expect(info).toBeDefined()
      expect(info?.commandId).toBe('cmd-15')
      expect(info?.projectId).toBe('proj-1')
      expect(info?.pid).toBe(12359)
      expect(info?.status).toBe('running')
      expect(info?.startedAt).toBeDefined()
    })

    it('should return undefined for non-existent process', () => {
      const manager = getProcessManager()
      const info = manager.getProcessInfo('non-existent')

      expect(info).toBeUndefined()
    })
  })

  describe('getAllProcessInfo', () => {
    it('should return all process info', async () => {
      const mockProcess1 = new MockChildProcess(12360)
      const mockProcess2 = new MockChildProcess(12361)

      vi.mocked(spawn)
        .mockReturnValueOnce(mockProcess1 as unknown as ChildProcess)
        .mockReturnValueOnce(mockProcess2 as unknown as ChildProcess)

      const manager = getProcessManager()

      await manager.executeCommand({
        commandId: 'cmd-16',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      await manager.executeCommand({
        commandId: 'cmd-17',
        projectId: 'proj-2',
        command: 'npm run test',
        shell: 'bash',
        isService: true
      })

      const allInfo = manager.getAllProcessInfo()

      expect(allInfo).toHaveLength(2)
      expect(allInfo.map((i) => i.commandId)).toContain('cmd-16')
      expect(allInfo.map((i) => i.commandId)).toContain('cmd-17')
    })

    it('should filter by projectId', async () => {
      const mockProcess1 = new MockChildProcess(12362)
      const mockProcess2 = new MockChildProcess(12363)

      vi.mocked(spawn)
        .mockReturnValueOnce(mockProcess1 as unknown as ChildProcess)
        .mockReturnValueOnce(mockProcess2 as unknown as ChildProcess)

      const manager = getProcessManager()

      await manager.executeCommand({
        commandId: 'cmd-18',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      await manager.executeCommand({
        commandId: 'cmd-19',
        projectId: 'proj-2',
        command: 'npm run test',
        shell: 'bash',
        isService: true
      })

      const proj1Info = manager.getAllProcessInfo('proj-1')

      expect(proj1Info).toHaveLength(1)
      expect(proj1Info[0].commandId).toBe('cmd-18')
      expect(proj1Info[0].projectId).toBe('proj-1')
    })
  })

  describe('process output capture', () => {
    it('should capture stdout from service process', async () => {
      const mockProcess = new MockChildProcess(12364)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-20',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      mockProcess.stdout.emit('data', Buffer.from('Server started\n'))
      mockProcess.stdout.emit('data', Buffer.from('Listening on port 3000\n'))

      const output = manager.getProcessOutput('cmd-20')

      // 应该有3条输出：启动命令 + 两条stdout
      expect(output).toHaveLength(3)
      expect(output[0].type).toBe('stdout')
      expect(output[0].data).toContain('$ npm run dev')
      expect(output[1].type).toBe('stdout')
      expect(output[1].data).toContain('Server started')
      expect(output[2].data).toContain('Listening on port 3000')
    })

    it('should capture stderr from service process', async () => {
      const mockProcess = new MockChildProcess(12365)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-21',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      mockProcess.stderr.emit('data', Buffer.from('Warning: deprecated API\n'))

      const output = manager.getProcessOutput('cmd-21')

      // 应该有2条输出：启动命令 + stderr
      expect(output).toHaveLength(2)
      expect(output[0].type).toBe('stdout')
      expect(output[0].data).toContain('$ npm run dev')
      expect(output[1].type).toBe('stderr')
      expect(output[1].data).toContain('Warning: deprecated API')
    })

    it('should limit output buffer size', async () => {
      const mockProcess = new MockChildProcess(12366)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-22',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      for (let i = 0; i < 1100; i++) {
        mockProcess.stdout.emit('data', Buffer.from(`Line ${i}\n`))
      }

      const output = manager.getProcessOutput('cmd-22')

      expect(output.length).toBeLessThanOrEqual(1000)
    })

    it('should limit returned output with limit parameter', async () => {
      const mockProcess = new MockChildProcess(12367)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      await manager.executeCommand({
        commandId: 'cmd-23',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      for (let i = 0; i < 200; i++) {
        mockProcess.stdout.emit('data', Buffer.from(`Line ${i}\n`))
      }

      const output = manager.getProcessOutput('cmd-23', 50)

      expect(output).toHaveLength(50)
    })
  })

  describe('process events', () => {
    it('should emit process:started event', async () => {
      const mockProcess = new MockChildProcess(12368)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const startedHandler = vi.fn()
      manager.on('process:started', startedHandler)

      await manager.executeCommand({
        commandId: 'cmd-24',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      expect(startedHandler).toHaveBeenCalledWith({
        commandId: 'cmd-24',
        pid: 12368
      })
    })

    it('should emit process:exit event', async () => {
      const mockProcess = new MockChildProcess(12369)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const exitHandler = vi.fn()
      manager.on('process:exit', exitHandler)

      await manager.executeCommand({
        commandId: 'cmd-25',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      mockProcess.emit('exit', 0, null)

      expect(exitHandler).toHaveBeenCalledWith({
        commandId: 'cmd-25',
        exitCode: 0,
        signal: null
      })
    })

    it('should emit process:error event', async () => {
      const mockProcess = new MockChildProcess(12370)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const errorHandler = vi.fn()
      manager.on('process:error', errorHandler)

      await manager.executeCommand({
        commandId: 'cmd-26',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      mockProcess.emit('error', new Error('Command not found'))

      expect(errorHandler).toHaveBeenCalledWith({
        commandId: 'cmd-26',
        error: 'Command not found'
      })
    })

    it('should emit process:output event', async () => {
      const mockProcess = new MockChildProcess(12371)
      vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)

      const manager = getProcessManager()
      const outputHandler = vi.fn()
      manager.on('process:output', outputHandler)

      await manager.executeCommand({
        commandId: 'cmd-27',
        projectId: 'proj-1',
        command: 'npm run dev',
        shell: 'bash',
        isService: true
      })

      mockProcess.stdout.emit('data', Buffer.from('Test output\n'))

      expect(outputHandler).toHaveBeenCalledWith({
        commandId: 'cmd-27',
        output: expect.objectContaining({
          type: 'stdout',
          data: 'Test output\n'
        })
      })
    })
  })
})

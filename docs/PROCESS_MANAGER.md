# Process Manager Documentation

## Overview

The Process Manager provides a robust system for executing and managing commands across different projects. It supports both long-running service processes and one-off commands, with full cross-platform compatibility (Windows, macOS, Linux).

## Features

- **Cross-platform shell support**: Automatically selects appropriate shell (cmd, PowerShell, bash) based on platform
- **Service vs One-off commands**: Distinguishes between long-running processes and one-time executions
- **PID tracking**: Records and persists process IDs for service commands
- **Process persistence**: Stores running process metadata and reconciles on app restart
- **Output capture**: Captures stdout/stderr for UI consumption
- **Graceful termination**: Platform-specific process stopping with fallbacks
- **Multiple process management**: Execute and stop single or multiple processes
- **Working directory support**: Execute commands in specific directories
- **Environment variables**: Merge custom environment variables with system env

## Architecture

### Components

1. **ProcessManager** (`src/main/services/process-manager.ts`)
   - Core service wrapping `child_process.spawn`
   - Manages process lifecycle and state
   - Handles output buffering and event emission

2. **Process Handlers** (`src/main/ipc/process-handlers.ts`)
   - IPC endpoints for renderer process
   - Bridges UI requests to ProcessManager
   - Structured responses with success/error details

3. **Data Persistence**
   - Stores runtime status in project data
   - Reconciles PIDs with actual OS processes on startup
   - Cleans stale entries automatically

## API Reference

### IPC Endpoints

#### Execute Single Command

```typescript
window.electronAPI.process.execute({
  projectId: 'project-uuid',
  commandId: 'command-uuid'
})
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    commandId: string
    success: boolean
    pid?: number        // For service commands
    exitCode?: number   // For one-off commands
    error?: string
    output?: string     // For one-off commands
  }
  error?: string
}
```

#### Execute Multiple Commands

```typescript
window.electronAPI.process.executeMultiple({
  projectId: 'project-uuid',
  commandIds: ['cmd-1', 'cmd-2', 'cmd-3']
})
```

**Response:**
```typescript
{
  success: boolean
  data?: Array<{
    commandId: string
    success: boolean
    pid?: number
    exitCode?: number
    error?: string
    output?: string
  }>
  error?: string
}
```

#### Stop Process

```typescript
window.electronAPI.process.stop({
  commandId: 'command-uuid'
})
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    commandId: string
    success: boolean
    error?: string
  }
  error?: string
}
```

#### Stop Multiple Processes

```typescript
window.electronAPI.process.stopMultiple({
  commandIds: ['cmd-1', 'cmd-2']
})
```

#### Stop All Processes in Project

```typescript
window.electronAPI.process.stopAll({
  projectId: 'project-uuid'
})
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    stoppedCount: number
  }
  error?: string
}
```

#### Get Process Info

```typescript
window.electronAPI.process.getInfo('command-uuid')
```

**Response:**
```typescript
{
  success: boolean
  data?: {
    commandId: string
    projectId: string
    pid: number
    startedAt: string
    status: 'running' | 'stopped' | 'error'
    exitCode?: number
    error?: string
  } | null
  error?: string
}
```

#### Get All Process Info

```typescript
// Get all processes
window.electronAPI.process.getAllInfo()

// Get processes for specific project
window.electronAPI.process.getAllInfo('project-uuid')
```

#### Get Process Output

```typescript
// Get last 100 lines (default)
window.electronAPI.process.getOutput('command-uuid')

// Get specific number of lines
window.electronAPI.process.getOutput('command-uuid', 50)
```

**Response:**
```typescript
{
  success: boolean
  data?: Array<{
    type: 'stdout' | 'stderr'
    data: string
    timestamp: string
  }>
  error?: string
}
```

#### Check if Process is Running

```typescript
window.electronAPI.process.isRunning('command-uuid')
```

**Response:**
```typescript
{
  success: boolean
  data?: boolean
  error?: string
}
```

## Usage Examples

### Starting a Development Server

```typescript
// Create a service command
const cmdResult = await window.electronAPI.commands.create('project-id', {
  name: 'Dev Server',
  type: 'service',
  shell: 'bash',
  command: 'npm run dev',
  workingDirectory: '/path/to/project',
  autoRestart: true
})

if (cmdResult.success) {
  // Execute the service
  const execResult = await window.electronAPI.process.execute({
    projectId: 'project-id',
    commandId: cmdResult.data.id
  })
  
  if (execResult.success && execResult.data) {
    console.log(`Service started with PID: ${execResult.data.pid}`)
    
    // Monitor output
    setInterval(async () => {
      const output = await window.electronAPI.process.getOutput(
        cmdResult.data.id,
        10
      )
      if (output.success && output.data) {
        output.data.forEach(line => {
          console.log(`[${line.type}] ${line.data}`)
        })
      }
    }, 1000)
  }
}
```

### Running a Build Command

```typescript
// Create a one-off command
const cmdResult = await window.electronAPI.commands.create('project-id', {
  name: 'Build',
  type: 'oneoff',
  shell: 'bash',
  command: 'npm run build',
  workingDirectory: '/path/to/project'
})

if (cmdResult.success) {
  // Execute and wait for completion
  const execResult = await window.electronAPI.process.execute({
    projectId: 'project-id',
    commandId: cmdResult.data.id
  })
  
  if (execResult.success && execResult.data) {
    if (execResult.data.success) {
      console.log('Build completed successfully!')
      console.log(execResult.data.output)
    } else {
      console.error('Build failed:', execResult.data.error)
    }
  }
}
```

### Starting Multiple Services

```typescript
const result = await window.electronAPI.process.executeMultiple({
  projectId: 'project-id',
  commandIds: ['frontend-cmd-id', 'backend-cmd-id', 'db-cmd-id']
})

if (result.success && result.data) {
  result.data.forEach(cmd => {
    if (cmd.success) {
      console.log(`${cmd.commandId} started with PID ${cmd.pid}`)
    } else {
      console.error(`${cmd.commandId} failed: ${cmd.error}`)
    }
  })
}
```

### Stopping All Services in a Project

```typescript
const result = await window.electronAPI.process.stopAll({
  projectId: 'project-id'
})

if (result.success && result.data) {
  console.log(`Stopped ${result.data.stoppedCount} processes`)
}
```

### Monitoring Running Processes

```typescript
// Get all running processes in project
const result = await window.electronAPI.process.getAllInfo('project-id')

if (result.success && result.data) {
  result.data.forEach(info => {
    console.log(`Process ${info.commandId}:`)
    console.log(`  PID: ${info.pid}`)
    console.log(`  Status: ${info.status}`)
    console.log(`  Started: ${info.startedAt}`)
  })
}
```

## Cross-Platform Shell Resolution

The Process Manager automatically selects the appropriate shell based on the platform and shell type specified in the command:

### Windows
- `cmd`: Uses `cmd.exe /c`
- `powershell`: Uses `powershell.exe -NoProfile -Command`
- `bash`: Uses `cmd.exe /c` (fallback)

### Unix (macOS/Linux)
- `cmd`: Uses `/bin/bash -c` (fallback)
- `powershell`: Uses `/bin/bash -c` (fallback)
- `bash`: Uses `/bin/bash -c`

## Process Termination

### Unix Systems
1. Sends SIGTERM signal
2. Polls every 100ms to check if process terminated
3. After 5 seconds, sends SIGKILL if process still running
4. Returns success if process terminated

### Windows
1. Attempts `taskkill /F /T /PID <pid>`
2. Falls back to Node.js `process.kill()` if taskkill fails
3. Handles gracefully if process no longer exists

## Data Persistence

### Runtime Status Storage

Service process metadata is stored in the project data:

```typescript
{
  commandId: string
  status: 'idle' | 'running' | 'stopped' | 'error'
  pid?: number
  startedAt?: string
  stoppedAt?: string
  exitCode?: number
  error?: string
}
```

### Process Reconciliation

On application startup, the Process Manager:
1. Loads stored runtime status from disk
2. Checks if each PID still exists in the OS
3. Removes stale entries for non-existent processes
4. Updates persisted data

This ensures the UI shows accurate process state even after app restarts.

## Error Handling

All IPC endpoints return structured responses with success flags and error messages:

```typescript
interface IpcResult<T> {
  success: boolean
  data?: T
  error?: string
}
```

Common error scenarios:
- Command not found in project
- Process already running
- Process not found when stopping
- Spawn errors (invalid command, permission issues)
- PID tracking failures

## Testing

The Process Manager includes comprehensive tests:
- **25 unit tests** in `process-manager.test.ts`
- **9 integration tests** in `process-handlers.test.ts`

Tests cover:
- Service and one-off command execution
- Cross-platform shell selection
- PID tracking and persistence
- Process stopping (single and multiple)
- Output capture
- Error handling
- Process info retrieval

Run tests with:
```bash
npm test
```

## Events

The ProcessManager emits events that can be listened to:

- `process:started` - When a service process starts
- `process:exit` - When a process exits
- `process:error` - When a process encounters an error
- `process:output` - When a process produces output

Example:
```typescript
import { getProcessManager } from './services/process-manager'

const manager = getProcessManager()

manager.on('process:output', ({ commandId, output }) => {
  console.log(`[${commandId}] ${output.type}: ${output.data}`)
})
```

## Limitations

- Output buffer limited to 1000 lines per process (oldest lines dropped)
- 5-second timeout for graceful process termination
- No support for interactive command input
- Process reconciliation only checks PID existence, not actual command match

## Best Practices

1. **Use service type for long-running processes** (dev servers, watchers)
2. **Use oneoff type for build scripts** and other one-time commands
3. **Always check success flag** in IPC responses
4. **Provide working directories** to ensure commands run in correct context
5. **Stop all services** before closing the application
6. **Monitor process status** before attempting to execute/stop
7. **Handle process output** in chunks to avoid UI blocking

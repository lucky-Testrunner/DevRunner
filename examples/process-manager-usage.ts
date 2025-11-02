// Process Manager Usage Examples

// This file demonstrates how to use the Process Manager API from the renderer process
// All examples assume access to window.electronAPI

// Example 1: Starting a development server (service)
async function startDevServer() {
  // First, create the command
  const cmdResult = await window.electronAPI.commands.create('my-project-id', {
    name: 'Dev Server',
    type: 'service',
    shell: 'bash',
    command: 'npm run dev',
    workingDirectory: '/path/to/project',
    autoRestart: true
  })

  if (!cmdResult.success) {
    console.error('Failed to create command:', cmdResult.error)
    return
  }

  // Execute the service
  const execResult = await window.electronAPI.process.execute({
    projectId: 'my-project-id',
    commandId: cmdResult.data!.id
  })

  if (execResult.success && execResult.data?.success) {
    console.log(`Dev server started with PID: ${execResult.data.pid}`)
    return execResult.data.pid
  } else {
    console.error('Failed to start dev server:', execResult.data?.error || execResult.error)
    return null
  }
}

// Example 2: Running a build command (one-off)
async function runBuild() {
  const cmdResult = await window.electronAPI.commands.create('my-project-id', {
    name: 'Build',
    type: 'oneoff',
    shell: 'bash',
    command: 'npm run build',
    workingDirectory: '/path/to/project',
    env: {
      NODE_ENV: 'production'
    }
  })

  if (!cmdResult.success) {
    console.error('Failed to create command:', cmdResult.error)
    return false
  }

  // Execute and wait for completion
  const execResult = await window.electronAPI.process.execute({
    projectId: 'my-project-id',
    commandId: cmdResult.data!.id
  })

  if (execResult.success && execResult.data?.success) {
    console.log('Build completed successfully!')
    console.log('Output:', execResult.data.output)
    return true
  } else {
    console.error('Build failed:', execResult.data?.error || execResult.error)
    if (execResult.data?.output) {
      console.error('Output:', execResult.data.output)
    }
    return false
  }
}

// Example 3: Starting multiple services at once
async function startAllServices(projectId: string, commandIds: string[]) {
  const result = await window.electronAPI.process.executeMultiple({
    projectId,
    commandIds
  })

  if (!result.success) {
    console.error('Failed to execute commands:', result.error)
    return []
  }

  const successfulPids: number[] = []
  result.data!.forEach((cmd) => {
    if (cmd.success && cmd.pid) {
      console.log(`✓ ${cmd.commandId} started with PID ${cmd.pid}`)
      successfulPids.push(cmd.pid)
    } else {
      console.error(`✗ ${cmd.commandId} failed: ${cmd.error}`)
    }
  })

  return successfulPids
}

// Example 4: Monitoring process output in real-time
async function monitorProcessOutput(commandId: string) {
  const intervalId = setInterval(async () => {
    const isRunning = await window.electronAPI.process.isRunning(commandId)
    
    if (!isRunning.success || !isRunning.data) {
      console.log('Process stopped, ending monitoring')
      clearInterval(intervalId)
      return
    }

    const output = await window.electronAPI.process.getOutput(commandId, 10)
    
    if (output.success && output.data && output.data.length > 0) {
      output.data.forEach((line) => {
        const prefix = line.type === 'stdout' ? '📝' : '⚠️'
        console.log(`${prefix} [${line.timestamp}] ${line.data.trim()}`)
      })
    }
  }, 1000)

  return intervalId
}

// Example 5: Stopping a specific process
async function stopProcess(commandId: string) {
  const result = await window.electronAPI.process.stop({ commandId })

  if (result.success && result.data?.success) {
    console.log(`Process ${commandId} stopped successfully`)
    return true
  } else {
    console.error(
      `Failed to stop process ${commandId}:`,
      result.data?.error || result.error
    )
    return false
  }
}

// Example 6: Stopping all processes in a project
async function stopAllProjectProcesses(projectId: string) {
  const result = await window.electronAPI.process.stopAll({ projectId })

  if (result.success && result.data) {
    console.log(`Stopped ${result.data.stoppedCount} processes`)
    return result.data.stoppedCount
  } else {
    console.error('Failed to stop processes:', result.error)
    return 0
  }
}

// Example 7: Getting detailed process information
async function getProcessDetails(commandId: string) {
  const result = await window.electronAPI.process.getInfo(commandId)

  if (result.success && result.data) {
    const info = result.data
    console.log('Process Details:')
    console.log(`  Command ID: ${info.commandId}`)
    console.log(`  Project ID: ${info.projectId}`)
    console.log(`  PID: ${info.pid}`)
    console.log(`  Status: ${info.status}`)
    console.log(`  Started: ${new Date(info.startedAt).toLocaleString()}`)
    
    if (info.exitCode !== undefined) {
      console.log(`  Exit Code: ${info.exitCode}`)
    }
    
    if (info.error) {
      console.log(`  Error: ${info.error}`)
    }
    
    return info
  } else {
    console.log('Process not found or not running')
    return null
  }
}

// Example 8: Dashboard view - list all running processes
async function showProcessDashboard(projectId: string) {
  const result = await window.electronAPI.process.getAllInfo(projectId)

  if (!result.success) {
    console.error('Failed to get process info:', result.error)
    return
  }

  if (!result.data || result.data.length === 0) {
    console.log('No processes running')
    return
  }

  console.log('\n=== Running Processes ===')
  for (const info of result.data) {
    const uptime = Date.now() - new Date(info.startedAt).getTime()
    const uptimeMinutes = Math.floor(uptime / 60000)
    
    console.log(`\n📦 ${info.commandId}`)
    console.log(`   Status: ${info.status}`)
    console.log(`   PID: ${info.pid}`)
    console.log(`   Uptime: ${uptimeMinutes} minutes`)
  }
  console.log('\n========================\n')
}

// Example 9: Restart a service
async function restartService(projectId: string, commandId: string) {
  console.log('Stopping service...')
  const stopResult = await window.electronAPI.process.stop({ commandId })

  if (!stopResult.success || !stopResult.data?.success) {
    console.error('Failed to stop service:', stopResult.data?.error || stopResult.error)
    return false
  }

  // Wait a bit for cleanup
  await new Promise((resolve) => setTimeout(resolve, 1000))

  console.log('Starting service...')
  const startResult = await window.electronAPI.process.execute({
    projectId,
    commandId
  })

  if (startResult.success && startResult.data?.success) {
    console.log(`Service restarted with PID: ${startResult.data.pid}`)
    return true
  } else {
    console.error('Failed to start service:', startResult.data?.error || startResult.error)
    return false
  }
}

// Example 10: Windows PowerShell command
async function runPowerShellCommand(projectId: string) {
  const cmdResult = await window.electronAPI.commands.create(projectId, {
    name: 'PowerShell Script',
    type: 'oneoff',
    shell: 'powershell',
    command: 'Get-Process | Where-Object {$_.CPU -gt 100}',
    workingDirectory: 'C:\\Users\\MyUser'
  })

  if (!cmdResult.success) {
    console.error('Failed to create command:', cmdResult.error)
    return
  }

  const execResult = await window.electronAPI.process.execute({
    projectId,
    commandId: cmdResult.data!.id
  })

  if (execResult.success && execResult.data?.success) {
    console.log('PowerShell command output:', execResult.data.output)
  } else {
    console.error('PowerShell command failed:', execResult.data?.error || execResult.error)
  }
}

// Example 11: Full project lifecycle
async function projectLifecycle() {
  // 1. Create project
  const projectResult = await window.electronAPI.projects.create({
    name: 'Full Stack App',
    description: 'Example full-stack application',
    path: '/path/to/project'
  })

  if (!projectResult.success) {
    console.error('Failed to create project:', projectResult.error)
    return
  }

  const projectId = projectResult.data!.id

  // 2. Create commands
  const frontendCmd = await window.electronAPI.commands.create(projectId, {
    name: 'Frontend Dev',
    type: 'service',
    shell: 'bash',
    command: 'npm run dev',
    workingDirectory: '/path/to/project/frontend',
    env: { PORT: '3000' }
  })

  const backendCmd = await window.electronAPI.commands.create(projectId, {
    name: 'Backend Dev',
    type: 'service',
    shell: 'bash',
    command: 'npm run dev',
    workingDirectory: '/path/to/project/backend',
    env: { PORT: '8000' }
  })

  if (!frontendCmd.success || !backendCmd.success) {
    console.error('Failed to create commands')
    return
  }

  // 3. Start all services
  const commandIds = [frontendCmd.data!.id, backendCmd.data!.id]
  console.log('Starting services...')
  const pids = await startAllServices(projectId, commandIds)

  if (pids.length === 2) {
    console.log('All services started successfully!')

    // 4. Monitor for a while
    console.log('Monitoring services...')
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // 5. Show dashboard
    await showProcessDashboard(projectId)

    // 6. Stop all services
    console.log('Stopping all services...')
    const stoppedCount = await stopAllProjectProcesses(projectId)
    console.log(`Cleanup complete. Stopped ${stoppedCount} processes.`)
  }
}

// Export for use in other modules
export {
  startDevServer,
  runBuild,
  startAllServices,
  monitorProcessOutput,
  stopProcess,
  stopAllProjectProcesses,
  getProcessDetails,
  showProcessDashboard,
  restartService,
  runPowerShellCommand,
  projectLifecycle
}

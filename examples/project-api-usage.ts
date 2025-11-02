// Example usage of the Projects and Commands API
// This file demonstrates how to use the electron API in the renderer process

async function exampleUsage() {
  // ========== Projects ==========

  // Create a new project
  const createResult = await window.electronAPI.projects.create({
    name: 'My Web App',
    description: 'A full-stack web application',
    path: '/Users/username/projects/my-web-app'
  })

  if (!createResult.success) {
    console.error('Failed to create project:', createResult.error)
    return
  }

  const project = createResult.data!
  console.log('Created project:', project)

  // List all projects
  const listResult = await window.electronAPI.projects.list()
  if (listResult.success) {
    console.log('All projects:', listResult.data)
  }

  // Get a specific project
  const getResult = await window.electronAPI.projects.get(project.id)
  if (getResult.success && getResult.data) {
    console.log('Retrieved project:', getResult.data)
  }

  // Update a project
  const updateResult = await window.electronAPI.projects.update(project.id, {
    description: 'Updated: A full-stack web application with React and Node.js'
  })
  if (updateResult.success) {
    console.log('Updated project:', updateResult.data)
  }

  // ========== Commands ==========

  // Create a development server command (service)
  const devServerResult = await window.electronAPI.commands.create(project.id, {
    name: 'Dev Server',
    description: 'Start development server',
    type: 'service',
    shell: 'bash',
    command: 'npm run dev',
    workingDirectory: project.path,
    env: {
      NODE_ENV: 'development',
      PORT: '3000'
    },
    autoRestart: true
  })

  if (devServerResult.success) {
    console.log('Created dev server command:', devServerResult.data)
  }

  // Create a build command (one-off)
  const buildResult = await window.electronAPI.commands.create(project.id, {
    name: 'Build',
    description: 'Build for production',
    type: 'oneoff',
    shell: 'bash',
    command: 'npm run build',
    workingDirectory: project.path,
    env: {
      NODE_ENV: 'production'
    }
  })

  if (buildResult.success) {
    console.log('Created build command:', buildResult.data)
  }

  // Create a test command (one-off)
  const testResult = await window.electronAPI.commands.create(project.id, {
    name: 'Run Tests',
    description: 'Run all tests',
    type: 'oneoff',
    shell: 'bash',
    command: 'npm test',
    workingDirectory: project.path
  })

  if (testResult.success) {
    console.log('Created test command:', testResult.data)
  }

  // List all commands in the project
  const commandsListResult = await window.electronAPI.commands.list(project.id)
  if (commandsListResult.success) {
    console.log('All commands in project:', commandsListResult.data)
  }

  // Update a command
  if (buildResult.success && buildResult.data) {
    const updateCommandResult = await window.electronAPI.commands.update(
      project.id,
      buildResult.data.id,
      {
        command: 'npm run build && npm run analyze'
      }
    )
    if (updateCommandResult.success) {
      console.log('Updated build command:', updateCommandResult.data)
    }
  }

  // Delete a command
  if (testResult.success && testResult.data) {
    const deleteCommandResult = await window.electronAPI.commands.delete(
      project.id,
      testResult.data.id
    )
    if (deleteCommandResult.success && deleteCommandResult.data) {
      console.log('Deleted test command')
    }
  }

  // Delete the project (and all its commands)
  // Uncomment to actually delete:
  // const deleteProjectResult = await window.electronAPI.projects.delete(project.id)
  // if (deleteProjectResult.success && deleteProjectResult.data) {
  //   console.log('Deleted project')
  // }
}

// Error handling example
async function errorHandlingExample() {
  // Try to create a project with an empty name
  const result = await window.electronAPI.projects.create({ name: '' })
  if (!result.success) {
    console.error('Validation error:', result.error)
    // Output: "Validation error: Project name must be a non-empty string"
  }

  // Try to create a duplicate project
  await window.electronAPI.projects.create({ name: 'Test Project' })
  const duplicateResult = await window.electronAPI.projects.create({ name: 'Test Project' })
  if (!duplicateResult.success) {
    console.error('Duplicate error:', duplicateResult.error)
    // Output: "Validation error: Project with name "Test Project" already exists"
  }

  // Try to update a non-existent project
  const updateResult = await window.electronAPI.projects.update('non-existent-id', {
    name: 'Updated'
  })
  if (!updateResult.success) {
    console.error('Not found error:', updateResult.error)
    // Output: "Validation error: Project with ID "non-existent-id" not found"
  }
}

// React/Vue component example
class ProjectManager {
  async loadProjects() {
    const result = await window.electronAPI.projects.list()
    if (result.success) {
      return result.data || []
    }
    throw new Error(result.error || 'Failed to load projects')
  }

  async createProject(name: string, description?: string, path?: string) {
    const result = await window.electronAPI.projects.create({ name, description, path })
    if (result.success) {
      return result.data!
    }
    throw new Error(result.error || 'Failed to create project')
  }

  async loadCommands(projectId: string) {
    const result = await window.electronAPI.commands.list(projectId)
    if (result.success) {
      return result.data || []
    }
    throw new Error(result.error || 'Failed to load commands')
  }

  async createCommand(
    projectId: string,
    commandData: {
      name: string
      type: 'service' | 'oneoff'
      shell: 'cmd' | 'powershell' | 'bash'
      command: string
      description?: string
      workingDirectory?: string
      env?: Record<string, string>
      autoRestart?: boolean
    }
  ) {
    const result = await window.electronAPI.commands.create(projectId, commandData)
    if (result.success) {
      return result.data!
    }
    throw new Error(result.error || 'Failed to create command')
  }
}

// Export for use in your app
export { exampleUsage, errorHandlingExample, ProjectManager }

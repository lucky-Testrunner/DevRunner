# Projects Data Persistence

This document describes the project and command data persistence implementation in the Electron application.

## Overview

The application persists project and command data using `electron-store`, providing atomic writes, automatic backups, and corruption recovery. All data is stored locally on the user's machine.

## Architecture

### Data Structure

```typescript
interface Project {
  id: string
  name: string
  description?: string
  path?: string
  commands: Command[]
  createdAt: string
  updatedAt: string
}

interface Command {
  id: string
  name: string
  description?: string
  type: 'service' | 'oneoff'  // service: long-running, oneoff: one-time execution
  shell: 'cmd' | 'powershell' | 'bash'
  command: string
  workingDirectory?: string
  env?: Record<string, string>
  autoRestart?: boolean
  createdAt: string
  updatedAt: string
}
```

### Components

1. **Store** (`src/main/store/store.ts`)
   - Manages `electron-store` instance
   - Handles data integrity checks
   - Automatic backup creation and restoration
   - Corruption detection and recovery

2. **Repositories** (`src/main/repository/`)
   - `ProjectRepository`: CRUD operations for projects
   - `CommandRepository`: CRUD operations for commands within projects
   - Validation and uniqueness checks
   - Data isolation per project

3. **Validation** (`src/main/validation/validators.ts`)
   - Input validation for all data operations
   - Type checking for shell and command types
   - Name and ID validation

4. **IPC Handlers** (`src/main/ipc/`)
   - `project-handlers.ts`: Project operations exposed to renderer
   - `command-handlers.ts`: Command operations exposed to renderer
   - Error handling and result wrapping

## Usage from Renderer Process

All operations return an `IpcResult` object:

```typescript
interface IpcResult<T> {
  success: boolean
  data?: T
  error?: string
}
```

### Projects API

#### List all projects

```typescript
const result = await window.electronAPI.projects.list()
if (result.success) {
  console.log('Projects:', result.data)
} else {
  console.error('Error:', result.error)
}
```

#### Get a project by ID

```typescript
const result = await window.electronAPI.projects.get(projectId)
if (result.success && result.data) {
  console.log('Project:', result.data)
}
```

#### Create a project

```typescript
const result = await window.electronAPI.projects.create({
  name: 'My Project',
  description: 'A sample project',
  path: '/path/to/project'
})
if (result.success) {
  console.log('Created project:', result.data)
}
```

#### Update a project

```typescript
const result = await window.electronAPI.projects.update(projectId, {
  name: 'Updated Name',
  description: 'Updated description'
})
if (result.success) {
  console.log('Updated project:', result.data)
}
```

#### Delete a project

```typescript
const result = await window.electronAPI.projects.delete(projectId)
if (result.success && result.data) {
  console.log('Project deleted')
}
```

### Commands API

#### List commands in a project

```typescript
const result = await window.electronAPI.commands.list(projectId)
if (result.success) {
  console.log('Commands:', result.data)
}
```

#### Get a command by ID

```typescript
const result = await window.electronAPI.commands.get(projectId, commandId)
if (result.success && result.data) {
  console.log('Command:', result.data)
}
```

#### Create a command

```typescript
const result = await window.electronAPI.commands.create(projectId, {
  name: 'Build',
  type: 'oneoff',
  shell: 'bash',
  command: 'npm run build',
  description: 'Build the project',
  workingDirectory: '/path/to/project',
  env: { NODE_ENV: 'production' },
  autoRestart: false
})
if (result.success) {
  console.log('Created command:', result.data)
}
```

#### Update a command

```typescript
const result = await window.electronAPI.commands.update(projectId, commandId, {
  name: 'Updated Build',
  command: 'npm run build:prod'
})
if (result.success) {
  console.log('Updated command:', result.data)
}
```

#### Delete a command

```typescript
const result = await window.electronAPI.commands.delete(projectId, commandId)
if (result.success && result.data) {
  console.log('Command deleted')
}
```

## Data Persistence

### Storage Location

- **Production**: Data is stored in the OS-specific user data directory:
  - Windows: `%APPDATA%/Electron Vue App/projects.json`
  - macOS: `~/Library/Application Support/Electron Vue App/projects.json`
  - Linux: `~/.config/Electron Vue App/projects.json`

- **Backup**: A backup file is automatically created at `projects-backup.json` in the same directory

### Features

1. **Atomic Writes**: All write operations are atomic, preventing data corruption from crashes
2. **Automatic Backups**: A backup is created after every successful write
3. **Corruption Recovery**: If the main data file is corrupted, it automatically restores from backup
4. **Schema Validation**: All data is validated against the schema before persistence
5. **Migration Support**: Built-in version handling for future schema migrations

## Validation Rules

### Projects

- `name`: Required, non-empty string, max 255 characters, must be unique
- `description`: Optional string
- `path`: Optional string
- `commands`: Optional array of Command objects

### Commands

- `name`: Required, non-empty string, max 255 characters, must be unique within project
- `type`: Required, must be 'service' or 'oneoff'
- `shell`: Required, must be 'cmd', 'powershell', or 'bash'
- `command`: Required, non-empty string
- `description`: Optional string
- `workingDirectory`: Optional string
- `env`: Optional object with string key-value pairs
- `autoRestart`: Optional boolean

## Error Handling

All API calls handle errors gracefully and return descriptive error messages:

- **Validation errors**: Input validation failures (e.g., empty name, invalid type)
- **Not found errors**: Resource doesn't exist (e.g., project or command ID not found)
- **Duplicate errors**: Unique constraint violations (e.g., duplicate project name)

Example error handling:

```typescript
const result = await window.electronAPI.projects.create({ name: '' })
if (!result.success) {
  // result.error will contain: "Validation error: Project name must be a non-empty string"
  console.error(result.error)
}
```

## Testing

Run the test suite:

```bash
npm test
```

The test suite covers:
- Repository operations (CRUD)
- Data validation
- Uniqueness constraints
- Error handling
- Data persistence across instances

## Future Enhancements

Potential areas for extension:

1. **Export/Import**: Export projects to JSON and import them
2. **Search**: Full-text search across projects and commands
3. **Tags**: Add tagging support for better organization
4. **History**: Track command execution history
5. **Templates**: Create project templates for quick setup

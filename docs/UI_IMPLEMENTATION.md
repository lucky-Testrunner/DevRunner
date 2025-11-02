# Vue UI Implementation

This document describes the Vue-based user interface implementation for the Electron project manager.

## Overview

The UI provides a complete interface for managing projects, commands, and processes with the following features:

- Project management (create, edit, delete)
- Command management (create, edit, delete)
- Process execution controls (run, stop, batch operations)
- Real-time status monitoring
- Process output logs
- Toast notifications for feedback

## Architecture

### State Management (Pinia)

The application uses Pinia for state management with four main stores:

#### 1. Projects Store (`stores/projects.ts`)
- Manages project data and CRUD operations
- Tracks selected project
- Handles loading states and errors
- Methods:
  - `loadProjects()` - Load all projects from main process
  - `createProject()` - Create a new project
  - `updateProject()` - Update existing project
  - `deleteProject()` - Delete a project
  - `selectProject()` - Set active project

#### 2. Commands Store (`stores/commands.ts`)
- Manages commands for the selected project
- Handles command selection for batch operations
- Methods:
  - `loadCommands()` - Load commands for a project
  - `createCommand()` - Create a new command
  - `updateCommand()` - Update existing command
  - `deleteCommand()` - Delete a command
  - `toggleCommandSelection()` - Toggle command selection
  - `selectAllCommands()` - Select all commands
  - `clearSelection()` - Clear selection

#### 3. Processes Store (`stores/processes.ts`)
- Manages process execution and monitoring
- Tracks running processes and their output
- Methods:
  - `executeCommand()` - Execute a single command
  - `executeMultiple()` - Execute multiple commands
  - `stopCommand()` - Stop a running command
  - `stopMultiple()` - Stop multiple commands
  - `refreshProcessInfo()` - Refresh process status
  - `loadProcessOutput()` - Load process logs

#### 4. Toast Store (`stores/toast.ts`)
- Manages toast notifications
- Methods:
  - `success()` - Show success message
  - `error()` - Show error message
  - `info()` - Show info message
  - `warning()` - Show warning message

### Components

#### Layout Components

**Sidebar (`components/Sidebar.vue`)**
- Displays list of projects
- Shows project metadata (command count, running services)
- Project CRUD actions
- Visual indication of active project

**CommandList (`components/CommandList.vue`)**
- Grid/card layout for commands
- Command selection checkboxes
- Status indicators (running, stopped, executing)
- Execution controls per command
- Expandable logs viewer
- Command CRUD actions

**ExecutionControls (`components/ExecutionControls.vue`)**
- Batch operation controls
- Selection management
- Running services counter
- Run/stop buttons for selected commands

#### Dialog Components

**ProjectDialog (`components/ProjectDialog.vue`)**
- Form for creating/editing projects
- Fields:
  - Name (required)
  - Description (optional)
  - Path (optional, with browse button)
- Validation and error display

**CommandDialog (`components/CommandDialog.vue`)**
- Form for creating/editing commands
- Fields:
  - Name (required)
  - Description (optional)
  - Type (service/one-off)
  - Shell (bash/cmd/powershell)
  - Command text (required)
  - Working directory (optional, with browse button)
  - Environment variables (key-value pairs)
  - Auto-restart option (for services)
- Platform-aware default shell selection

#### Utility Components

**ToastContainer (`components/ToastContainer.vue`)**
- Toast notification display
- Auto-dismiss with configurable duration
- Color-coded by type (success, error, warning, info)
- Click to dismiss

### Features

#### Real-time Updates
- Process status polling (every 2 seconds)
- Automatic UI updates on status changes
- Live process information (PID, status)

#### Batch Operations
- Select multiple commands
- Run all selected commands
- Stop all selected commands
- Stop all running commands in project

#### Process Monitoring
- Visual status indicators
- PID display for running processes
- Expandable log viewer per command
- Timestamp for log entries
- Color-coded stdout/stderr

#### User Feedback
- Optimistic UI updates
- Loading states during operations
- Toast notifications for all actions
- Inline error messages in forms
- Confirmation dialogs for destructive actions

#### Responsive Design
- Flexible grid layout for command cards
- Scrollable areas for long lists
- Sidebar with fixed width
- Adaptive to different screen sizes

### Styling

The UI uses a dark theme with the following color palette:

- Background: `#1a202c` (dark)
- Surface: `#2d3748` (medium dark)
- Border: `#4a5568` (gray)
- Text: `#e2e8f0` (light)
- Accent: `#4299e1` (blue)
- Success: `#48bb78` (green)
- Error: `#f56565` (red)
- Warning: `#ed8936` (orange)

Custom scrollbars are styled to match the dark theme.

### IPC Integration

All UI actions communicate with the main process via the IPC API exposed through the preload script:

- `window.electronAPI.projects.*` - Project operations
- `window.electronAPI.commands.*` - Command operations
- `window.electronAPI.process.*` - Process operations

### Data Flow

1. User action in UI component
2. Component emits event
3. Parent component (App.vue) handles event
4. Calls appropriate store method
5. Store invokes IPC method
6. Main process handles request
7. Response returned to store
8. Store updates reactive state
9. UI automatically updates
10. Toast notification displayed

### Persistence

- All data is persisted via the main process
- Projects and commands automatically saved to electron-store
- Process state is maintained in memory
- Data reloads on app restart

## Usage Examples

### Creating a Project
1. Click "+" button in sidebar or "Create First Project"
2. Fill in project name (required)
3. Optionally add description and path
4. Click "Create"
5. Project appears in sidebar and is automatically selected

### Adding a Command
1. Select a project from sidebar
2. Click "+ Add Command"
3. Fill in command details:
   - Name (e.g., "Web Server")
   - Type (service for long-running, one-off for tasks)
   - Shell (auto-detected based on platform)
   - Command text (e.g., "npm start")
   - Working directory (optional)
   - Environment variables (optional)
4. Click "Create"
5. Command appears in command list

### Running Commands
- Single command: Click "▶ Run" button on command card
- Multiple commands: Check selection boxes, click "Run Selected"
- View logs: Click on logs section of running command

### Stopping Commands
- Single command: Click "Stop" button on command card
- Multiple commands: Select commands, click "Stop Selected"
- All commands: Click "Stop All"

## Browser Compatibility

The UI is designed for Electron's Chromium-based renderer and uses:
- Vue 3 Composition API
- ES6+ features
- CSS Grid and Flexbox
- Custom scrollbar styling (WebKit)

## Future Enhancements

Potential improvements:
- Real-time log streaming via IPC events
- Command output filtering/search
- Command templates
- Project import/export
- Keyboard shortcuts
- Command grouping/categorization
- Performance metrics
- Dark/light theme toggle

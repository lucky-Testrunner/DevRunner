# Quick Start Guide - Vue UI

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

## First Time Usage

### Create Your First Project

1. Launch the application
2. Click **"Create Your First Project"**
3. Enter:
   - **Name**: My Project
   - **Description**: (optional)
   - **Path**: (optional) /path/to/project
4. Click **Create**

### Add Your First Command

1. With project selected, click **"+ Add Command"**
2. Enter:
   - **Name**: Start Server
   - **Type**: Service (for long-running) or One-off (for tasks)
   - **Shell**: Auto-detected based on your OS
   - **Command**: `npm start` (or any command)
   - **Working Directory**: (optional)
3. Click **Create**

### Run Commands

**Single Command:**
- Click the **"▶ Run"** button on any command card

**Multiple Commands:**
1. Check the boxes on multiple commands
2. Click **"Run Selected (X)"** in the top controls

**View Logs:**
- Click the **"Logs"** section on any running command to expand/collapse

### Stop Commands

**Single Command:**
- Click the **"Stop"** button on a running command

**Multiple Commands:**
1. Select commands
2. Click **"Stop Selected"**

**All Commands:**
- Click **"Stop All (X)"** to stop all running services

## Key Features

### Project Management
- Create, edit, delete projects
- Switch between projects
- See running service count per project

### Command Management
- Full command configuration (shell, env vars, working dir)
- Service vs one-off command types
- Auto-restart option for services
- Multi-select for batch operations

### Process Control
- Execute single or multiple commands
- Stop single or multiple processes
- Real-time status updates
- PID display for running processes

### Monitoring
- Visual status indicators (green = running, gray = stopped)
- Expandable log viewer per command
- Color-coded output (stdout/stderr)
- Running service counter

### User Experience
- Auto-save (all changes persist immediately)
- Toast notifications for feedback
- Loading states during operations
- Confirmation for destructive actions
- Dark theme for comfortable viewing

## Keyboard Tips

- **Tab**: Navigate form fields
- **Enter**: Submit forms
- **Click dialog background**: Close dialog

## Common Workflows

### Startup All Services
1. Select your project
2. Check all service commands
3. Click "Run Selected"
4. Monitor status in real-time

### Quick Task Execution
1. Create one-off command
2. Click "Run"
3. View output in logs
4. Command stops automatically when complete

### Development Environment
1. Create project for your app
2. Add commands:
   - Backend server (service)
   - Frontend dev server (service)
   - Database (service)
   - Build tasks (one-off)
3. Select all services, click "Run Selected"
4. Switch to logs view to monitor

## Troubleshooting

### Command Won't Start
- Verify command syntax
- Check working directory exists
- Ensure correct shell selected
- Review environment variables

### Logs Not Appearing
- Click logs header to expand
- Wait a moment for output
- Check if command produces output

### Selection Not Working
- Click "Clear" to reset
- Selection is per-project

## Tips

1. **Organization**: Create separate projects for different apps
2. **Services**: Use service type for long-running processes
3. **One-offs**: Use one-off type for build scripts and tasks
4. **Env Vars**: Add environment variables for configuration
5. **Auto-restart**: Enable for critical services
6. **Working Dir**: Set to ensure correct command context

## Next Steps

- Read [UI Implementation Guide](docs/UI_IMPLEMENTATION.md) for details
- Check [Sample Workflow](examples/sample-ui-workflow.md) for testing
- Explore [Implementation Summary](VUE_UI_IMPLEMENTATION_SUMMARY.md) for architecture

## Support

For issues or questions:
1. Check documentation in `/docs` folder
2. Review examples in `/examples` folder
3. Check browser console for errors (Ctrl/Cmd + Shift + I)

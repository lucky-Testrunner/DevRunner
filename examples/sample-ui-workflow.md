# Sample UI Workflow

This document provides a sample workflow for testing the Vue UI.

## Initial Setup

When you first launch the application, you'll see a welcome screen with no projects.

### Step 1: Create Your First Project

1. Click "Create Your First Project" or the "+" button in the sidebar
2. Fill in the form:
   - **Name**: "My Web App"
   - **Description**: "Full-stack web application"
   - **Path**: "/home/user/projects/webapp" (optional)
3. Click "Create"

The project will appear in the sidebar and be automatically selected.

### Step 2: Add Commands

#### Command 1: Backend Server (Service)
1. Click "+ Add Command" in the main panel
2. Fill in:
   - **Name**: "Backend Server"
   - **Description**: "Node.js API server"
   - **Type**: Service (Long-running)
   - **Shell**: Bash
   - **Command**: `npm run server`
   - **Working Directory**: `/home/user/projects/webapp/backend`
   - **Auto-restart**: Checked
3. Click "Create"

#### Command 2: Frontend Dev Server (Service)
1. Click "+ Add Command"
2. Fill in:
   - **Name**: "Frontend Dev"
   - **Description**: "React development server"
   - **Type**: Service
   - **Shell**: Bash
   - **Command**: `npm start`
   - **Working Directory**: `/home/user/projects/webapp/frontend`
3. Click "Create"

#### Command 3: Database Migration (One-off)
1. Click "+ Add Command"
2. Fill in:
   - **Name**: "Run Migrations"
   - **Description**: "Apply database migrations"
   - **Type**: One-off (Task)
   - **Shell**: Bash
   - **Command**: `npm run migrate`
   - **Working Directory**: `/home/user/projects/webapp/backend`
   - **Environment Variables**:
     - `DATABASE_URL`: `postgresql://localhost/myapp`
3. Click "Create"

### Step 3: Running Commands

#### Run Individual Command
1. Locate the "Backend Server" command card
2. Click the "▶ Run" button
3. Observe:
   - Status changes to "● Running"
   - PID is displayed
   - "Stop" button appears
   - Running count in execution controls increases

#### Run Multiple Commands
1. Check the selection boxes for both "Backend Server" and "Frontend Dev"
2. Notice the execution controls show "2 selected"
3. Click "Run Selected (2)"
4. Both commands start simultaneously
5. Toast notification shows success

#### View Logs
1. Find a running command card
2. Click on the "Logs" section
3. The logs expand to show output
4. Scroll through stdout (white) and stderr (red) entries
5. Click again to collapse

### Step 4: Stopping Commands

#### Stop Single Command
1. Find a running command
2. Click the "Stop" button
3. Status updates to show stopped state
4. PID information clears

#### Stop All Running
1. With multiple services running
2. Click "Stop All (X)" in execution controls
3. Confirm the action
4. All running commands stop
5. Toast shows count of stopped commands

### Step 5: Managing Projects and Commands

#### Edit Command
1. Hover over a command card
2. Click the "✎" (edit) button
3. Modify any fields (e.g., change working directory)
4. Click "Save"
5. Changes are persisted

#### Delete Command
1. Hover over a command card
2. Click the "×" (delete) button
3. Confirm deletion
4. Command is removed from list

#### Edit Project
1. Hover over project in sidebar
2. Click the "✎" (edit) button
3. Update project details
4. Click "Save"

#### Delete Project
1. Hover over project in sidebar
2. Click the "×" (delete) button
3. Confirm deletion (warning: cannot be undone)
4. Project and all its commands are removed

### Step 6: Working with Multiple Projects

#### Create Second Project
1. Click "+" in sidebar
2. Create "Mobile App" project
3. Add commands specific to mobile development

#### Switch Between Projects
1. Click on "My Web App" in sidebar
2. Main panel shows web app commands
3. Click on "Mobile App" in sidebar
4. Main panel switches to mobile app commands
5. Running services indicator shows count per project

## Testing Scenarios

### Scenario 1: Startup All Services
1. Select all service-type commands
2. Click "Run Selected"
3. Verify all start successfully
4. Check logs for startup messages

### Scenario 2: Error Handling
1. Create a command with invalid syntax (e.g., `invalid-command-xyz`)
2. Try to run it
3. Observe error toast notification
4. Check command status shows error state

### Scenario 3: Restart Workflow
1. Start several commands
2. Close the application
3. Reopen the application
4. Verify:
   - Projects are loaded
   - Commands are shown
   - Previously running services are stopped (expected behavior)

### Scenario 4: Batch Operations
1. Create 5-10 commands
2. Select all with "Select All" button
3. Run all at once
4. Monitor execution progress
5. Stop all at once

### Scenario 5: Environment Variables
1. Create command with env vars
2. Add multiple KEY=VALUE pairs
3. Run command
4. Verify environment is passed correctly (check logs)

## Expected Behaviors

### Visual Indicators
- **Running service**: Green "● Running" indicator
- **Stopped service**: Gray state, "Run" button available
- **Executing**: Orange "⏳ Executing..." indicator
- **Selected command**: Blue border on card
- **Active project**: Blue left border in sidebar

### Notifications
- **Success**: Green toast (e.g., "Command started with PID 12345")
- **Error**: Red toast (e.g., "Failed to execute command")
- **Info**: Blue toast (e.g., general information)

### Loading States
- Buttons show "Saving..." when processing
- Disabled state during operations
- Spinner or loading text in lists

### Persistence
- All changes saved immediately
- No manual save required
- Data survives app restart

## Common Issues

### Command Won't Start
- Check command syntax
- Verify working directory exists
- Ensure shell is correct for platform
- Check environment variables

### Logs Not Showing
- Click logs header to expand
- Refresh by toggling closed/open
- Check if command is actually producing output

### Selection Issues
- Use "Clear" to reset selection
- Selection is per-project (switches when changing projects)

## Keyboard Tips

While the UI is primarily mouse-driven, standard browser shortcuts work:
- `Ctrl/Cmd + R`: Refresh window (development only)
- `Ctrl/Cmd + Shift + I`: Open DevTools (development only)
- `Tab`: Navigate between form fields
- `Enter`: Submit forms
- `Esc`: Close dialogs (planned enhancement)

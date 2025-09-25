# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based task management system called "Task Master" that helps organize, track, and manage tasks from multiple sources including markdown files. The system is built with vanilla HTML, CSS, and JavaScript for local use.

## Repository Structure

- `task_manager.html` - Main application interface with modern responsive UI
- `task_manager.js` - Core application logic and task management functionality
- `task_master.json` - Master file format example (JSON structure for data persistence)
- `sample_tasks.md` - Example markdown file showing supported task formats
- `tasks.md` - Original sample file used as reference for the system
- `README.md` - Comprehensive documentation and user guide

## Development Commands

This is a client-side only application with no build process required:

```bash
# To run the application:
# Simply open task_manager.html in any modern web browser

# To test with sample data:
# Load sample_tasks.md using the "Load MD Files" button in the interface

# For development:
# Edit task_manager.html for UI changes
# Edit task_manager.js for functionality changes
# No compilation or build step needed
```

## Key Features

The task management system includes:

### Core Functionality
- Markdown file parsing with various checkbox formats (`[ ]`, `[x]`, `[_]`, `[✓]`)
- Smart duplicate detection and task merging
- Category auto-detection (Bug, Feature, Testing, Documentation)
- Task status tracking (Pending, In Progress, Completed)
- Notes system for detailed task information

### UI Components
- Card view and table view with sorting capabilities
- Advanced filtering (by status, category, search terms)
- Real-time statistics dashboard
- Modal dialogs for task editing
- Responsive design for all device sizes

### Data Management
- JSON-based master file format with versioning
- Local storage persistence
- Export/import functionality
- Task checksum system for duplicate prevention

## Working with the System

### For Users
- Open `task_manager.html` in a web browser
- Load markdown files containing tasks using the file input
- Use card or table views to manage tasks
- Export data regularly using the master file export

### For Developers
- The system uses vanilla JavaScript (ES6+) with class-based architecture
- All data is stored locally (localStorage + JSON export)
- No external dependencies or frameworks required
- Modular code structure in `task_manager.js` with clear separation of concerns

## Task File Formats

The system parses markdown files with this structure:
- Section headers (`## Phase 1: Foundation`)
- Task lists with checkboxes (`- [x] Completed task`)
- Various status indicators (`[ ]`, `[x]`, `[_]`, `[-]`, `[✓]`, `[✗]`)
- Automatic category detection based on keywords and context

## Data Structure

Master file uses this JSON format:
```json
{
  "version": "1.0",
  "lastUpdated": "ISO-8601-timestamp",
  "tasks": [...],
  "metadata": { ... }
}
```

Each task includes: id, title, status, category, source, notes, timestamps, and checksum for duplicate detection.
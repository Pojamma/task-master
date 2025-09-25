# 📋 Task Master - Advanced Task Management System

A powerful, web-based task management tool that helps you organize, track, and manage tasks from multiple sources including markdown files. Perfect for developers, project managers, and anyone who needs to keep track of complex task lists.

## ✨ Features

### 🎯 Core Functionality
- **Markdown File Import**: Load tasks from `.md` files with automatic parsing
- **Duplicate Prevention**: Smart detection and merging of duplicate tasks
- **Task Categories**: Organize tasks as Bug, Feature, Testing, or Documentation
- **Status Tracking**: Pending, In Progress, and Completed states
- **Notes System**: Add detailed notes to any task
- **Multiple Views**: Switch between Card and Table views
- **Advanced Filtering**: Filter by status, category, and search terms
- **Sorting**: Sort by any column in table view

### 🚀 Advanced Features
- **Master File System**: JSON-based storage with versioning
- **Local Storage**: Automatic saving to browser localStorage
- **Export/Import**: Export and import your entire task database
- **Real-time Statistics**: Live dashboard with completion metrics
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Beautiful, intuitive interface with animations

## 🚀 Getting Started

### Quick Start
1. Open `task_manager.html` in your web browser
2. Start with the sample tasks or load your own markdown files
3. Click "Load MD Files" to import tasks from `.md` files
4. Use the search and filter options to find specific tasks
5. Switch between Card and Table views as needed

### Markdown File Format
The system recognizes various checkbox formats in markdown files:

```markdown
# Project Tasks

## Bug Fixes
- [x] Fixed login issue
- [ ] Fix API timeout
- [_] Working on database connection
- [✓] Resolved memory leak

## Features
- [x] User authentication
- [ ] Dashboard implementation
- [ ] Data visualization
```

**Supported Status Indicators:**
- `[ ]` - Pending task
- `[x]` or `[✓]` - Completed task
- `[_]` or `[-]` - In progress task

## 📁 File Structure

```
task_master/
├── task_manager.html          # Main application interface
├── task_manager.js           # Core application logic
├── task_master.json          # Master file format example
├── sample_tasks.md           # Example markdown file
├── tasks.md                  # Original sample file
└── README.md                 # This file
```

## 🎨 User Interface

### Card View
- Visual cards showing each task
- Color-coded by category and status
- Inline editing and actions
- Responsive grid layout

### Table View
- Compact tabular display
- Sortable columns
- Batch operations
- Export-friendly format

### Statistics Dashboard
- Total tasks count
- Completion metrics
- Category breakdown
- Progress tracking

## 🔧 Task Management

### Adding Tasks
- **From Markdown**: Import from `.md` files automatically
- **Manual Entry**: Use the Edit button to create new tasks
- **Bulk Import**: Load multiple markdown files at once

### Editing Tasks
- Click "Edit" on any task
- Update title, status, category, and notes
- Changes save automatically
- History tracking included

### Categories
- **Bug**: Issues that need fixing
- **Feature**: New functionality to implement
- **Testing**: QA and testing tasks
- **Documentation**: Writing and updating docs

### Status Management
- **Pending**: Not started yet
- **In Progress**: Currently being worked on
- **Completed**: Finished tasks

## 💾 Data Management

### Master File Format
The system uses a JSON structure for the master file:

```json
{
  "version": "1.0",
  "lastUpdated": "2025-09-23T22:45:00.000Z",
  "tasks": [
    {
      "id": "task_unique_id",
      "title": "Task description",
      "status": "pending|in-progress|completed",
      "category": "bug|feature|testing|documentation",
      "source": "filename.md",
      "notes": "Additional notes",
      "dateAdded": "ISO date string",
      "lastUpdated": "ISO date string",
      "checksum": "duplicate_detection_hash"
    }
  ],
  "metadata": {
    "totalTasks": 10,
    "completedTasks": 5,
    "sources": ["file1.md", "file2.md"]
  }
}
```

### Export Options
- **Master File**: Complete task database in JSON format
- **Browser Storage**: Automatic localStorage backup
- **Filename Format**: `task_master_YYYY-MM-DD.json`

### Import Options
- **Markdown Files**: Parse and import tasks from `.md` files
- **Master Files**: Import previously exported JSON files
- **Multiple Sources**: Combine tasks from various files

## 🔍 Advanced Features

### Smart Duplicate Detection
- Prevents duplicate tasks when importing the same file multiple times
- Updates existing tasks if status or notes have changed
- Uses content-based checksums for accurate matching

### Category Auto-Detection
The system automatically categorizes tasks based on keywords:
- **Bug**: Contains "bug", "fix", "error", "issue"
- **Testing**: Contains "test", "testing", "qa", "verify"
- **Documentation**: Contains "doc", "documentation", "readme", "guide"
- **Feature**: Default category for other tasks

### Search and Filtering
- **Text Search**: Search in titles, notes, and source files
- **Status Filter**: Show only pending, in-progress, or completed tasks
- **Category Filter**: Filter by bug, feature, testing, or documentation
- **Combined Filters**: Use multiple filters simultaneously

## 🛠️ Technical Details

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Storage
- **Local Storage**: 10MB limit for task data
- **Session Storage**: Temporary data during use
- **File System**: Export/import capabilities

### Performance
- Handles 1000+ tasks efficiently
- Lazy loading for large datasets
- Optimized rendering and filtering
- Responsive design for all devices

## 🎯 Use Cases

### Software Development
- Track bugs and feature requests
- Manage testing tasks
- Organize documentation tasks
- Import from GitHub issues (markdown format)

### Project Management
- Break down large projects into tasks
- Track progress across team members
- Manage different project phases
- Generate progress reports

### Personal Task Management
- Organize daily tasks
- Track long-term goals
- Manage multiple projects
- Keep detailed notes

## 🤝 Tips and Best Practices

### Organizing Tasks
1. Use consistent markdown formatting
2. Group related tasks in sections
3. Add meaningful notes for complex tasks
4. Regular exports for backup

### Workflow Optimization
1. Start with Card view for overview
2. Switch to Table view for detailed work
3. Use filters to focus on current priorities
4. Regular status updates for accuracy

### File Management
1. Keep markdown files organized by project
2. Use descriptive filenames
3. Regular master file exports
4. Version control for markdown sources

## 🔄 Future Enhancements

Potential features for future versions:
- Team collaboration features
- Integration with external tools
- Advanced reporting and analytics
- Mobile app version
- Cloud synchronization
- Custom categories and fields

## 📞 Support

This is a local-only application designed for personal use. All data is stored locally in your browser. For best results:

- Use modern web browsers
- Regularly export your data
- Keep markdown files backed up
- Use consistent formatting

## 📄 License

This project is provided as-is for local use. Feel free to modify and customize according to your needs.

---

**Happy Task Managing! 🎉**
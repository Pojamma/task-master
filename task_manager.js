// Task Master JavaScript - Advanced Task Management System
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentView = 'cards';
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.editingTaskId = null;
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.renderTasks();
        this.updateStats();
    }

    // Master File Format: JSON structure for storing all tasks
    getMasterFileStructure() {
        return {
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            tasks: this.tasks,
            metadata: {
                totalTasks: this.tasks.length,
                completedTasks: this.tasks.filter(t => t.status === 'completed').length,
                sources: [...new Set(this.tasks.map(t => t.source))]
            }
        };
    }

    // Task structure definition
    createTask(title, status = 'pending', category = 'feature', source = 'manual', notes = '') {
        return {
            id: this.generateId(),
            title: title.trim(),
            status: status,
            category: category,
            source: source,
            notes: notes,
            dateAdded: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            originalLine: null,
            checksum: this.generateTaskChecksum(title)
        };
    }

    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTaskChecksum(title) {
        // Simple checksum for duplicate detection
        return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
    }

    // Markdown parsing functionality
    parseMarkdownFile(content, filename) {
        const lines = content.split('\n');
        const tasks = [];
        let currentSection = '';
        let currentPhase = '';
        let currentTask = '';
        let taskCounter = 0;

        lines.forEach((line, index) => {
            // Detect sections/headers (## Phase 1: Foundation)
            if (line.match(/^##\s+/)) {
                currentSection = line.replace(/^##\s+/, '').trim();

                // Check if this is a phase header
                const phaseMatch = currentSection.match(/Phase\s+(\d+(?:\.\d+)?):?\s*(.+)/i);
                if (phaseMatch) {
                    currentPhase = currentSection;
                } else {
                    currentPhase = currentSection;
                }
                return;
            }

            // Detect task headers (**Task 1.1: Project Setup**)
            if (line.match(/^\*\*Task\s+/i)) {
                currentTask = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
                return;
            }

            // Parse task lines with various checkbox formats
            const taskMatch = line.match(/^[\s]*[-*+]?\s*\[([x\s\-\_✓✗])\]\s*(.+)$/i);
            if (taskMatch) {
                const [, statusChar, title] = taskMatch;
                const isCompleted = ['x', '✓'].includes(statusChar.toLowerCase());
                const isInProgress = ['_', '-'].includes(statusChar.toLowerCase());

                let status = 'pending';
                if (isCompleted) status = 'completed';
                else if (isInProgress) status = 'in-progress';

                const category = this.inferCategory(title, currentSection);

                tasks.push({
                    title: title.trim(),
                    status: status,
                    category: category,
                    source: filename,
                    originalLine: index + 1,
                    section: currentSection,
                    phase: currentPhase,
                    taskNumber: currentTask
                });
                taskCounter++;
            }
        });

        return tasks;
    }

    inferCategory(title, section) {
        const titleLower = title.toLowerCase();
        const sectionLower = section.toLowerCase();

        // Check for bug indicators
        if (titleLower.includes('bug') || titleLower.includes('fix') || titleLower.includes('error') ||
            titleLower.includes('issue') || sectionLower.includes('bug')) {
            return 'bug';
        }

        // Check for testing indicators
        if (titleLower.includes('test') || titleLower.includes('testing') || titleLower.includes('qa') ||
            titleLower.includes('verify') || sectionLower.includes('test')) {
            return 'testing';
        }

        // Check for documentation indicators
        if (titleLower.includes('doc') || titleLower.includes('documentation') || titleLower.includes('readme') ||
            titleLower.includes('guide') || sectionLower.includes('doc')) {
            return 'documentation';
        }

        return 'feature';
    }

    // Task management methods
    addTask(taskData) {
        const task = this.createTask(
            taskData.title,
            taskData.status,
            taskData.category,
            taskData.source,
            taskData.notes
        );
        this.tasks.push(task);
        this.saveToLocalStorage();
        return task;
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks[index] = {
                ...this.tasks[index],
                ...updates,
                lastUpdated: new Date().toISOString()
            };
            this.saveToLocalStorage();
            return this.tasks[index];
        }
        return null;
    }

    deleteTask(id) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks.splice(index, 1);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    // Duplicate detection and merging
    findDuplicateTask(newTask) {
        return this.tasks.find(existingTask =>
            existingTask.checksum === this.generateTaskChecksum(newTask.title) &&
            existingTask.source === newTask.source
        );
    }

    mergeTasks(existingTask, newTask) {
        // Update if status changed or notes were added
        const updates = {};
        if (existingTask.status !== newTask.status) {
            updates.status = newTask.status;
        }
        if (newTask.notes && newTask.notes !== existingTask.notes) {
            updates.notes = existingTask.notes ?
                `${existingTask.notes}\n\n--- Updated from ${newTask.source} ---\n${newTask.notes}` :
                newTask.notes;
        }

        if (Object.keys(updates).length > 0) {
            this.updateTask(existingTask.id, updates);
            return 'updated';
        }
        return 'duplicate';
    }

    // File operations
    loadMarkdownFiles(files) {
        let addedCount = 0;
        let updatedCount = 0;
        let duplicateCount = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const parsedTasks = this.parseMarkdownFile(content, file.name);

                parsedTasks.forEach(taskData => {
                    const existingTask = this.findDuplicateTask(taskData);

                    if (existingTask) {
                        const result = this.mergeTasks(existingTask, taskData);
                        if (result === 'updated') updatedCount++;
                        else duplicateCount++;
                    } else {
                        this.addTask(taskData);
                        addedCount++;
                    }
                });

                this.renderTasks();
                this.updateStats();
                this.showNotification(`Processed ${file.name}: ${addedCount} added, ${updatedCount} updated, ${duplicateCount} duplicates skipped`, 'success');
            };
            reader.readAsText(file);
        });
    }

    exportMasterFile() {
        const masterData = this.getMasterFileStructure();
        const blob = new Blob([JSON.stringify(masterData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `task_master_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Master file exported successfully!', 'success');
    }

    exportFilteredViewAsMarkdown() {
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            this.showNotification('No tasks to export. Please adjust your filters.', 'error');
            return;
        }

        // Group tasks by phase and task if they exist
        const groupedTasks = this.groupTasksByPhaseAndTask(filteredTasks);
        let markdownContent = '';

        // Add header
        markdownContent += '# Task Master Export\n\n';
        markdownContent += `Export Date: ${new Date().toISOString().split('T')[0]}\n`;
        markdownContent += `Total Tasks: ${filteredTasks.length}\n\n`;

        // Generate markdown based on grouping
        if (Object.keys(groupedTasks).length > 1 || groupedTasks['ungrouped']) {
            // Tasks have phase/task structure
            Object.keys(groupedTasks).forEach(phaseKey => {
                if (phaseKey === 'ungrouped') {
                    markdownContent += '## Ungrouped Tasks\n\n';
                    groupedTasks[phaseKey].forEach(task => {
                        markdownContent += this.formatTaskAsMarkdown(task);
                    });
                } else {
                    markdownContent += `## ${phaseKey}\n\n`;
                    const taskGroups = groupedTasks[phaseKey];

                    Object.keys(taskGroups).forEach(taskKey => {
                        if (taskKey !== 'ungrouped') {
                            markdownContent += `**${taskKey}**\n`;
                        }
                        taskGroups[taskKey].forEach(task => {
                            markdownContent += this.formatTaskAsMarkdown(task);
                        });
                        markdownContent += '\n';
                    });
                }
            });
        } else {
            // Simple task list
            filteredTasks.forEach(task => {
                markdownContent += this.formatTaskAsMarkdown(task);
            });
        }

        // Create and download the file
        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `task_master_filtered_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`Exported ${filteredTasks.length} tasks to markdown!`, 'success');
    }

    formatTaskAsMarkdown(task) {
        let statusChar = '[ ]';
        if (task.status === 'completed') statusChar = '[x]';
        else if (task.status === 'in-progress') statusChar = '[_]';

        let markdown = `- ${statusChar} ${task.title}\n`;

        if (task.notes) {
            // Add notes as indented text
            const noteLines = task.notes.split('\n');
            noteLines.forEach(line => {
                if (line.trim()) {
                    markdown += `  > ${line.trim()}\n`;
                }
            });
        }

        return markdown;
    }

    groupTasksByPhaseAndTask(tasks) {
        const grouped = {};

        tasks.forEach(task => {
            // Extract phase and task from the task's section if available
            const phase = task.phase || this.extractPhaseFromSection(task.section) || 'ungrouped';
            const taskNum = task.taskNumber || this.extractTaskNumberFromSection(task.section) || 'ungrouped';

            if (!grouped[phase]) {
                grouped[phase] = {};
            }

            if (!grouped[phase][taskNum]) {
                grouped[phase][taskNum] = [];
            }

            grouped[phase][taskNum].push(task);
        });

        return grouped;
    }

    extractPhaseFromSection(section) {
        if (!section) return null;
        const match = section.match(/Phase\s+(\d+(?:\.\d+)?):?\s*(.+)/i);
        return match ? `Phase ${match[1]}: ${match[2]}` : null;
    }

    extractTaskNumberFromSection(section) {
        if (!section) return null;
        const match = section.match(/Task\s+(\d+(?:\.\d+)?):?\s*(.+)/i);
        return match ? `Task ${match[1]}: ${match[2]}` : null;
    }

    importMasterFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const masterData = JSON.parse(e.target.result);
                if (masterData.tasks && Array.isArray(masterData.tasks)) {
                    this.tasks = masterData.tasks;
                    this.saveToLocalStorage();
                    this.renderTasks();
                    this.updateStats();
                    this.showNotification(`Imported ${masterData.tasks.length} tasks successfully!`, 'success');
                } else {
                    throw new Error('Invalid master file format');
                }
            } catch (error) {
                this.showNotification('Error importing master file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // Local storage
    saveToLocalStorage() {
        localStorage.setItem('taskMasterData', JSON.stringify(this.getMasterFileStructure()));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('taskMasterData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.tasks) {
                    this.tasks = data.tasks;
                }
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
    }

    // UI Rendering
    renderTasks() {
        if (this.currentView === 'cards') {
            this.renderCardsView();
        } else {
            this.renderTableView();
        }
    }

    renderCardsView() {
        const container = document.getElementById('cardsView');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks found</h3>
                    <p>Load some markdown files or create tasks manually to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTasks.map(task => `
            <div class="task-card ${task.status} ${task.category}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <span class="task-status status-${task.status}">${this.capitalize(task.status)}</span>
                </div>

                <div class="task-meta">
                    <div class="task-category">
                        <span class="category-badge badge-${task.category}"></span>
                        ${this.capitalize(task.category)}
                    </div>
                    ${task.phase ? `<div>📊 ${task.phase}</div>` : ''}
                    ${task.taskNumber ? `<div>📋 ${task.taskNumber}</div>` : ''}
                    <div>📁 ${task.source}</div>
                    <div>📅 ${new Date(task.dateAdded).toLocaleDateString()}</div>
                </div>

                ${task.notes ? `
                    <div class="task-notes">
                        <strong>Notes:</strong><br>
                        ${this.escapeHtml(task.notes).replace(/\n/g, '<br>')}
                    </div>
                ` : ''}

                <div class="task-actions">
                    <button class="btn btn-primary btn-small" onclick="taskManager.editTask('${task.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-${task.status === 'completed' ? 'secondary' : 'success'} btn-small"
                            onclick="taskManager.toggleTaskStatus('${task.id}')">
                        ${task.status === 'completed' ? '↩️ Reopen' : '✅ Complete'}
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="taskManager.deleteTask('${task.id}')"
                            style="background: #dc3545;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderTableView() {
        const tbody = document.getElementById('tableBody');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <h3>No tasks found</h3>
                        <p>Load some markdown files or create tasks manually to get started.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredTasks.map(task => `
            <tr data-task-id="${task.id}">
                <td>${this.escapeHtml(task.title)}</td>
                <td class="status-cell">
                    <span class="task-status status-${task.status}">${this.capitalize(task.status)}</span>
                </td>
                <td>
                    <div class="task-category">
                        <span class="category-badge badge-${task.category}"></span>
                        ${this.capitalize(task.category)}
                    </div>
                </td>
                <td>${task.phase || '-'}</td>
                <td>${task.taskNumber || '-'}</td>
                <td>${task.source}</td>
                <td>${new Date(task.dateAdded).toLocaleDateString()}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-primary btn-small" onclick="taskManager.editTask('${task.id}')">✏️</button>
                        <button class="btn btn-${task.status === 'completed' ? 'secondary' : 'success'} btn-small"
                                onclick="taskManager.toggleTaskStatus('${task.id}')">
                            ${task.status === 'completed' ? '↩️' : '✅'}
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="taskManager.deleteTask('${task.id}')"
                                style="background: #dc3545;">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Filtering and sorting
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply search filter
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.notes.toLowerCase().includes(searchTerm) ||
                task.source.toLowerCase().includes(searchTerm)
            );
        }

        // Apply status filter
        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter) {
            filtered = filtered.filter(task => task.status === statusFilter);
        }

        // Apply category filter
        const categoryFilter = document.getElementById('categoryFilter').value;
        if (categoryFilter) {
            filtered = filtered.filter(task => task.category === categoryFilter);
        }

        // Apply sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                let aVal = a[this.sortColumn];
                let bVal = b[this.sortColumn];

                if (this.sortColumn === 'dateAdded' || this.sortColumn === 'lastUpdated') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }

                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }

    // Task operations
    toggleTaskStatus(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            this.updateTask(id, { status: newStatus });
            this.renderTasks();
            this.updateStats();
        }
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskCategory').value = task.category;
            document.getElementById('taskNotes').value = task.notes || '';
            document.getElementById('modalTitle').textContent = 'Edit Task';
            document.getElementById('taskModal').style.display = 'block';
        }
    }

    // Statistics and analytics
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const bugs = this.tasks.filter(t => t.category === 'bug').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('bugTasks').textContent = bugs;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
    }

    // Event handlers setup
    setupEventListeners() {
        // File input handlers
        document.getElementById('mdFileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadMarkdownFiles(e.target.files);
                e.target.value = ''; // Reset input
            }
        });

        document.getElementById('masterFileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importMasterFile(e.target.files[0]);
                e.target.value = ''; // Reset input
            }
        });

        // Task form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTaskFromForm();
        });

        // Modal close events
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('taskModal')) {
                this.closeModal();
            }
            if (e.target === document.getElementById('helpModal')) {
                document.getElementById('helpModal').style.display = 'none';
            }
        });

        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any open modals
                this.closeModal();
                document.getElementById('helpModal').style.display = 'none';
            }
        });
    }

    saveTaskFromForm() {
        const title = document.getElementById('taskTitle').value;
        const status = document.getElementById('taskStatus').value;
        const category = document.getElementById('taskCategory').value;
        const notes = document.getElementById('taskNotes').value;

        if (this.editingTaskId) {
            // Update existing task
            this.updateTask(this.editingTaskId, {
                title: title,
                status: status,
                category: category,
                notes: notes
            });
        } else {
            // Create new task
            this.addTask({
                title: title,
                status: status,
                category: category,
                source: 'manual',
                notes: notes
            });
        }

        this.closeModal();
        this.renderTasks();
        this.updateStats();
        this.showNotification('Task saved successfully!', 'success');
    }

    closeModal() {
        document.getElementById('taskModal').style.display = 'none';
        document.getElementById('taskForm').reset();
        this.editingTaskId = null;
    }

    // View management
    switchView(view) {
        this.currentView = view;

        // Update button states
        document.getElementById('cardViewBtn').classList.toggle('active', view === 'cards');
        document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');

        // Show/hide views
        document.getElementById('cardsView').style.display = view === 'cards' ? 'grid' : 'none';
        document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';

        this.renderTasks();
    }

    // Table sorting
    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Update UI indicators
        document.querySelectorAll('.table th').forEach(th => {
            th.classList.remove('sorted', 'desc');
        });

        const headerCell = document.querySelector(`.table th[onclick="sortTable('${column}')"]`);
        if (headerCell) {
            headerCell.classList.add('sorted');
            if (this.sortDirection === 'desc') {
                headerCell.classList.add('desc');
            }
        }

        this.renderTasks();
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 5000);
    }
}

// Initialize the task manager
let taskManager;

// Global functions for HTML event handlers
function filterTasks() {
    taskManager.renderTasks();
}

function switchView(view) {
    taskManager.switchView(view);
}

function sortTable(column) {
    taskManager.sortTable(column);
}

function exportTasks() {
    taskManager.exportMasterFile();
}

function importMasterFile() {
    document.getElementById('masterFileInput').click();
}

function closeModal() {
    taskManager.closeModal();
}

function showHelpModal() {
    document.getElementById('helpModal').style.display = 'block';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

function exportFilteredView() {
    taskManager.exportFilteredViewAsMarkdown();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();

    // Add some sample tasks if none exist
    if (taskManager.tasks.length === 0) {
        const sampleTasks = [
            {
                title: "Set up project structure",
                status: "completed",
                category: "feature",
                source: "sample",
                notes: "Initial project setup with basic folders and files."
            },
            {
                title: "Fix authentication bug",
                status: "in-progress",
                category: "bug",
                source: "sample",
                notes: "Users are unable to log in with valid credentials."
            },
            {
                title: "Write unit tests for API",
                status: "pending",
                category: "testing",
                source: "sample",
                notes: "Need comprehensive test coverage for all API endpoints."
            },
            {
                title: "Update documentation",
                status: "pending",
                category: "documentation",
                source: "sample",
                notes: "API documentation is outdated and needs revision."
            }
        ];

        sampleTasks.forEach(taskData => {
            taskManager.addTask(taskData);
        });

        taskManager.renderTasks();
        taskManager.updateStats();
    }
});
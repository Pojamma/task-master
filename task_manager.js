// Task Master JavaScript - Advanced Task Management System
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentView = 'table';
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.editingTaskId = null;
        this.projects = [];
        this.activeProject = null;
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
                sources: [...new Set(this.tasks.map(t => t.source))],
                projects: this.projects
            }
        };
    }

    // Task structure definition
    createTask(title, status = 'pending', category = 'feature', source = 'manual', notes = '', priority = 'medium') {
        return {
            id: this.generateId(),
            title: title.trim(),
            status: status,
            category: category,
            priority: priority,
            source: source,
            notes: notes,
            dateAdded: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            originalLine: null,
            checksum: this.generateTaskChecksum(title),
            section: '',
            phase: '',
            taskNumber: '',
            phaseData: null,
            taskData: null,
            project: ''
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
                    taskNumber: currentTask,
                    phaseData: this.extractPhaseFromSection(currentPhase),
                    taskData: this.extractTaskNumberFromSection(currentTask)
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
            taskData.notes,
            taskData.priority || 'medium'
        );

        // Copy additional fields from parsed data if they exist
        if (taskData.section) task.section = taskData.section;
        if (taskData.phase) task.phase = taskData.phase;
        if (taskData.taskNumber) task.taskNumber = taskData.taskNumber;
        if (taskData.phaseData) task.phaseData = taskData.phaseData;
        if (taskData.taskData) task.taskData = taskData.taskData;
        if (taskData.originalLine) task.originalLine = taskData.originalLine;
        if (taskData.project) task.project = taskData.project;

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
            this.renderTasks();
            this.updateStats();
            return true;
        }
        return false;
    }

    clearAllTasks() {
        if (this.activeProject) {
            this.tasks = this.tasks.filter(t => t.project !== this.activeProject);
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Tasks in "' + this.activeProject + '" cleared!', 'success');
        } else {
            this.tasks = [];
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateStats();
            this.showNotification('All tasks cleared!', 'success');
        }
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

    saveMasterFile() {
        this.saveToLocalStorage();
        this.showNotification('Master file saved successfully!', 'success');
    }

    exportMasterFile() {
        const masterData = this.getMasterFileStructure();
        const blob = new Blob([JSON.stringify(masterData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const filename = `task_master_${new Date().toISOString().split('T')[0]}.json`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`Exported: ${filename} (saved to Downloads)`, 'success');
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
        const hasStructuredData = Object.keys(groupedTasks).some(key => key !== 'ungrouped') || Object.keys(groupedTasks).length > 1;
        if (hasStructuredData) {
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
            // Use the stored phase and task data, or fallback to parsing the section
            let phase = task.phase || 'ungrouped';
            let taskNum = task.taskNumber || 'ungrouped';

            // If we don't have direct phase/taskNumber, try to extract from section
            if (phase === 'ungrouped' && task.section) {
                phase = this.extractPhaseFromSection(task.section) || 'ungrouped';
            }
            if (taskNum === 'ungrouped' && task.section) {
                taskNum = this.extractTaskNumberFromSection(task.section) || 'ungrouped';
            }

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
                if (data.metadata && data.metadata.projects) {
                    this.projects = data.metadata.projects;
                }
            } catch (error) {
                console.error('Error loading from localStorage:', error);
            }
        }
    }

    // UI Rendering
    renderTasks() {
        this.renderProjectTabs();
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
                    <div><span class="priority-badge priority-${task.priority || 'medium'}">${this.capitalize(task.priority || 'medium')}</span></div>
                    ${task.phase ? `<div>📊 ${task.phase}</div>` : ''}
                    ${task.taskNumber ? `<div>📋 ${task.taskNumber}</div>` : ''}
                    ${task.project ? `<div>📂 ${this.escapeHtml(task.project)}</div>` : ''}
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
                    ${task.notes ? `<button class="btn btn-secondary btn-small" onclick="taskManager.copyNotes('${task.id}')">📋 Copy Notes</button>` : ''}
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
                    <td colspan="10" class="empty-state">
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
                <td><span class="priority-badge priority-${task.priority || 'medium'}">${this.capitalize(task.priority || 'medium')}</span></td>
                <td>${task.phase || '-'}</td>
                <td>${task.taskNumber || '-'}</td>
                <td>${task.project || '-'}</td>
                <td>${task.source}</td>
                <td>${new Date(task.dateAdded).toLocaleDateString()}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-primary btn-small" onclick="taskManager.editTask('${task.id}')">✏️</button>
                        ${task.notes ? `<button class="btn btn-secondary btn-small" onclick="taskManager.copyNotes('${task.id}')" title="Copy Notes">📋</button>` : ''}
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

    // Project/Tab management
    renderProjectTabs() {
        const container = document.getElementById('projectTabs');
        if (!container) return;
        container.innerHTML = '';

        const allCount = this.tasks.length;

        // "All" tab
        const allTab = document.createElement('button');
        allTab.className = 'project-tab' + (this.activeProject === null ? ' active' : '');
        allTab.innerHTML = 'All <span class="tab-count">' + allCount + '</span>';
        allTab.addEventListener('click', () => this.setActiveProject(null));
        container.appendChild(allTab);

        // Collect all known projects
        const projectsFromTasks = [...new Set(this.tasks.map(t => t.project).filter(p => p))];
        const allProjects = [...new Set([...this.projects, ...projectsFromTasks])].sort();

        allProjects.forEach(project => {
            const count = this.tasks.filter(t => t.project === project).length;
            const isActive = this.activeProject === project;

            const tab = document.createElement('button');
            tab.className = 'project-tab' + (isActive ? ' active' : '');

            const label = document.createTextNode(project + ' ');
            tab.appendChild(label);

            const badge = document.createElement('span');
            badge.className = 'tab-count';
            badge.textContent = count;
            tab.appendChild(badge);

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProjectTab(project);
            });
            tab.appendChild(closeBtn);

            tab.addEventListener('click', () => this.setActiveProject(project));
            tab.addEventListener('dblclick', () => this.renameProjectTab(project));
            container.appendChild(tab);
        });

        // "+" button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-project-tab';
        addBtn.textContent = '+ New';
        addBtn.title = 'Add new project/client';
        addBtn.addEventListener('click', () => this.addProjectTab());
        container.appendChild(addBtn);
    }

    setActiveProject(project) {
        this.activeProject = project;
        this.renderTasks();
        this.updateStats();
    }

    addProjectTab() {
        const name = prompt('Enter project/client name:');
        if (name && name.trim()) {
            const trimmed = name.trim();
            if (!this.projects.includes(trimmed)) {
                this.projects.push(trimmed);
                this.saveToLocalStorage();
                this.renderProjectTabs();
                this.showNotification('Project "' + trimmed + '" created!', 'success');
            } else {
                this.showNotification('Project already exists.', 'error');
            }
        }
    }

    deleteProjectTab(project) {
        if (!confirm('Delete project "' + project + '"? Tasks will be moved to (No Project).')) return;

        this.projects = this.projects.filter(p => p !== project);

        this.tasks.forEach(task => {
            if (task.project === project) {
                task.project = '';
            }
        });

        if (this.activeProject === project) {
            this.activeProject = null;
        }

        this.saveToLocalStorage();
        this.renderTasks();
        this.updateStats();
        this.showNotification('Project "' + project + '" deleted.', 'success');
    }

    renameProjectTab(oldName) {
        const newName = prompt('Rename project:', oldName);
        if (newName && newName.trim() && newName.trim() !== oldName) {
            const trimmed = newName.trim();

            const idx = this.projects.indexOf(oldName);
            if (idx !== -1) {
                this.projects[idx] = trimmed;
            } else {
                this.projects.push(trimmed);
            }

            this.tasks.forEach(task => {
                if (task.project === oldName) {
                    task.project = trimmed;
                }
            });

            if (this.activeProject === oldName) {
                this.activeProject = trimmed;
            }

            this.saveToLocalStorage();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Project renamed to "' + trimmed + '".', 'success');
        }
    }

    populateProjectDropdown(selectedProject) {
        const select = document.getElementById('taskProject');
        const projectsFromTasks = [...new Set(this.tasks.map(t => t.project).filter(p => p))];
        const allProjects = [...new Set([...this.projects, ...projectsFromTasks])].sort();

        select.innerHTML = '<option value="">(No Project)</option>';
        allProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            if (project === selectedProject) option.selected = true;
            select.appendChild(option);
        });
        const addOption = document.createElement('option');
        addOption.value = '__new__';
        addOption.textContent = '-- Add New Project --';
        select.appendChild(addOption);
    }

    // Filtering and sorting
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply project filter
        if (this.activeProject) {
            filtered = filtered.filter(task => task.project === this.activeProject);
        }

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

        // Apply priority filter
        const priorityFilter = document.getElementById('priorityFilter').value;
        if (priorityFilter) {
            filtered = filtered.filter(task => (task.priority || 'medium') === priorityFilter);
        }

        // Apply sorting
        if (this.sortColumn) {
            const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2, 'on-hold': 3 };
            filtered.sort((a, b) => {
                let aVal = a[this.sortColumn];
                let bVal = b[this.sortColumn];

                if (this.sortColumn === 'dateAdded' || this.sortColumn === 'lastUpdated') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else if (this.sortColumn === 'priority') {
                    aVal = priorityOrder[aVal || 'medium'];
                    bVal = priorityOrder[bVal || 'medium'];
                }

                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }

    // Task operations
    copyNotes(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task && task.notes) {
            navigator.clipboard.writeText(task.notes).then(() => {
                this.showNotification('Notes copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Failed to copy notes.', 'error');
            });
        }
    }

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
            document.getElementById('taskPriority').value = task.priority || 'medium';
            document.getElementById('taskSection').value = task.section || '';
            document.getElementById('taskPhase').value = task.phase || '';
            document.getElementById('taskNumber').value = task.taskNumber || '';
            document.getElementById('taskNotes').value = task.notes || '';
            document.getElementById('modalTitle').textContent = 'Edit Task';
            this.populateProjectDropdown(task.project || '');
            document.getElementById('taskModal').style.display = 'block';
        }
    }

    createNewTask() {
        this.editingTaskId = null;
        document.getElementById('taskForm').reset();
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskStatus').value = 'pending';
        document.getElementById('taskCategory').value = 'feature';
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskSection').value = '';
        document.getElementById('taskPhase').value = '';
        document.getElementById('taskNumber').value = '';
        document.getElementById('taskNotes').value = '';
        document.getElementById('modalTitle').textContent = 'Create New Task';
        this.populateProjectDropdown(this.activeProject || '');
        document.getElementById('taskModal').style.display = 'block';

        // Focus on the title input for better UX
        setTimeout(() => {
            document.getElementById('taskTitle').focus();
        }, 100);
    }

    // Statistics and analytics
    updateStats() {
        const tasks = this.activeProject
            ? this.tasks.filter(t => t.project === this.activeProject)
            : this.tasks;
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status === 'pending').length;
        const bugs = tasks.filter(t => t.category === 'bug').length;
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

        // Project dropdown handler
        document.getElementById('taskProject').addEventListener('change', (e) => {
            if (e.target.value === '__new__') {
                const name = prompt('Enter new project/client name:');
                if (name && name.trim()) {
                    const trimmed = name.trim();
                    if (!this.projects.includes(trimmed)) {
                        this.projects.push(trimmed);
                        this.saveToLocalStorage();
                    }
                    this.populateProjectDropdown(trimmed);
                } else {
                    e.target.value = '';
                }
            }
        });

        // Task form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTaskFromForm();
        });

        // Modal close events and dropdown dismiss
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('taskModal')) {
                this.closeModal();
            }
            if (e.target === document.getElementById('helpModal')) {
                document.getElementById('helpModal').style.display = 'none';
            }
            // Close file dropdown when clicking outside
            const dropdown = document.querySelector('.dropdown');
            if (dropdown && !dropdown.contains(e.target)) {
                document.getElementById('fileMenu').classList.remove('show');
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
        const priority = document.getElementById('taskPriority').value;
        const section = document.getElementById('taskSection').value;
        const phase = document.getElementById('taskPhase').value;
        const taskNumber = document.getElementById('taskNumber').value;
        const notes = document.getElementById('taskNotes').value;
        const project = document.getElementById('taskProject').value === '__new__' ? '' : document.getElementById('taskProject').value;

        if (this.editingTaskId) {
            // Update existing task
            this.updateTask(this.editingTaskId, {
                title: title,
                status: status,
                category: category,
                priority: priority,
                section: section,
                phase: phase,
                taskNumber: taskNumber,
                notes: notes,
                project: project
            });
        } else {
            // Create new task
            this.addTask({
                title: title,
                status: status,
                category: category,
                priority: priority,
                section: section,
                phase: phase,
                taskNumber: taskNumber,
                source: 'manual',
                notes: notes,
                project: project
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

function saveMasterFile() {
    taskManager.saveMasterFile();
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

function clearAllTasks() {
    const project = taskManager.activeProject;
    const msg = project
        ? 'Clear all tasks in "' + project + '"? This cannot be undone.'
        : 'Clear ALL tasks in every project? This cannot be undone.';
    if (confirm(msg)) {
        taskManager.clearAllTasks();
    }
}

function copyModalNotes() {
    const notes = document.getElementById('taskNotes').value;
    if (notes) {
        navigator.clipboard.writeText(notes).then(() => {
            taskManager.showNotification('Notes copied to clipboard!', 'success');
        }).catch(() => {
            taskManager.showNotification('Failed to copy notes.', 'error');
        });
    } else {
        taskManager.showNotification('No notes to copy.', 'info');
    }
}

function createNewTask() {
    taskManager.createNewTask();
}

function toggleFileMenu() {
    const menu = document.getElementById('fileMenu');
    if (menu.classList.contains('show')) {
        menu.classList.remove('show');
    } else {
        const btn = document.querySelector('.dropdown > .btn');
        const rect = btn.getBoundingClientRect();
        menu.style.top = rect.bottom + 4 + 'px';
        menu.style.left = rect.left + 'px';
        menu.classList.add('show');
    }
}

function closeFileMenu() {
    document.getElementById('fileMenu').classList.remove('show');
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
/**
 * Mission Control V1 - Frontend Script
 * OpenClaw Command Center
 */

// Task data storage
let tasks = {
    pending: [],
    'in-progress': [],
    success: []
};

// DOM Elements
const pendingTasksContainer = document.getElementById('pending-tasks');
const progressTasksContainer = document.getElementById('progress-tasks');
const successTasksContainer = document.getElementById('success-tasks');
const pendingCount = document.getElementById('pending-count');
const progressCount = document.getElementById('progress-count');
const successCount = document.getElementById('success-count');
const newProtocolBtn = document.getElementById('new-protocol-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const cancelBtn = document.getElementById('cancel-btn');
const newTaskForm = document.getElementById('new-task-form');
const logsContainer = document.getElementById('logs-container');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    initModal();
    initLogs();
});

// Fetch tasks from API
async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            const data = await response.json();
            organizeTasks(data);
            renderAllTasks();
            updateCounts();
            addLog('Task data synchronized successfully.', 'success');
        } else {
            throw new Error('API response not OK');
        }
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        addLog('Warning: Using cached task data.', 'warning');
        // Use empty arrays if API fails
        renderAllTasks();
        updateCounts();
    }
}

// Organize tasks by status
function organizeTasks(taskArray) {
    tasks.pending = [];
    tasks['in-progress'] = [];
    tasks.success = [];

    taskArray.forEach(task => {
        if (task.status === 'pending') {
            tasks.pending.push(task);
        } else if (task.status === 'in-progress') {
            tasks['in-progress'].push(task);
        } else if (task.status === 'success' || task.status === 'completed') {
            tasks.success.push(task);
        }
    });
}

// Render all task columns
function renderAllTasks() {
    renderTaskColumn(tasks.pending, pendingTasksContainer, 'pending');
    renderTaskColumn(tasks['in-progress'], progressTasksContainer, 'in-progress');
    renderTaskColumn(tasks.success, successTasksContainer, 'success');
}

// Render a single column of tasks
function renderTaskColumn(taskList, container, status) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (taskList.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-icon">${status === 'success' ? '✓' : status === 'in-progress' ? '⟳' : '○'}</div>
            <p>No ${status === 'success' ? 'completed' : status} tasks</p>
        `;
        container.appendChild(emptyState);
        return;
    }
    
    taskList.forEach(task => {
        const card = createTaskCard(task, status);
        container.appendChild(card);
    });
}

// Create a task card element
function createTaskCard(task, status) {
    const card = document.createElement('div');
    card.className = `task-card ${status === 'success' ? 'success-card' : ''}`;
    card.dataset.taskId = task.id;

    // Avatar HTML
    let avatarHtml = '';
    if (task.avatars && task.avatars.length > 0) {
        avatarHtml = `<div class="task-avatars">${task.avatars.map(a => `<div class="task-avatar"><img src="${getAvatarSrc(a)}" alt="Avatar"></div>`).join('')}</div>`;
    } else {
        avatarHtml = `<div class="task-avatar"><img src="${getAvatarSrc(task.id % 4 + 1)}" alt="Avatar"></div>`;
    }

    // Footer HTML based on status
    let footerHtml = '';
    if (status === 'pending') {
        footerHtml = `
            <div class="task-footer">
                <span class="task-priority ${task.priority || 'medium'}">${(task.priority || 'MEDIUM').toUpperCase()}</span>
                ${task.estimate ? `<span class="task-estimate">EST. ${task.estimate}</span>` : ''}
            </div>
        `;
    } else if (status === 'in-progress') {
        if (task.progress !== undefined) {
            footerHtml = `
                <div class="task-progress">
                    <div class="task-progress-label">
                        <span>${task.progressLabel || 'PROCESSING..'}</span>
                        <span>${task.progress}%</span>
                    </div>
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${task.progress}%"></div>
                    </div>
                </div>
            `;
        } else {
            footerHtml = `
                <div class="task-footer">
                    ${task.warning ? `<span class="task-warning">${task.warning}</span>` : ''}
                    <span class="task-status active">ACTIVE</span>
                </div>
            `;
        }
    } else if (status === 'success') {
        footerHtml = `
            <div class="task-footer">
                <span class="task-status completed">✓ COMPLETED</span>
                ${task.completedAt ? `<span class="task-date">${formatDate(task.completedAt)}</span>` : ''}
            </div>
        `;
    }

    // Get tag type
    const tagType = task.tagType || getTagTypeFromCode(task.code);

    card.innerHTML = `
        <div class="task-header">
            <span class="task-tag ${tagType}">${task.code}</span>
            ${avatarHtml}
        </div>
        <h4 class="task-title">${task.title}</h4>
        <p class="task-description">${task.description}</p>
        ${footerHtml}
    `;

    return card;
}

// Get tag type from code
function getTagTypeFromCode(code) {
    if (!code) return 'maint';
    const prefix = code.split('-')[0].toLowerCase();
    const mapping = {
        'core': 'core',
        'phase': 'proc',
        'skill': 'comms',
        'ui': 'grid',
        'api': 'core',
        'git': 'proc',
        'deploy': 'proc',
        'maint': 'maint',
        'nexos': 'core'
    };
    return mapping[prefix] || 'maint';
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get avatar source
function getAvatarSrc(id) {
    const colors = ['#00d4ff', '#a855f7', '#00ff88', '#ffb800'];
    const color = colors[(id - 1) % colors.length];
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23111820'/%3E%3Ccircle cx='50' cy='40' r='18' fill='${encodeURIComponent(color)}'/%3E%3Cpath d='M50 62c-18 0-32 14-32 32h64c0-18-14-32-32-32z' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E`;
}

// Update task counts
function updateCounts() {
    if (pendingCount) pendingCount.textContent = tasks.pending.length;
    if (progressCount) progressCount.textContent = tasks['in-progress'].length;
    if (successCount) successCount.textContent = tasks.success.length;
}

// Modal functionality
function initModal() {
    if (!newProtocolBtn || !modalOverlay) return;

    newProtocolBtn.addEventListener('click', () => {
        modalOverlay.classList.add('active');
    });

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    if (newTaskForm) {
        newTaskForm.addEventListener('submit', handleNewTask);
    }
}

function closeModal() {
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    if (newTaskForm) {
        newTaskForm.reset();
    }
}

function handleNewTask(e) {
    e.preventDefault();

    const codeInput = document.getElementById('task-code');
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-description');
    const priorityInput = document.getElementById('task-priority');
    const estimateInput = document.getElementById('task-estimate');

    const code = codeInput ? codeInput.value.toUpperCase() : 'NEW-TASK';
    const title = titleInput ? titleInput.value : 'New Task';
    const description = descInput ? descInput.value : '';
    const priority = priorityInput ? priorityInput.value : 'medium';
    const estimate = estimateInput ? estimateInput.value : '30m';

    const newTask = {
        id: Date.now(),
        code: code,
        title: title,
        description: description,
        priority: priority,
        estimate: estimate,
        status: 'pending',
        tagType: getTagTypeFromCode(code),
        createdAt: new Date().toISOString()
    };

    tasks.pending.unshift(newTask);
    renderAllTasks();
    updateCounts();
    closeModal();

    addLog(`Protocol ${code} created successfully.`, 'success');
}

// Real-time logs
function initLogs() {
    if (!logsContainer) return;
    
    // Add initial log
    addLog('Mission Control initialized.', 'success');
    
    // Simulate periodic log entries
    setInterval(() => {
        const messages = [
            { msg: 'System heartbeat verified.', type: 'normal' },
            { msg: 'Data sync in progress...', type: 'normal' },
            { msg: 'Security scan complete.', type: 'success' },
            { msg: 'Network latency optimal.', type: 'normal' },
            { msg: 'Cache cleared successfully.', type: 'success' },
            { msg: 'Connection stable.', type: 'normal' }
        ];
        const random = messages[Math.floor(Math.random() * messages.length)];
        
        if (Math.random() > 0.7) {
            addLog(random.msg, random.type);
        }
    }, 8000);
}

function addLog(message, type = 'normal') {
    if (!logsContainer) return;
    
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-message">${message}</span>
    `;

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;

    // Keep only last 15 logs
    while (logsContainer.children.length > 15) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
}

// Simulate progress updates for in-progress tasks
setInterval(() => {
    let updated = false;
    tasks['in-progress'].forEach(task => {
        if (task.progress !== undefined && task.progress < 100) {
            task.progress = Math.min(task.progress + Math.random() * 0.5, 100);
            updated = true;
        }
    });
    if (updated && progressTasksContainer) {
        renderTaskColumn(tasks['in-progress'], progressTasksContainer, 'in-progress');
    }
}, 5000);

// Update system metrics periodically
setInterval(() => {
    const cpuBar = document.querySelector('.progress-bar.cpu');
    const neuralBar = document.querySelector('.progress-bar.neural');
    
    if (cpuBar) {
        const newCpu = 75 + Math.random() * 20;
        cpuBar.style.width = `${newCpu}%`;
        const cpuValue = cpuBar.parentElement.previousElementSibling?.querySelector('.metric-value');
        if (cpuValue) cpuValue.textContent = `${Math.round(newCpu)}%`;
    }
    
    if (neuralBar) {
        const newNeural = 80 + Math.random() * 15;
        neuralBar.style.width = `${newNeural}%`;
        const neuralValue = neuralBar.parentElement.previousElementSibling?.querySelector('.metric-value');
        if (neuralValue) neuralValue.textContent = `${Math.round(newNeural)}%`;
    }
}, 6000);

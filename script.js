// DOM elements
const taskList = document.getElementById('task-list');
const completedList = document.getElementById('completed-list');
const taskTitleInput = document.getElementById('task-title');
const taskDueDateInput = document.getElementById('task-due-date');
const taskPrioritySelect = document.getElementById('task-priority');
const taskCategorySelect = document.getElementById('task-category');
const addTaskBtn = document.getElementById('add-task');
const searchTasksInput = document.getElementById('search-tasks');
const sortPriorityBtn = document.getElementById('sort-priority');
const sortDueDateBtn = document.getElementById('sort-due-date');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
const today = new Date().toISOString().split('T')[0];
let sortBy = null; // Tracks current sort type ('priority', 'dueDate', or null)
let sortDirection = { priority: 1, dueDate: 1 }; // 1 for ascending, -1 for descending

// Render tasks with filtering and sorting
function renderTasks(filter = '') {
    taskList.innerHTML = '';
    completedList.innerHTML = '';

    // Filter tasks
    let filteredTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(filter.toLowerCase())
    );

    // Apply sorting
    if (sortBy === 'priority') {
        filteredTasks.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return sortDirection.priority * (priorityOrder[b.priority] - priorityOrder[a.priority]);
        });
    } else if (sortBy === 'dueDate') {
        filteredTasks.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1 * sortDirection.dueDate;
            if (!b.dueDate) return -1 * sortDirection.dueDate;
            return sortDirection.dueDate * a.dueDate.localeCompare(b.dueDate);
        });
    }

    filteredTasks.forEach((task, index) => {
        const taskCard = document.createElement('div');
        taskCard.classList.add('task-card', task.priority);
        if (task.completed) taskCard.classList.add('completed');
        if (!task.completed && task.dueDate && task.dueDate < today) taskCard.classList.add('overdue');
        if (task.category) taskCard.classList.add(task.category);
        taskCard.draggable = true;

        const dueDateText = task.dueDate ? `Due: ${task.dueDate}` : '';
        const categoryText = task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1) : '';
        taskCard.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span>${task.title}</span>
            ${dueDateText ? `<span class="due-date">${dueDateText}</span>` : ''}
            ${categoryText ? `<span class="category ${task.category}">${categoryText}</span>` : ''}
            ${!task.completed && task.dueDate && task.dueDate < today ? '<div class="overdue-badge"></div>' : ''}
            <button class="delete-btn">✖</button>
        `;

        if (task.completed) {
            completedList.appendChild(taskCard);
        } else {
            taskList.appendChild(taskCard);
        }

        // Checkbox toggle
        const checkbox = taskCard.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            tasks[index].completed = checkbox.checked;
            renderTasks(searchTasksInput.value);
            saveTasks();
        });

        // Delete task
        const deleteBtn = taskCard.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            tasks.splice(index, 1);
            renderTasks(searchTasksInput.value);
            saveTasks();
        });

        // Drag events
        taskCard.addEventListener('dragstart', () => taskCard.classList.add('dragging'));
        taskCard.addEventListener('dragend', () => {
            taskCard.classList.remove('dragging');
            updateTaskOrder();
        });
    });
}

// Drag-and-drop handling
[taskList, completedList].forEach(list => {
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
            list.appendChild(dragging);
        } else {
            list.insertBefore(dragging, afterElement);
        }
    });
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateTaskOrder() {
    const allCards = [...taskList.querySelectorAll('.task-card'), ...completedList.querySelectorAll('.task-card')];
    tasks = allCards.map(card => {
        const title = card.querySelector('span:not(.due-date):not(.category)').textContent;
        const completed = card.classList.contains('completed');
        const priority = ['low', 'medium', 'high'].find(p => card.classList.contains(p)) || 'medium';
        const dueDateElement = card.querySelector('.due-date');
        const dueDate = dueDateElement ? dueDateElement.textContent.replace('Due: ', '') : null;
        const categoryElement = card.querySelector('.category');
        const category = categoryElement ? categoryElement.textContent.toLowerCase() : null;
        return { title, completed, priority, dueDate, category };
    });
    saveTasks();
    renderTasks(searchTasksInput.value);
}

// Add task
addTaskBtn.addEventListener('click', () => {
    const title = taskTitleInput.value.trim();
    const dueDate = taskDueDateInput.value || null;
    const priority = taskPrioritySelect.value;
    const category = taskCategorySelect.value || null;
    if (title) {
        tasks.push({ title, completed: false, priority, dueDate, category });
        taskTitleInput.value = '';
        taskDueDateInput.value = '';
        taskPrioritySelect.value = 'medium';
        taskCategorySelect.value = '';
        renderTasks(searchTasksInput.value);
        saveTasks();
    }
});

taskTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTaskBtn.click();
});

// Search/filter tasks
searchTasksInput.addEventListener('input', () => {
    renderTasks(searchTasksInput.value);
});

// Sort tasks by priority
sortPriorityBtn.addEventListener('click', () => {
    if (sortBy === 'priority') {
        sortDirection.priority *= -1; // Toggle direction
    } else {
        sortBy = 'priority';
        sortDirection.priority = 1; // Default to ascending (low to high)
    }
    sortDueDateBtn.style.background = '#3a4647'; // Reset other button style
    sortPriorityBtn.style.background = sortDirection.priority === 1 ? '#4a90e2' : '#357abd'; // Highlight active sort
    renderTasks(searchTasksInput.value);
});

// Sort tasks by due date
sortDueDateBtn.addEventListener('click', () => {
    if (sortBy === 'dueDate') {
        sortDirection.dueDate *= -1; // Toggle direction
    } else {
        sortBy = 'dueDate';
        sortDirection.dueDate = 1; // Default to ascending (earliest to latest)
    }
    sortPriorityBtn.style.background = '#3a4647'; // Reset other button style
    sortDueDateBtn.style.background = sortDirection.dueDate === 1 ? '#4a90e2' : '#357abd'; // Highlight active sort
    renderTasks(searchTasksInput.value);
});

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Initial render
renderTasks();
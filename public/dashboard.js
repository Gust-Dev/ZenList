document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('taskList');
    const taskModal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    const taskForm = document.getElementById('taskForm');
    const taskIdInput = document.getElementById('taskId');
    const taskTitleInput = document.getElementById('taskTitle');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const newTaskButton = document.getElementById('newTaskButton');
    const logoutButton = document.getElementById('logoutButton');
    const cancelTaskButton = document.getElementById('cancelTaskButton');
    const userGreeting = document.getElementById('userGreeting');

    const taskCache = new Map();

    async function fetchUser() {
        try {
            const res = await fetch('/api/me');
            if (res.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            const user = await res.json();
            userGreeting.textContent = `Olá, ${user.full_name || user.email}`;
        } catch {
            userGreeting.textContent = 'Usuário não carregado.';
        }
    }

    function renderTaskCard(task) {
        const statusClass = task.status === 'completed' ? 'status-completed' : 'status-pending';
        const statusText = task.status === 'completed' ? 'CONCLUÍDA' : 'PENDENTE';

        const card = document.createElement('div');
        card.className = 'task-item card';
        card.dataset.taskId = task.id;

        const content = document.createElement('div');
        const titleEl = document.createElement('h3');
        titleEl.style.marginTop = '0';
        titleEl.textContent = task.title;
        const descEl = document.createElement('p');
        descEl.style.opacity = '0.8';
        descEl.textContent = task.description || 'Sem descrição.';
        content.appendChild(titleEl);
        content.appendChild(descEl);

        const footer = document.createElement('div');
        footer.className = 'task-footer';
        const statusEl = document.createElement('p');
        statusEl.className = `task-status ${statusClass}`;
        const statusStrong = document.createElement('strong');
        statusStrong.textContent = statusText;
        statusEl.textContent = 'Status: ';
        statusEl.appendChild(statusStrong);

        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit';
        editBtn.dataset.taskId = task.id;
        editBtn.textContent = 'Editar';

        actions.appendChild(editBtn);
        if (task.status === 'pending') {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'task-complete';
            completeBtn.dataset.taskId = task.id;
            completeBtn.textContent = '✓ Concluir';
            actions.appendChild(completeBtn);
        } else {
            const badge = document.createElement('span');
            badge.className = 'badge-completed';
            badge.textContent = '✔ Concluída';
            actions.appendChild(badge);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-delete';
        deleteBtn.dataset.taskId = task.id;
        deleteBtn.textContent = 'Apagar';
        actions.appendChild(deleteBtn);

        footer.appendChild(statusEl);
        footer.appendChild(actions);

        card.appendChild(content);
        card.appendChild(footer);

        return card.outerHTML;
    }

    async function fetchTasks() {
        taskList.innerHTML = '<h3 style="grid-column: 1 / -1; text-align: center;">Carregando tarefas...</h3>';

        try {
            const response = await fetch('/api/tasks');

            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Erro ao buscar tarefas');
            }

            const tasks = await response.json();
            taskCache.clear();

            if (!tasks.length) {
                taskList.innerHTML = '<h3 style="grid-column: 1 / -1; text-align: center;">Nenhuma tarefa encontrada. Crie uma!</h3>';
                return;
            }

            const cards = tasks.map((task) => {
                const normalizedTask = {
                    id: task.id,
                    title: task.title,
                    description: task.description || '',
                    status: task.status || 'pending'
                };

                taskCache.set(normalizedTask.id, normalizedTask);
                return renderTaskCard(normalizedTask);
            }).join('');

            taskList.innerHTML = cards;
        } catch (error) {
            console.error(error);
            taskList.innerHTML = '<h3 style="grid-column: 1 / -1; text-align: center;">Erro ao carregar tarefas.</h3>';
        }
    }

    function openTaskModal(id = '') {
        taskForm.reset();
        taskIdInput.value = id;

        if (id && taskCache.has(id)) {
            const task = taskCache.get(id);
            modalTitle.textContent = 'Editar Tarefa';
            submitButton.textContent = 'Salvar';
            taskTitleInput.value = task.title;
            taskDescriptionInput.value = task.description;
        } else {
            modalTitle.textContent = 'Criar Nova Tarefa';
            submitButton.textContent = 'Criar';
        }

        taskModal.style.display = 'block';
    }

    function closeTaskModal() {
        taskModal.style.display = 'none';
    }

    async function handleTaskSubmit(event) {
        event.preventDefault();

        const id = taskIdInput.value.trim();
        const isEditing = Boolean(id);
        const payload = {
            title: taskTitleInput.value.trim(),
            description: taskDescriptionInput.value.trim()
        };

        if (isEditing) {
            const task = taskCache.get(id);
            payload.status = task.status;
        }

        const endpoint = isEditing ? `/api/tasks/${id}` : '/api/tasks';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar tarefa');
            }

            closeTaskModal();
            await fetchTasks();
        } catch (error) {
            console.error(error);
            alert(`Falha ao ${isEditing ? 'atualizar' : 'criar'} tarefa. Verifique o console.`);
        }
    }

    async function handleCompleteTask(id) {
        try {
            const res = await fetch(`/api/tasks/${id}/complete`, { method: 'PATCH' });
            if (!res.ok) throw new Error();
            await fetchTasks();
        } catch {
            alert('Falha ao concluir tarefa.');
        }
    }

    async function handleDeleteTask(id) {
        if (!confirm('Tem certeza que deseja apagar esta tarefa?')) return;

        try {
            const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                throw new Error('Falha ao apagar tarefa');
            }

            taskCache.delete(id);
            await fetchTasks();
        } catch (error) {
            console.error(error);
            alert('Falha ao apagar tarefa. Verifique o console.');
        }
    }

    function handleTaskListClick(event) {
        const editButton = event.target.closest('.task-edit');
        if (editButton) {
            const taskId = editButton.dataset.taskId;
            openTaskModal(taskId);
            return;
        }

        const deleteButton = event.target.closest('.task-delete');
        if (deleteButton) {
            const taskId = deleteButton.dataset.taskId;
            handleDeleteTask(taskId);
            return;
        }

        const completeButton = event.target.closest('.task-complete');
        if (completeButton) {
            const taskId = completeButton.dataset.taskId;
            handleCompleteTask(taskId);
        }
    }

    function handleLogout() {
        alert('Sessão encerrada. Redirecionando para o login.');
        window.location.href = 'login.html';
    }

    newTaskButton.addEventListener('click', () => openTaskModal());
    logoutButton.addEventListener('click', handleLogout);
    cancelTaskButton.addEventListener('click', closeTaskModal);
    taskForm.addEventListener('submit', handleTaskSubmit);
    taskList.addEventListener('click', handleTaskListClick);

    window.addEventListener('click', (event) => {
        if (event.target === taskModal) {
            closeTaskModal();
        }
    });

    fetchUser();
    fetchTasks();
});

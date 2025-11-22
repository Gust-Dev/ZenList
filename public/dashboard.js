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
        const completeButton = task.status === 'pending'
            ? `<button class="task-complete" data-task-id="${task.id}">✓ Concluir</button>`
            : `<span class="badge-completed">✔ Concluída</span>`;

        return `
            <div class="task-item card" data-task-id="${task.id}">
                <div>
                    <h3 style="margin-top: 0;">${task.title}</h3>
                    <p style="opacity: 0.8;">${task.description || 'Sem descrição.'}</p>
                </div>
                <div class="task-footer">
                    <p class="task-status ${statusClass}">Status: <strong>${statusText}</strong></p>
                    <div class="task-actions">
                        <button class="task-edit" data-task-id="${task.id}">Editar</button>
                        ${completeButton}
                        <button class="task-delete" data-task-id="${task.id}">Apagar</button>
                    </div>
                </div>
            </div>
        `;
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

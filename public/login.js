async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value, password: form.password.value })
    });

    if (response.ok) {
        window.location.href = '/dashboard.html'; // Redireciona para a rota protegida
    } else {
        alert('Falha no Login. Verifique as credenciais.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});

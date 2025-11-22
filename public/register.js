async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const password = form.password.value;
    const confirm_password = form.confirm_password.value;

    if (password !== confirm_password) {
        alert("As senhas digitadas não coincidem. Por favor, verifique.");
        return;
    }

    const data = {
        full_name: form.full_name.value,
        email: form.email.value,
        password: password,
    };

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert('Registro bem-sucedido! Agora você pode fazer o login.');
        window.location.href = 'login.html';
    } else {
        const responseData = await response.json();
        alert('Erro ao registrar: ' + (responseData.message || 'Verifique se o email já está em uso.'));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

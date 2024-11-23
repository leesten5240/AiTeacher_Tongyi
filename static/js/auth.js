
const authForm = document.getElementById('auth-form');
const toggleAuth = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');
const authButton = document.getElementById('auth-button');
const messageDiv = document.getElementById('message');

let isLogin = true;

toggleAuth.addEventListener('click', () => {
    isLogin = !isLogin;
    formTitle.textContent = isLogin ? 'Login' : 'Register';
    authButton.textContent = isLogin ? 'Login' : 'Register';
    toggleAuth.textContent = isLogin
        ? "Don't have an account? Register here."
        : "Already have an account? Login here.";
    messageDiv.textContent = '';
});

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const endpoint = isLogin ? '/login' : '/register';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
        messageDiv.textContent = data.message;
        messageDiv.className = 'success';

        if (isLogin) {
            if (data.session_id) {
                localStorage.setItem('session_id', data.session_id); // 将 session_id 存储到 localStorage
            } else {
                console.warn("后端未返回 session_id！");
            }

            // 登录成功后跳转主页
            setTimeout(() => {
                window.location.href = '/'; 
            }, 1000);
        }
    } else {
        messageDiv.textContent = data.error;
        messageDiv.className = 'error';
    }
});
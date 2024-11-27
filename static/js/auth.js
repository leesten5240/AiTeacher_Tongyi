
const authForm = document.getElementById('auth-form');
const toggleAuth = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');
const authButton = document.getElementById('auth-button');
const messageDiv = document.getElementById('message');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const usernameRule = document.getElementById('username-rule');
const passwordRule = document.getElementById('password-rule');

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

// 用户名验证函数
function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{6,18}$/;
    const hasLetter = /[a-zA-Z]/.test(username);

    if (!username) {
        return "用户名不能为空";
    }
    if (username.length < 6) {
        return "用户名不能小于6位字符";
    }
    if (username.length > 18) {
        return "用户名不能大于18位字符";
    }
    if (!usernameRegex.test(username)) {
        return "用户名不能包含中文或是特殊字符";
    }
    if (!hasLetter) {
        return "用户名必须包含字母";
    }
    return null; // Valid
}

// 密码验证函数
function validatePassword(password) {
    const passwordRegex = /^[A-Za-z0-9]{6,16}$/;
    const isStrong = /[A-Za-z]/.test(password) && /\d/.test(password);

    if (!password) {
        return "密码不能为空";
    }
    if (!passwordRegex.test(password)) {
        return "6-16位字符, 可包含数字，字母(区分大小写)";
    }
    if (isStrong) {
        return "密码安全度：强";
    }
    return "密码安全度：弱";
}

// 用户名输入框事件
usernameInput.addEventListener('focus', () => {
    usernameRule.textContent = "6~18位字符，只能包含英文字母、数字、下划线";
});
usernameInput.addEventListener('blur', () => {
    const validationMessage = validateUsername(usernameInput.value);
    usernameRule.textContent = validationMessage || "√";
});

// 密码输入框事件
passwordInput.addEventListener('focus', () => {
    passwordRule.textContent = "6-16位字符, 可包含数字，字母(区分大小写)";
});
passwordInput.addEventListener('blur', () => {
    const validationMessage = validatePassword(passwordInput.value);
    passwordRule.textContent = validationMessage;
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
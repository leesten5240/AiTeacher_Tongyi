let chatHistory = [];
let isFirstMessage = true;

// 初始化提示
const initialPrompt = {
	role: "system",
	content: "你是一位专注于学习辅助的学习助手，专门回答与学习相关的问题。如果用户提出的问题不属于学习范畴，请礼貌地拒绝回答，并提醒用户只提问与学习相关的内容。 任务要求： - 在回答问题时，请按照步骤进行解答，保持语言简洁明了。 - 对于数学、物理等理科问题，尽量减少文字描述，更多地使用定理、公式来解答。 - 使用LaTeX语法展示所有公式和定理，并确保它们被$符号包裹起来以正确显示。 现在，请准备好根据上述指导原则来帮助用户解决他们的学习难题。"
};

document.addEventListener('DOMContentLoaded', checkLoginStatus)

document.getElementById('logout').addEventListener('click', function() {
	fetch('/logout', {
			method: 'POST'
		})
		.then(response => {
			if (response.ok) {
				// 登出成功，跳转到登录页面
				window.location.href = '/auth';
			} else {
				alert('Logout failed.');
			}
		})
		.catch(error => {})
})

// 表单提交事件
document.getElementById("chat-form").addEventListener("submit", handleSubmit);

function handleSubmit(event) {
	event.preventDefault();

	const textInput = document.getElementById("text-input");
	const fileInput = document.getElementById("image-input");
	const text = textInput.value.trim();
	const file = fileInput.files[0];

	if (!text && !file) {
		alert("请输入文本或上传图片！");
		return;
	}

	let userMessage = {};

	userMessage = {
		role: "user",
		content: [{
			type: "text",
			text
		}]
	};





	if (file) {
		const reader = new FileReader();
		reader.onloadend = function() {
			userMessage.content.push({
				type: "image_url",
				image_url: {
					url: reader.result
				}
			});
			processMessage(userMessage);
		};
		reader.readAsDataURL(file);
	} else {
		processMessage(userMessage);
	}

	textInput.value = "";
	fileInput.value = "";
}

// 处理消息
function processMessage(userMessage) {
	addMessageToHistory(userMessage);
	sendMessage(userMessage);
}

// 添加消息到聊天记录
function addMessageToHistory(message) {
	chatHistory.push(message);

	const chatHistoryDiv = document.getElementById("chat-history");
	const messageDiv = document.createElement("div");
	messageDiv.className = `message ${message.role === "user" ? "user-message" : "assistant-message"}`;

	// 添加文本内容
	message.content.forEach((item) => {
		if (item.type === "text") {
			const textSpan = document.createElement("span");
			textSpan.innerHTML = escapeHTML(item.text); // 安全插入文本
			messageDiv.appendChild(textSpan);
		} else if (item.type === "image_url") {
			const img = document.createElement("img");
			img.src = item.image_url.url;
			img.alt = "用户上传的图片";
			messageDiv.appendChild(img);
		}
	});

	chatHistoryDiv.appendChild(messageDiv);
	chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // 滚动到最新消息

	// 渲染 MathJax 公式
	MathJax.typesetPromise().catch((err) => console.error("MathJax 渲染错误:", err));
}

// 发送消息到后端
function sendMessage(message) {
	if (isFirstMessage) {
		chatHistory.unshift(initialPrompt);
		isFirstMessage = false;
	}

	const sessionId = localStorage.getItem("session_id");

	fetch("/process", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Session-ID": sessionId
			},
			body: JSON.stringify({
				chat_history: chatHistory
			})
		})
		.then((response) => response.json())
		.then((data) => {
			if (data.response) {
				const assistantMessage = {
					role: "assistant",
					content: [{
						type: "text",
						text: formatMathResponse(data.response)
					}]
				};
				addMessageToHistory(assistantMessage);
			} else {
				showError(`服务器错误：${data.error}`);
			}
		})
		.catch((error) => {
			console.error("请求错误:", error);
			showError("消息发送失败，请检查网络连接。");
		});
}

// 格式化数学公式
function formatMathResponse(response) {
	return response
		.replace(/cos\^2\s*a/g, "\\cos^2 a")
		.replace(/sin\^2\s*a/g, "\\sin^2 a")
		.replace(/sqrt\((.*?)\)/g, "\\sqrt{$1}") // 处理平方根符号
		.replace(/log_\((.*?)\)\((.*?)\)/g, "\\log_{$1}($2)") // 处理对数
		.replace(/\^/g, "^"); // 处理幂运算
}

// 显示错误消息
function showError(message) {
	alert(message);
}

// 转义 HTML 防止 XSS
function escapeHTML(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}


// 检查用户登录状态
async function checkLoginStatus() {
	const response = await fetch('/check_session', {
		method: 'GET'
	});

	if (response.status === 401) {
		// 未登录，跳转到登录页面
		window.location.href = '/auth';
	} else {
		const data = await response.json();
		console.log(`Welcome, ${data.user}!`);
	}
}

// 获取“新建对话”按钮
document.getElementById('new-chat').addEventListener('click', function() {
	// 清空聊天历史记录
	chatHistory = [];
	isFirstMessage = true; // 标记为第一次对话

	// 清空聊天界面
	const chatHistoryDiv = document.getElementById('chat-history');
	chatHistoryDiv.innerHTML = '';

	// 发送 AJAX 请求通知后端
	fetch('/new_session', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				session_name: '新对话'
			}) // 包含请求体
		})
		.then((response) => response.json())
		.then((data) => {
			console.log(`新对话已开始，Chat ID: ${data.session_id}`);
			const messageDiv = document.createElement('div');
			messageDiv.className = "system-message";
			messageDiv.textContent = "新对话已开始！";
			chatHistoryDiv.appendChild(messageDiv);
			chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
			localStorage.setItem('session_id',data.session_id)
		})
		.catch((error) => {
			console.error('新对话请求失败:', error);
		});
});


//前端加载会话列表
async function loadSessions() {
	const response = await fetch('/sessions');
	if (response.ok) {
		const data = await response.json();
		const sessionList = document.getElementById('sessions');
		sessionList.innerHTML = ''; // 清空当前列表
		data.sessions.forEach(session => {
			const li = document.createElement('li');
			li.textContent = `${session.session_name} (${new Date(session.created_at).toLocaleString()})`;
			li.addEventListener('click', () => loadSessionMessages(session.id));
			sessionList.appendChild(li);
		});
	} else {
		console.error("无法加载会话列表");
	}
}

//加载会话聊天记录
async function loadSessionMessages(sessionId) {
	const response = await fetch(`/session/${sessionId}`);
	if (response.ok) {
		const data = await response.json();
		chatHistory = data.messages.map(msg => ({
			role: msg.role,
			content: [{
				type: "text",
				text: msg.content
			}]
		}));
		renderChatHistory(); // 渲染聊天记录到界面
	} else {
		console.error("无法加载聊天记录");
	}
}

function renderChatHistory() {
	const chatHistoryDiv = document.getElementById('chat-history');
	chatHistoryDiv.innerHTML = '';
	chatHistory.forEach(addMessageToHistory);
}
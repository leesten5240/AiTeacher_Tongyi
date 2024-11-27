let chatHistory = [];
let isFirstMessage = true;

// 初始化提示
const initialPrompt = {
	role: "system",
	content: "你是一位专注于学习辅助的学习助手，专门回答与学习相关的问题。如果用户提出的问题不属于学习范畴，请礼貌地拒绝回答，并提醒用户只提问与学习相关的内容。 任务要求： - 在回答问题时，请按照步骤进行解答，保持语言简洁明了。 - 对于数学、物理等理科问题，尽量减少文字描述，更多地使用定理、公式来解答。 - 使用LaTeX语法展示所有公式和定理，并确保它们被$符号包裹起来以正确显示。 现在，请准备好根据上述指导原则来帮助用户解决他们的学习难题。"
};

document.addEventListener('DOMContentLoaded', () => {
	checkLoginStatus(); // 检查用户是否已登录
	loadSessions(); // 加载历史会话列表
	loadSessionMessages(localStorage.getItem('session_id'));

});


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
		const userNameElement = document.getElementById('user-name');
		if (data.logged_in) {
			userNameElement.textContent = data.user; // 假设后端返回的用户名是 data.user.name
		}
	}
}

// 获取“新建对话”按钮
document.getElementById('new-chat').addEventListener('click', function() {
	// 创建弹窗
	const modal = document.createElement('div');
	modal.id = 'modal';
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100vw';
	modal.style.height = '100vh';
	modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
	modal.style.display = 'flex';
	modal.style.justifyContent = 'center';
	modal.style.alignItems = 'center';

	// 创建弹窗内容容器
	const modalContent = document.createElement('div');
	modalContent.style.backgroundColor = 'white';
	modalContent.style.padding = '20px';
	modalContent.style.borderRadius = '8px';
	modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
	modalContent.style.textAlign = 'center';

	// 创建输入框
	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = '请输入会话名称';
	input.style.width = '100%';
	input.style.padding = '8px';
	input.style.marginBottom = '10px';
	input.style.fontSize = '16px';

	// 创建确认按钮
	const confirmButton = document.createElement('button');
	confirmButton.textContent = '确认';
	confirmButton.style.padding = '8px 16px';
	confirmButton.style.marginRight = '10px';
	confirmButton.style.backgroundColor = '#4CAF50';
	confirmButton.style.color = 'white';
	confirmButton.style.border = 'none';
	confirmButton.style.borderRadius = '4px';
	confirmButton.style.cursor = 'pointer';

	// 创建取消按钮
	const cancelButton = document.createElement('button');
	cancelButton.textContent = '取消';
	cancelButton.style.padding = '8px 16px';
	cancelButton.style.backgroundColor = '#f44336';
	cancelButton.style.color = 'white';
	cancelButton.style.border = 'none';
	cancelButton.style.borderRadius = '4px';
	cancelButton.style.cursor = 'pointer';

	// 将组件添加到弹窗内容容器
	modalContent.appendChild(input);
	modalContent.appendChild(confirmButton);
	modalContent.appendChild(cancelButton);

	// 将弹窗内容容器添加到弹窗
	modal.appendChild(modalContent);

	// 将弹窗添加到页面
	document.body.appendChild(modal);

	// 点击确认按钮的逻辑
	confirmButton.addEventListener('click', function() {
		const sessionName = input.value.trim();
		if (!sessionName) {
			alert('会话名称不能为空！');
			return;
		}

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
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					session_name: sessionName, // 使用用户输入的会话名称
				}),
			})
			.then((response) => response.json())
			.then((data) => {
				console.log(`新对话已开始，Chat ID: ${data.session_id}`);
				const messageDiv = document.createElement('div');
				messageDiv.className = 'assistant-message';
				messageDiv.textContent = '新对话已开始！';
				chatHistoryDiv.appendChild(messageDiv);
				chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
				localStorage.setItem('session_id', data.session_id);
				loadSessions();
			})
			.catch((error) => {
				console.error('新对话请求失败:', error);
			});

		// 移除弹窗
		document.body.removeChild(modal);
	});

	// 点击取消按钮的逻辑
	cancelButton.addEventListener('click', function() {
		// 移除弹窗
		document.body.removeChild(modal);
	});
});



// 前端加载会话列表
async function loadSessions() {
	const response = await fetch('/sessions');
	if (response.ok) {
		const data = await response.json();
		const sessionList = document.getElementById('sessions');
		sessionList.innerHTML = ''; // 清空当前列表

		data.sessions.forEach(session => {
			const li = document.createElement('li');
			li.textContent = `${session.session_name} (${new Date(session.created_at).toLocaleString()})`;

			// 为每个会话项添加 class
			li.classList.add('session-item');

			//防止删除会话记录后，无法选中最新的一条会话记录
			if (localStorage.getItem('session_id') == null) {
				localStorage.setItem('session_id', session.id)
			}

			//选中当前会话
			if (session.id == localStorage.getItem('session_id')) {
				li.classList.add('active-session');
			}



			// 点击时加载对应会话消息，并设置当前会话样式
			li.addEventListener('click', () => {
				// 移除其他会话的选中状态
				document.querySelectorAll('.session-item').forEach(item => item.classList.remove(
					'active-session'));

				// 设置当前点击的会话为选中状态
				li.classList.add('active-session');

				// 加载会话消息
				loadSessionMessages(session.id);
			});

			// 创建操作菜单容器（三个点按钮）
			const menuContainer = document.createElement('div');
			menuContainer.classList.add('menu-container');

			const menuButton = document.createElement('button');
			menuButton.textContent = '⋮';
			menuButton.classList.add('menu-button');

			// 创建菜单项容器
			const menu = document.createElement('div');
			menu.classList.add('menu');

			// 删除按钮
			const deleteOption = document.createElement('div');
			deleteOption.textContent = '删除';
			deleteOption.classList.add('menu-item');
			deleteOption.addEventListener('click', (e) => {
				e.stopPropagation(); // 阻止事件冒泡，避免触发会话加载
				if (confirm(`确定删除会话 "${session.session_name}" 吗？`)) {
					deleteSession(session.id);
				}
			});

			// 重命名按钮
			const renameOption = document.createElement('div');
			renameOption.textContent = '重命名';
			renameOption.classList.add('menu-item');
			renameOption.addEventListener('click', (e) => {
				e.stopPropagation(); // 阻止事件冒泡
				const newName = prompt(`请输入新的会话名称（当前: ${session.session_name}）:`);
				if (newName) {
					renameSession(session.id, newName);
				}
			});

			// 组装菜单项
			menu.appendChild(deleteOption);
			menu.appendChild(renameOption);

			// 组装菜单容器
			menuContainer.appendChild(menuButton);
			menuContainer.appendChild(menu);

			// 点击菜单按钮显示/隐藏菜单
			menuButton.addEventListener('click', (e) => {
				e.stopPropagation();
				document.querySelectorAll('.menu').forEach(m=>m.classList.remove('visible'));
				menu.classList.toggle('visible');
			});

			// 点击其他地方隐藏菜单
			document.addEventListener('click', () => {
				menu.classList.remove('visible');
			});

			li.appendChild(menuContainer);
			sessionList.appendChild(li);
		});
	} else {
		console.error("无法加载会话列表");
	}
}


// 添加 renameSession 函数
async function renameSession(sessionId, newName) {
	try {
		const response = await fetch(`/session/${sessionId}/rename`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				session_name: newName
			}),
		});

		if (response.ok) {
			alert('会话名称已成功更新');
			loadSessions(); // 重新加载会话列表
		} else {
			const data = await response.json();
			alert(`重命名失败: ${data.error}`);
		}
	} catch (error) {
		console.error("重命名会话失败:", error);
		alert("重命名失败，请检查网络连接");
	}
}

// 添加删除会话的函数
async function deleteSession(sessionId) {
	try {
		const response = await fetch(`/session/${sessionId}`, {
			method: 'DELETE'
		});
		if (response.ok) {
			alert('会话已成功删除');
			const currentSessionId = localStorage.getItem("session_id");

			// 如果删除的是当前会话，清除localStorage并清空聊天界面
			if (currentSessionId === sessionId) {
				localStorage.removeItem("session_id");
				chatHistory = [];
				isFirstMessage = true; // 重置聊天状态
				const chatHistoryDiv = document.getElementById("chat-history");
				chatHistoryDiv.innerHTML = "";
			}
			loadSessions(); // 重新加载会话列表
		} else {
			const data = await response.json();
			alert(`删除失败: ${data.error}`);
		}
	} catch (error) {
		console.error("删除会话失败:", error);
		alert("删除失败，请检查网络连接");
	}
}

//加载会话聊天记录
async function loadSessionMessages(sessionId) {
	localStorage.setItem('session_id', sessionId)
	const response = await fetch(`/session/${sessionId}`);
	if (response.ok) {
		const data = await response.json();
		chatHistory = data.messages.map(msg => ({
			role: msg.role,
			content: msg.content.map(item => ({
				type: item.type,
				text: item.type === "text" ? item.text : null,
				image_url: item.type === "image_url" ? item.image_url : null
			}))
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
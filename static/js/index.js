let chatHistory = [];
let isFirstMessage = true;

const initialPrompt = {
	role: "system",
	content: [
		{
			type: "text",
			text: "你是一位中学的老师，只回答与学习相关的问题。在回答问题时分步骤回答，确保解题时所采用的知识不会超过中学阶段，语言简洁，如果问题是数学或物理等理科的问题，则尽量少用文字描述，而是多用定理、公式等解答。如果不是学习上的问题，则提示用户不要提问其他问题，而是提问学习相关的问题"
		}
	]
};

document.getElementById('chat-form').addEventListener('submit', function (event) {
	event.preventDefault();
	const text = document.getElementById('text-input').value;
	const fileInput = document.getElementById('image-input');
	const file = fileInput.files[0];
	const imageUrl = document.getElementById('image-url').value;

	if (!text) {
		alert('Please provide some text.');
		return;
	}

	const message = {
		role: "user",
		content: [{
			type: "text",
			text: text
		}]
	};

	if (file) {
		//处理本地上传的图片
		const reader = new FileReader();
		reader.onloadend = function () {
			const imgStr = reader.result.split(',')[1];
			message.content.push({
				type: "image_url",
				image_url: {
					url: `data:image/jpeg;base64,${imgStr}`
				}
			});

			firstMessageHandler();

			//添加消息到聊天历史并发送请求
			handleMessage(message);
		};
		reader.readAsDataURL(file);
	} else if (imageUrl) {
		//使用提供的图片URL
		message.content.push({
			type: "image_url",
			image_url: {
				url: imageUrl
			}
		});

		firstMessageHandler();
		handleMessage(message);

	} else {
		//只有文本，没有图片
		firstMessageHandler();
		handleMessage(message);
	}

	// 清空输入框
	document.getElementById('text-input').value = '';
	document.getElementById('image-input').value = '';
	document.getElementById('image-url').value = '';
});

function updateChatHistory() {
	const chatHistoryDiv = document.getElementById('chat-history');
	chatHistoryDiv.innerHTML = '';
	chatHistory.forEach(message => {
		//过滤掉初始提示
		if (message.role != "system") {
			const messageDiv = document.createElement('div');
			messageDiv.textContent = `${message.role}: ${message.content[0].text}`;
			if (message.content.length > 1 && message.content[1].type === 'image_url') {
				const imgDiv = document.createElement('img');
				imgDiv.src = message.content[1].image_url.url;
				imgDiv.style.maxWidth = '200px';
				messageDiv.appendChild(imgDiv);
			}
			chatHistoryDiv.appendChild(messageDiv);
		}


	});
}

function handleMessage(message) {
	chatHistory.push(message);

	// 发送请求
	fetch('/process', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			chat_history: chatHistory
		})
	})
		.then(response => response.json())
		.then(data => {
			if (data.response) {
				// 添加模型的回复到聊天历史
				chatHistory.push({
					role: "assistant",
					content: [{
						type: "text",
						text: data.response
					}]
				});

				// 更新聊天历史显示
				updateChatHistory();
			} else {
				document.getElementById('response').innerText = 'Error: ' + data.error;
			}
		})
		.catch(error => {
			console.error('Error:', error);
			document.getElementById('response').innerText = 'Error: ' + error;
		});
}

function firstMessageHandler() {
	// 如果是首次发送消息，添加初始提示
	if (isFirstMessage) {
		chatHistory.push(initialPrompt);
		isFirstMessage = false;
	}
}
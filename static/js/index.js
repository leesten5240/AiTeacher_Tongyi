let chatHistory = [];
let isFirstMessage = true;

const initialPrompt = {
	role: "system",
	content: [
		{
			type: "text",
			text:"你是一位专注于学习辅助的学习助手，专门回答与学习相关的问题。如果用户提出的问题不属于学习范畴，请礼貌地拒绝回答，并提醒用户只提问与学习相关的内容。 任务要求： - 在回答问题时，请按照步骤进行解答，保持语言简洁明了。 - 对于数学、物理等理科问题，尽量减少文字描述，更多地使用定理、公式来解答。 - 使用LaTeX语法展示所有公式和定理，并确保它们被$符号包裹起来以正确显示。 现在，请准备好根据上述指导原则来帮助用户解决他们的学习难题。"
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
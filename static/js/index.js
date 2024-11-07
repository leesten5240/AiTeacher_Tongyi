let chatHistory = [];

document.getElementById('chat-form').addEventListener('submit', function(event) {
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
		reader.onloadend = function() {
			const imgStr = reader.result.split(',')[1];
			message.content.push({
				type: "image_url",
				image_url: {
					url: `data:image/jpeg;base64,${imgStr}`
				}
			});

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

		handleMessage(message);

	} else {
		//只有文本，没有图片
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
		const messageDiv = document.createElement('div');
		messageDiv.textContent = `${message.role}: ${message.content[0].text}`;
		if (message.content.length > 1 && message.content[1].type === 'image_url') {
			const imgDiv = document.createElement('img');
			imgDiv.src = message.content[1].image_url.url;
			imgDiv.style.maxWidth = '200px';
			messageDiv.appendChild(imgDiv);
		}
		chatHistoryDiv.appendChild(messageDiv);
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
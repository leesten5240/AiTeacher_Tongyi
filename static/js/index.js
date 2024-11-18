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

  const textInput = document.getElementById('text-input');
  const fileInput = document.getElementById('image-input');
  const text = textInput.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) {
    alert('Please provide text or an image.');
    return;
  }
  
  let userMessage={};
  // if(isFirstMessage){
  //   const concatText="你是一位专注于学习辅助的学习助手，专门回答与学习相关的问题。如果用户提出的问题不属于学习范畴，请礼貌地拒绝回答，并提醒用户只提问与学习相关的内容。 任务要求： - 在回答问题时，请按照步骤进行解答，保持语言简洁明了。 - 对于数学、物理等理科问题，尽量减少文字描述，更多地使用定理、公式来解答。 - 使用LaTeX语法展示所有公式和定理，并确保它们被$符号包裹起来以正确显示。 现在，请准备好根据上述指导原则来帮助用户解决他们的学习难题。"+text;
  //   userMessage = {
  //     role: "user",
  //     content: [{ type: "text", text:concatText }]
  //   };
  //   isFirstMessage=false;
  // }else{
    userMessage = {
      role: "user",
      content: [{ type: "text", text }]
    };
  // }


  if (file) {
    const reader = new FileReader();
    reader.onloadend = function () {
      userMessage.content.push({ type: "image_url", image_url: { url: reader.result } });
      addMessageToHistory(userMessage);
      sendMessage(userMessage);
    };
    reader.readAsDataURL(file);
  } else {
    addMessageToHistory(userMessage);
    sendMessage(userMessage);
  }
//清空输入框
  textInput.value = '';
  fileInput.value = '';
});

function addMessageToHistory(message) {
  chatHistory.push(message);

  const chatHistoryDiv = document.getElementById('chat-history');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.role === "user" ? "user-message" : "assistant-message"}`;
  messageDiv.textContent = message.content[0].text;

  if (message.content.length > 1 && message.content[1].type === 'image_url') {
    const img = document.createElement('img');
    img.src = message.content[1].image_url.url;
    messageDiv.appendChild(img);
  }

  chatHistoryDiv.appendChild(messageDiv);
  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // 滚动到底部
}

function sendMessage(message) {
  if (isFirstMessage) {
    chatHistory.unshift(initialPrompt);
    isFirstMessage = false;
  }

  fetch('/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_history: chatHistory })
  })
    .then(response => response.json())
    .then(data => {
      if (data.response) {
        const assistantMessage = {
          role: "assistant",
          content: [{ type: "text", text: data.response }]
        };
        addMessageToHistory(assistantMessage);
      } else {
        alert(`Error: ${data.error}`);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while sending the message.');
    });
}

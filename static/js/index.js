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

  const textInput = document.getElementById('text-input');
  const fileInput = document.getElementById('image-input');
  const text = textInput.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) {
    alert('Please provide text or an image.');
    return;
  }

  const userMessage = {
    role: "user",
    content: [{ type: "text", text }]
  };

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

let chatHistory = [];
let isFirstMessage = true;

// 初始化提示
const initialPrompt = {
	role: "system",
	content: "你是一位专注于学习辅助的学习助手，专门回答与学习相关的问题。如果用户提出的问题不属于学习范畴，请礼貌地拒绝回答，并提醒用户只提问与学习相关的内容。 任务要求： - 在回答问题时，请按照步骤进行解答，保持语言简洁明了。 - 对于数学、物理等理科问题，尽量减少文字描述，更多地使用定理、公式来解答。 - 使用LaTeX语法展示所有公式和定理，并确保它们被$符号包裹起来以正确显示。 现在，请准备好根据上述指导原则来帮助用户解决他们的学习难题。"
};

document.addEventListener('DOMContentLoaded',checkLoginStatus)

document.getElementById('logout').addEventListener('click', function () {
  fetch('/logout', { method: 'POST' })
    .then(response => {
      if (response.ok) {
        // 登出成功，跳转到登录页面
        window.location.href = '/auth';
      } else {
        alert('Logout failed.');
      }
    })
    .catch(error => {
})
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

  let userMessage={};
  
    userMessage = {
      role: "user",
      content: [{ type: "text", text }]
    };





  if (file) {
    const reader = new FileReader();
    reader.onloadend = function () {
      userMessage.content.push({ type: "image_url", image_url: { url: reader.result } });
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

  fetch("/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_history: chatHistory })
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.response) {
        const assistantMessage = {
          role: "assistant",
          content: [{ type: "text", text: formatMathResponse(data.response) }]
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
  const response = await fetch('/check_session', { method: 'GET' });
  
  if (response.status === 401) {
    // 未登录，跳转到登录页面
    window.location.href = '/auth';
  } else {
    const data = await response.json();
    console.log(`Welcome, ${data.user}!`);
  }
}

// 检查用户登录状态
async function checkLoginStatus() {
  const response = await fetch('/check_session', { method: 'GET' });
  
  if (response.status === 401) {
    // 未登录，跳转到登录页面
    window.location.href = '/auth';
  } else {
    const data = await response.json();
    console.log(`Welcome, ${data.user}!`);
  }
}

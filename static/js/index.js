let chatHistory = [];
let isFirstMessage = true;

// 初始化提示
const initialPrompt = {
  role: "system",
  content: [
    {
      type: "text",
      text: "你是一个数学算数器，对用户发送的数学题只用回答1与0，正确就回答1，错误就回答0。"
    }
  ]
};

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

  const userMessage = {
    role: "user",
    content: []
  };

  if (text) {
    userMessage.content.push({ type: "text", text });
  }

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

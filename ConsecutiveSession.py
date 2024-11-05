import os
from openai import OpenAI

class ChatSession:
    def __init__(self, api_key, model_name):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.model_name = model_name
        self.messages = []

    def add_message(self, role, content):
        message = {"role": role, "content": content}
        self.messages.append(message)

    def get_response(self):
        completion = self.client.chat.completions.create(
            model=self.model_name,
            messages=self.messages
        )
        response_content = completion.choices[0].message.content
        return response_content

# 使用方法
if __name__ == "__main__":
    api_key = "sk-a4156f5fe5db4412a9020740eedf888b"  # 替换为你的API密钥
    session = ChatSession(api_key, "qwen-vl-plus")

    # 添加用户消息
    session.add_message("user", [
        {"type": "text", "text": "这是什么"},
        {"type": "image_url", "image_url": {"url": "https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg"}}
    ])

    # 获取回复
    response = session.get_response()
    print(response)

    # 假设我们收到了用户的另一个问题
    user_question = "图片中的狗是什么品种？"
    session.add_message("user", [{"type": "text", "text": user_question}])

    # 再次获取回复
    response = session.get_response()
    print(response)
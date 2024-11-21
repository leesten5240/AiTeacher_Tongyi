from flask import Flask, request, jsonify, render_template,session,redirect,url_for
from openai import OpenAI
import os
import base64
from io import BytesIO
from PIL import Image
from werkzeug.security import generate_password_hash, check_password_hash
from auth import auth_bp
import pymysql

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key="4c06b6ce11fe3eeba1fd8544537e82a463742dc40dd5759a6f249da6962a6055"#os.environ.get('secret_key')  # 用于加密 session 数据
print(os.environ.get('secret_key'))

# 装饰器检查是否登录
def login_required(func):
    def wrapper(*args, **kwargs):
        if 'user' not in session:
            if request.is_json:#如果是AJAX请求
                return jsonify({'error': '未登录'}), 401
            return redirect(url_for('auth'))  # 跳转到登录页面
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

app.register_blueprint(auth_bp)



# 配置OpenAI客户端
client = OpenAI(
    api_key="sk-a4156f5fe5db4412a9020740eedf888b",  # 替换为你的API密钥
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/auth')
def auth():
    return render_template('auth.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    chat_history = data.get('chat_history', [])

    if not chat_history:
        return jsonify({"error": "No chat history provided"}), 400

    # 构建消息列表
    messages = chat_history

    # 调用大模型API
    try:
        completion = client.chat.completions.create(
            model="qwen-vl-plus",
            messages=messages
        )
        response_content = completion.choices[0].message.content
        return jsonify({"response": response_content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
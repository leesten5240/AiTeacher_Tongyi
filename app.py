from flask import Flask, request, jsonify, render_template,session,redirect,url_for
from openai import OpenAI
import os
import base64
from io import BytesIO
from PIL import Image
from werkzeug.security import generate_password_hash, check_password_hash
from auth import auth_bp
import pymysql
import uuid  # 用于生成唯一的会话 ID
from database import *
from chatsession import chatsession_bp
from scoreAnalysis import scoreAnalysis_bp

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key=os.environ.get('secret_key')  # 用于加密 session 数据

# 装饰器检查是否登录
def login_required(func):
    def wrapper(*args, **kwargs):
        if 'username' not in session:
            if request.is_json:#如果是AJAX请求
                return jsonify({'error': '未登录'}), 401
            return redirect(url_for('auth'))  # 跳转到登录页面
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

app.register_blueprint(auth_bp)
app.register_blueprint(chatsession_bp)
app.register_blueprint(scoreAnalysis_bp)

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

@app.route('/scoreAnalysis')
def score_analysis():
    return render_template('fileAnalysis.html')

@app.route('/process', methods=['POST'])
def process():
    user_id = session.get('user_id')  # 获取用户 ID
    session_id = request.headers.get("Session-ID") or request.json.get("session_id") or request.args.get("session_id")  # 当前会话 ID
    chat_history = request.json.get('chat_history', [])

    if not user_id or not session_id:
        return jsonify({"error": "无效的会话或用户未登录"}), 401

    try:
        # 保存每条消息到数据库
        connection = get_db_connection()
        with connection.cursor() as cursor:

            sql="SELECT * FROM chat_sessions WHERE id=%s"
            cursor.execute(sql,(session_id))
            if not cursor.fetchone():
                return jsonify({'error': '会话ID不存在，请点击新建会话'}), 400

            message = chat_history[-1]  # 取最新消息
            role = message['role']
            content_items = message['content']
            for item in content_items:
                content_type = item['type']  # 消息类型
                content = item.get('text') or item.get('image_url', {}).get('url')  # 文本或图片URL
                sql = "INSERT INTO chat_messages (session_id, role, content, type) VALUES (%s, %s, %s, %s)"
                cursor.execute(sql, (session_id, role, content, content_type))
            connection.commit()

        # 调用大模型 API 获取助手回复
        completion = client.chat.completions.create(
            model="qwen-vl-plus",
            messages=chat_history
        )
        response_content = completion.choices[0].message.content

        # 将助手回复也存入数据库
        with connection.cursor() as cursor:
            sql = "INSERT INTO chat_messages (session_id, role, content, type) VALUES (%s, 'assistant', %s, 'text')"
            cursor.execute(sql, (session_id, response_content))
            connection.commit()

        return jsonify({"response": response_content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
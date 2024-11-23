from flask import request, jsonify, session, Blueprint
import uuid  # 用于生成唯一的会话 ID
from database import *

chatsession_bp = Blueprint('chatsession', __name__)
@chatsession_bp.route('/new_session', methods=['POST'])
def new_session():
    user_id = session.get('user_id')  # 获取当前登录用户名
    if not user_id:
        return jsonify({"error": "用户未登录"}), 401

    # 设置会话
    session_name = request.json.get('session_name', '新对话')  # 可指定会话名称
    session_id = str(uuid.uuid4())  # 生成唯一 session_id  # 自定义生成会话 ID 的逻辑
    session['session_id'] = session_id  # 存储到后端会话
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 插入新会话记录
            sql = "INSERT INTO chat_sessions (id, user_id, session_name) VALUES (%s, %s, %s)"
            cursor.execute(sql, (session_id, user_id, session_name))
            connection.commit()
        return jsonify({"message": "新会话已创建", "session_id": session_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 获取用户所有会话
@chatsession_bp.route('/sessions', methods=['GET'])
def get_sessions():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({"error": "用户未登录"}), 401

    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT id, session_name, created_at FROM chat_sessions WHERE user_id = %s ORDER BY created_at DESC"
            cursor.execute(sql, (user_id,))
            sessions = cursor.fetchall()
        return jsonify({"sessions": sessions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 获取某个会话的聊天记录
@chatsession_bp.route('/session/<int:session_id>', methods=['GET'])
def get_session_messages(session_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "用户未登录"}), 401

    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
            SELECT role, content, created_at 
            FROM chat_messages 
            WHERE session_id = %s 
            ORDER BY created_at ASC
            """
            cursor.execute(sql, (session_id,))
            messages = cursor.fetchall()
        return jsonify({"messages": messages})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

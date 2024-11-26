from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql
import uuid
from database import *


auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    #加密密码
    password_hash = generate_password_hash(password)

    try:
        conn=get_db_connection()
        with conn.cursor() as cursor:
            #检查用户名是否已存在
            cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
            if cursor.fetchone():
                return jsonify({'error': 'Username already exists'}), 400
            
            #插入新用户
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password_hash))
            conn.commit()
        return jsonify({'message': 'Registration successful'}), 200
    finally:
        conn.close()


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    conn=None #初始化连接
    try:
        conn=get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
            user = cursor.fetchone()
            if not user or not check_password_hash(user['password_hash'], password):
                return jsonify({'error': 'Invalid username or password'}), 401
            
            #设置会话
            session_id = str(uuid.uuid4())  # 生成唯一 session_id  # 自定义生成会话 ID 的逻辑
            session['session_id'] = session_id  # 存储到后端会话
            session['username'] = username
            session['user_id']=user['id']
            # 向 chat_sessions 表插入记录
            cursor.execute(
                "INSERT INTO chat_sessions (id, user_id) VALUES (%s, %s)",
                (session_id, user['id'])
            )
            conn.commit()  # 提交更改到数据库

            return jsonify({'message': 'Login successful', 'session_id': session_id}), 200
            # return jsonify({'message': 'Login successful'}), 200
    except Exception as e:
        print(f'Error during login: {e}')
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if conn:
            conn.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/check_session',methods=['GET'])
def check_session():
    if 'username' in session:
        return jsonify({'logged_in':True,'user':session['username']})
    return jsonify({'logged_in':False}),401

    
    

from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql
import uuid
from database import *


auth_bp = Blueprint('auth', __name__)

# 用户名和密码验证
def validate_username(username):
    if len(username) < 6:
        return "用户名不能小于6位字符"
    if len(username) > 18:
        return "用户名不能大于18位字符"
    if not username.isalnum() and "_" not in username:
        return "用户名不能包含中文或特殊字符"
    if not any(char.isalpha() for char in username):
        return "用户名必须包含字母"
    return None

def validate_password(password):
    if len(password) < 6 or len(password) > 16:
        return "密码长度必须在6到16位之间"
    if not any(char.isdigit() for char in password) or not any(char.isalpha() for char in password):
        return "密码必须包含数字和字母"
    return None

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirmPassword')  # 获取确认密码

    if not username or not password or not confirm_password:
        return jsonify({'error': 'Username, password, and confirm password are required'}), 400
    
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400

    username_validation_message = validate_username(username)
    if username_validation_message:
        return jsonify({'error': username_validation_message}), 400
    
    password_validation_message = validate_password(password)
    if password_validation_message:
        return jsonify({'error': password_validation_message}), 400


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
                return jsonify({'error': '用户名或密码错误！'}), 401
            
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

            return jsonify({'message': '登录成功！', 'session_id': session_id}), 200
            # return jsonify({'message': 'Login successful'}), 200
    except Exception as e:
        print(f'Error during login: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
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

    
    

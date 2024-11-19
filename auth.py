from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import pymysql


auth_bp = Blueprint('auth', __name__)

#数据库信息
DB_HOST = 'localhost'  # MySQL 主机地址
DB_USER = 'root'       # 数据库用户名
DB_PASSWORD = 'ASL12345h'  # 数据库密码
DB_NAME = 'aiteacher'  # 数据库名称

def get_db_connection():
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        raise


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
            session['user'] = username
            return jsonify({'message': 'Login successful'}), 200
    except Exception as e:
        print(f'Error during login: {e}')
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if conn:
            conn.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/check_session',methods=['GET'])
def check_session():
    if 'user' in session:
        return jsonify({'logged_in':True,'user':session['user']})
    return jsonify({'logged_in':False}),401

    
    

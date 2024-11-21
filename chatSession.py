from flask import Blueprint, request, jsonify, session
import DataBase
chatSession_bp = Blueprint('chatSession', __name__)
@chatSession_bp.route('/create_session', methods=['POST'])
def create_session():
    data = request.json
    session_name = data.get('session_name')  # 前端传入的会话名称
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'User not logged in'}), 401

    if not session_name:
        return jsonify({'error': 'Session name is required'}), 400

    try:
        conn = DataBase.get_db_connection()
        with conn.cursor() as cursor:
            # 插入新会话
            cursor.execute(
                "INSERT INTO chat_sessions (user_id, session_name) VALUES (%s, %s)",
                (user_id, session_name)
            )
            conn.commit()

            # 获取新会话的 ID
            session_id = cursor.lastrowid
        return jsonify({'message': 'Session created', 'session_id': session_id}), 200
    except Exception as e:
        print(f"Error creating session: {e}")
        return jsonify({'error': 'Failed to create session'}), 500
    finally:
        if conn:
            conn.close()

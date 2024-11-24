import pymysql

#数据库信息
DB_HOST = 'localhost'  # MySQL 主机地址
DB_USER = 'root'       # 数据库用户名
DB_PASSWORD = 'ymn20035240'  # 数据库密码
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


import pandas as pd
from flask import Blueprint, request, jsonify, session

scoreAnalysis_bp = Blueprint('scoreAnalysis', __name__)

@scoreAnalysis_bp.route('/upload', methods=['POST'])
def upload_file():
    # 检查文件是否上传
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']

    # 检查文件类型
    if not file.filename.endswith(('.xlsx', '.csv')):
        return jsonify({'error': 'Invalid file type'}), 400

    # 读取文件
    try:
        if file.filename.endswith('.xlsx'):
            # 关键字段列表，根据文件的实际内容定义
            key_columns = ["姓名", "语文", "数学"]
            # 检测表头并读取数据
            df = detect_header_row(file, key_columns)
        else:
            df = pd.read_csv(file)

        # 过滤掉非成绩列
        df_filtered = filter_columns(df)
        #计算 平均分、最高分、最低分
        subjects = list(df_filtered.columns)  # 第一列是学生姓名
        averages = df_filtered.mean().round(2).tolist()
        max_scores = df_filtered.max().tolist()
        min_scores = df_filtered.min().tolist()

        # 构建 ECharts 配置
        option = {
            "title": {"text": "班级成绩分布"},
            "tooltip": {},
            "legend": {"data": ["平均分", "最高分", "最低分"]},
            "xAxis": {"type": "category", "data": subjects},
            "yAxis": {"type": "value"},
            "series": [
                {"name": "平均分", "type": "bar", "data": averages},
                {"name": "最高分", "type": "bar", "data": max_scores},
                {"name": "最低分", "type": "bar", "data": min_scores},
            ],
        }

        return jsonify({'option': option}), 200
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({'error': 'Failed to process file'}), 500

def detect_header_row(file_path, key_columns):
    """
    自动检测实际表头行。
    :param file_path: 文件路径
    :param key_columns: 关键字段列表（例如 ["姓名", "语文", "数学"]）
    :return: DataFrame（解析后的数据）
    """
    df = pd.read_excel(file_path, header=None)  # 不指定表头，全部读取
    for i, row in df.iterrows():
        if all(col in row.values for col in key_columns):
            # 如果该行包含所有关键字段，则认为是表头
            return pd.read_excel(file_path, header=i)  # 从第 i 行作为表头重新读取
    raise ValueError("无法检测到有效的表头")

def filter_columns(df):
    # 自动排除固定列
    columns_to_exclude = ['班名', '级名']
    filtered_columns = [
        col for col in df.columns
        if col not in columns_to_exclude and df[col].dtype in ['float64', 'int64']
    ]
    return df[filtered_columns]

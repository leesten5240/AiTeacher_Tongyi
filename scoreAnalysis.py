import os
import tempfile

import pandas as pd
from openai import OpenAI
from flask import Blueprint, request, jsonify, session
from pathlib import Path

scoreAnalysis_bp = Blueprint('scoreAnalysis', __name__)

@scoreAnalysis_bp.route('/upload_class', methods=['POST'])
def upload_class():
    # 检查文件是否上传
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    return process_class_echarts_data(file)

client = OpenAI(
    api_key="sk-a4156f5fe5db4412a9020740eedf888b",  # 替换为你的API密钥
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# 单个学生成绩上传接口
@scoreAnalysis_bp.route('/upload_student', methods=['POST'])
def upload_student():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    return process_student_echarts_data(file)

@scoreAnalysis_bp.route('/analyze', methods=['POST'])
def analyze():
    # 检查文件上传
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']

    # 创建安全的临时文件路径
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        temp_file_path = temp_file.name
        file.save(temp_file_path)  # 将上传的文件保存到临时路径

    try:
        # Step 1: 上传文件到 DashScope
        file_object = client.files.create(file=Path(temp_file_path), purpose="file-extract")

        # Step 2: 调用文档理解接口
        prompt = f"fileid://{file_object.id}"  # 使用文件 ID 构造系统消息
        messages = [
            {'role': 'system', 'content': prompt},
            {'role': 'user', 'content': '请分析这个文件的内容，并给出详细的成绩分析和改进建议。'}
        ]

        completion = client.chat.completions.create(
            model="qwen-long",  # 模型名称
            messages=messages
        )

        # Step 3: 提取返回结果
        result = completion.choices[0].message.content #completion['choices'][0]['message']['content']

        return jsonify({'analysis': result}), 200
    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({'error': 'Failed to analyze file'}), 500
    finally:
        # 删除临时文件
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

#echart对象生成
def process_class_echarts_data(file):
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
        # 计算 平均分、最高分、最低分
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

def process_student_echarts_data(file):
    if not file.filename.endswith(('.xlsx', '.csv')):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        # 读取文件
        if file.filename.endswith('.xlsx'):
            # 关键字段列表，根据文件的实际内容定义
            key_columns = ["语文", "数学"]
            # 检测表头并读取数据
            df = detect_header_row(file, key_columns)
        else:
            df = pd.read_csv(file)

        # 筛选需要绘图的科目列，排除非成绩列
        columns_to_exclude = ['总分', '班名', '级名']
        filtered_columns = [col for col in df.columns if col not in columns_to_exclude]

        # 构建 ECharts 配置，按科目生成折线图
        series = []
        for col in filtered_columns[1:]:  # 假设第一列是考试日期
            series.append({
                "name": col,
                "type": "line",
                "data": df[col].tolist()
            })

        option = {
            "title": {"text": "学生成绩变化"},
            "tooltip": {"trigger": "axis"},
            "legend": {"data": filtered_columns[1:]},  # 科目名称
            "xAxis": {
                "type": "category",
                "data": df[filtered_columns[0]].tolist()  # 假设第一列是考试日期
            },
            "yAxis": {"type": "value"},
            "series": series,
        }

        return jsonify({'option': option}), 200
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({'error': 'Failed to process file'}), 500

// 页面加载时调用
// window.onload = async function() {
// 	loadAnalysisRecords(); // 加载分析记录
// };
document.addEventListener('DOMContentLoaded', function() {
	loadAnalysisRecords();
});

// 加载分析记录
async function loadAnalysisRecords() {
	const recordListElement = document.getElementById('recordList');
	recordListElement.innerHTML = '<div>加载中...</div>'; // 加载提示

	try {
		const response = await fetch('/analysis_records', {
			method: 'GET',
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('获取分析记录失败:', errorData.error);
			recordListElement.innerHTML = '<div>加载失败，请重试。</div>';
			return;
		}

		const data = await response.json(); // 获取返回的记录数据
		const records = data.records;

		// 清空旧记录
		recordListElement.innerHTML = '';

		if (records.length === 0) {
			recordListElement.innerHTML = '<div>暂无记录</div>';
			return;
		}

		// 动态生成记录按钮
		records.forEach(record => {
			const recordButton = document.createElement('button');
			recordButton.textContent = record.filename; // 按钮显示文件名
			recordButton.className = 'record-button';
			recordButton.onclick = () => loadRecord(record); // 点击加载记录
			recordListElement.appendChild(recordButton);
		});
	} catch (error) {
		console.error('请求失败:', error);
		recordListElement.innerHTML = '<div>加载失败，请检查网络。</div>';
	}
}

// 点击记录按钮时加载记录内容
function loadRecord(record) {
	const chartElement = document.getElementById('chart');
	const analysisResultElement = document.getElementById('analysisResult');
	const analysisType = document.getElementById('analysisType');

	//清空分析
	clearAnalysis();

	//更新action部分内容
	analysisType.value = record.analysis_type;

	//切换只读模式
	actionDisabled();

	// 渲染图表
	const chart = echarts.init(chartElement);
	chart.setOption(JSON.parse(record.chart_option)); // 加载图表配置

	// 显示分析结果
	const markdownContent = record.ai_analysis || '加载中...';
	const htmlContent = marked.parse(markdownContent);
	analysisResultElement.innerHTML = htmlContent;
}

// 清空分析结果以开始新分析
function clearAnalysis() {
	const chartElement = document.getElementById('chart');
	const analysisResultElement = document.getElementById('analysisResult');

	//切换可上传文件状态；
	actionEnabled();

	// 清空图表和分析结果
	const chart = echarts.init(chartElement);
	chart.clear();
	analysisResultElement.innerHTML = '请点击开始分析';
}

function navigateTo(page) {
	if (page === 'home') {
		window.location.href = '/';
	} else if (page === 'scoreAnalysis') {
		window.location.href = '/scoreAnalysis';
	}
}
//切换只读状态
function actionDisabled() {
	const fileInput = document.getElementById('fileInput');
	const analysisType = document.getElementById('analysisType');
	const analyzeButton = document.getElementById('analyzeButton');

	fileInput.disabled = true;
	analysisType.disabled = true;
	analyzeButton.disabled = true;
}

function actionEnabled() {
	const fileInput = document.getElementById('fileInput');
	const analysisType = document.getElementById('analysisType');
	const analyzeButton = document.getElementById('analyzeButton');

	fileInput.disabled = false;
	analysisType.disabled = false;
	analyzeButton.disabled = false;
}

async function startAnalysis() {
	const fileInput = document.getElementById('fileInput');
	const analysisType = document.getElementById('analysisType').value;
	const chartElement = document.getElementById('chart');
	const analysisResultElement = document.getElementById('analysisResult');

	if (!fileInput.files.length) {
		alert('请上传文件');
		return;
	}

	// 禁用按钮，显示加载状态
	analyzeButton.disabled = true;
	analyzeButton.innerText = '分析中...';
	analysisResultElement.innerHTML = '<div class="loading"></div> 分析中……';

	const file = fileInput.files[0];
	const formData = new FormData();
	formData.append('file', file);
	formData.append('analysis_type', analysisType);

	try {
		// 请求绘图数据
		const uploadEndpoint =
			analysisType === 'class' ? '/upload_class' : '/upload_student';
		const chartResponse = await fetch(uploadEndpoint, {
			method: 'POST',
			body: formData,
		});

		if (chartResponse.ok) {
			const responseJson = await chartResponse.json(); // 解析 JSON
			const chartData = responseJson.chart_option; // 提取 chart_option 部分

			// 使用 ECharts 渲染图表
			const chart = echarts.init(chartElement);
			chart.setOption(chartData.option);
			formData.append('chart_option', JSON.stringify(chartData.option));
			currentRecordId = responseJson.record_id; // 保存 record_id
		} else {
			alert('绘图数据请求失败');
			console.error(chartData.error);
			return;
		}

		//刷新分析记录
		loadAnalysisRecords();

		// 请求 AI 分析
		formData.append('record_id', currentRecordId);
		const analysisResponse = await fetch('/analyze', {
			method: 'POST',
			body: formData,
		});

		const analysisData = await analysisResponse.json();

		if (analysisResponse.ok) {
			const markdownContent = analysisData.analysis;
			const htmlContent = marked.parse(markdownContent);
			analysisResultElement.innerHTML = htmlContent;
		} else {
			alert('AI 分析请求失败');
			console.error(analysisData.error);
		}

	} catch (error) {
		console.error('请求失败:', error);
		alert('请求失败，请检查网络或联系管理员');
	} finally {
		// 恢复按钮状态
		analyzeButton.disabled = false;
		analyzeButton.innerText = '分析';
	}
}
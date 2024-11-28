// 页面加载时调用
// window.onload = async function() {
// 	loadAnalysisRecords(); // 加载分析记录
// };
document.addEventListener('DOMContentLoaded', function() {
	loadAnalysisRecords();
	checkLoginStatus();
});

document.getElementById('logout').addEventListener('click', function() {
	fetch('/logout', {
			method: 'POST'
		})
		.then(response => {
			if (response.ok) {
				// 登出成功，跳转到登录页面
				window.location.href = '/auth';
			} else {
				alert('Logout failed.');
			}
		})
		.catch(error => {})
})

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

		// 动态生成记录按钮和删除按钮
		records.forEach(record => {
			const recordContainer = document.createElement('div');
			recordContainer.className = 'record-item';
			recordContainer.dataset.recordId = record.id; // 保存记录 ID

			// 显示记录名称
			const recordButton = document.createElement('div');
			recordButton.textContent = record.filename;
			recordButton.title = record.filename;
			recordButton.className = 'record-button';

			recordContainer.addEventListener('click', (event) => { // 点击加载记录
				const recordId = recordContainer.dataset.recordId;
				loadRecord(recordId, recordContainer);
			})


			// 删除图标按钮
			const deleteIcon = document.createElement('img');
			deleteIcon.src = '/static/images/x.svg'; // 删除图标路径
			deleteIcon.alt = '删除';
			deleteIcon.className = 'delete-icon';
			deleteIcon.onclick = async (e) => {
				e.stopPropagation(); // 阻止冒泡到 recordButton 的点击事件
				if (confirm(`确认删除记录"${record.filename}"吗？`)) {
					await deleteRecord(record.id); // 调用删除接口
					await loadAnalysisRecords(); // 重新加载记录列表
				}

			};

			recordContainer.appendChild(recordButton);
			recordContainer.appendChild(deleteIcon);
			recordListElement.appendChild(recordContainer);

		});
	} catch (error) {
		console.error('请求失败:', error);
		recordListElement.innerHTML = '<div>加载失败，请检查网络。</div>';
	}
}

// 点击记录按钮时加载记录内容
async function loadRecord(recordId, recordElement) {
	const chartElement = document.getElementById('chart');
	const analysisResultElement = document.getElementById('analysisResult');
	const analysisType = document.getElementById('analysisType');

	//清空分析
	clearAnalysis();

	const response = await fetch(`/analysis_record/${recordId}`);
	if (response.ok) {
		const record = await response.json();
		//更新action部分内容
		analysisType.value = record.analysis_type;

		//切换只读模式
		actionDisabled();

		// 渲染图表
		const chart = echarts.init(chartElement);
		chart.setOption(JSON.parse(record.chart_option)); // 加载图表配置

		// 显示分析结果
		if (record.ai_analysis) {
			// 如果已有AI分析结果，直接显示
			const htmlContent = marked.parse(record.ai_analysis);
			analysisResultElement.innerHTML = htmlContent;
		} else {
			// 如果AI分析还没有结果，则显示加载中
			analysisResultElement.innerHTML = '加载中...';
		}

		// 处理选中状态
		const recordListElement = document.getElementById('recordList');
		const recordItems = recordListElement.querySelectorAll('.record-item');
		recordItems.forEach(item => item.classList.remove('active-record')); // 移除所有记录的选中样式

		// 给当前选中的记录添加样式
		if (recordElement) {
			recordElement.classList.add('active-record');
		}
	}
}

// 清空分析结果以开始新分析
function clearAnalysis() {
	const chartElement = document.getElementById('chart');
	const analysisResultElement = document.getElementById('analysisResult');
	const fileInput = document.getElementById('fileInput');
	const analysisTypeSelector = document.getElementById('analysisType');

	//切换可上传文件状态；
	actionEnabled();

	//清空actions
	fileInput.value = '';
	analysisTypeSelector.selectedIndex = 0;


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

		// 立即生成并选中新的分析记录
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
			// 检查当前显示的是否是新生成的记录
			const activeRecord = document.querySelector('.record-item.active-record');
			if (activeRecord && activeRecord.dataset.recordId === String(currentRecordId)) {
				// 如果当前选中的记录是刚刚生成的，才更新分析结果
				analysisResultElement.innerHTML = htmlContent;
			}
		} else {
			alert('AI 分析请求失败');
			console.error(analysisData.error);
		}

	} catch (error) {
		console.error('请求失败:', error);
		alert('请求失败，请检查网络或联系管理员');
	} finally {
		// 恢复按钮文字
		analyzeButton.innerText = '分析';
	}
}

async function deleteRecord(recordId) {
	try {
		// 获取当前选中的记录 ID
		const activeRecord = document.querySelector('.record-item.active-record');

		const response = await fetch('/delete_record', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				record_id: recordId
			}),
		});

		if (response.ok) {
			const data = await response.json();
			alert("删除成功！"); // 显示成功提示

			// 如果删除的是当前选中的记录，清空右侧内容
			if (activeRecord && activeRecord.dataset.recordId === String(recordId)) {
				clearAnalysis(); // 清空图表和分析内容
			}
		} else {
			const errorData = await response.json();
			alert(`删除失败: ${errorData.error}`);
		}
	} catch (error) {
		console.error('删除请求失败:', error);
		alert('删除请求失败，请检查网络或联系管理员。');
	}
}

// 检查用户登录状态
async function checkLoginStatus() {
	const response = await fetch('/check_session', {
		method: 'GET'
	});

	if (response.status === 401) {
		// 未登录，跳转到登录页面
		window.location.href = '/auth';
	} else {
		const data = await response.json();
		console.log(`Welcome, ${data.user}!`);
		const userNameElement = document.getElementById('user-name');
		if (data.logged_in) {
			userNameElement.textContent = data.user; // 假设后端返回的用户名是 data.user.name
		}
	}
}

function newAnalysis() {
	clearAnalysis();
	const recordListElement = document.getElementById('recordList');
	const recordItems = recordListElement.querySelectorAll('.record-item');
	recordItems.forEach(item => item.classList.remove('active-record')); // 移除所有记录的选中样式
}
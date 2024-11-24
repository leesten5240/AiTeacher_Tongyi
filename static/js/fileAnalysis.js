function navigateTo(page) {
	if (page === 'home') {
		window.location.href = '/';
	} else if (page === 'scoreAnalysis') {
		window.location.href = '/scoreAnalysis';
	}
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

	try {
		// 请求绘图数据
		const uploadEndpoint =
			analysisType === 'class' ? '/upload_class' : '/upload_student';
		const chartResponse = await fetch(uploadEndpoint, {
			method: 'POST',
			body: formData,
		});

		const chartData = await chartResponse.json();

		if (chartResponse.ok) {
			// 使用 ECharts 渲染图表
			const chart = echarts.init(chartElement);
			chart.setOption(chartData.option);
		} else {
			alert('绘图数据请求失败');
			console.error(chartData.error);
		}

		// 请求 AI 分析
		const analysisResponse = await fetch('/analyze', {
			method: 'POST',
			body: formData,
		});

		const analysisData = await analysisResponse.json();

		if (analysisResponse.ok) {
			// const markdownContent = analysisData.analysis;
			// const htmlContent = marked(markdownContent);
			// analysisResultElement.innerText = htmlContent;
			analysisResultElement.innerText = analysisData.analysis;
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
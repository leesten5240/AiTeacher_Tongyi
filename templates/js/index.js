document.getElementById('chat-form').addEventListener('submit', function(event) {
	event.preventDefault();
	const text = document.getElementById('text-input').value;
	const fileInput = document.getElementById('image-input');
	const file = fileInput.files[0];
	const imageUrl = document.getElementById('image-url').value;

	const formData = new FormData();
	formData.append('text', text);

	if (file) {
		formData.append('image', file);
	} else if (imageUrl) {
		formData.append('image_url', imageUrl);
	} else {
		alert('Please provide either an image file or an image URL.');
		return;
	}

	fetch('/process', {
			method: 'POST',
			headers: {
				// 不需要设置Content-Type，因为FormData会自动设置
			},
			body: formData
		})
		.then(response => response.json())
		.then(data => {
			if (data.response) {
				document.getElementById('response').innerText = data.response;
			} else {
				document.getElementById('response').innerText = 'Error: ' + data.error;
			}
		})
		.catch(error => {
			console.error('Error:', error);
			document.getElementById('response').innerText = 'Error: ' + error;
		});
});
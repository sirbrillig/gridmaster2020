export function drawLine(context, {
	x1,
	y1,
	x2,
	y2,
	color = 'black',
	width = 1,
	transparency = 1,
	dashed = false,
}) {
	context.save();
	context.beginPath();
	context.strokeStyle = color;
	context.lineWidth = width;
	context.globalAlpha = transparency;
	context.setLineDash(dashed ? [10, 3] : []);
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
	context.restore();
}

export function drawShape(context, shape, { isTemporary, isSelected } = {}) {
	if (shape.type === 'line') {
		drawLine(context, {
			...shape,
			dashed: isTemporary,
			...(isSelected && { color: 'green' }),
		});
		return;
	}
	if (shape.type === 'token') {
		drawCircle(context, {
			...shape,
			dashed: isTemporary,
			...(isSelected && { color: 'green' }),
		});
		return;
	}
}

export function drawCircle(context, {
	x,
	y,
	radius,
	color = 'black',
	transparency = 1,
	dashed = false,
}) {
	context.save();
	context.beginPath();
	context.arc(x, y, radius, 0, Math.PI * 2);
	context.setLineDash(dashed ? [10, 3] : []);
	context.fillStyle = color;
	context.strokeStyle = color;
	context.globalAlpha = transparency;
	if (dashed) {
		context.stroke();
	} else {
		context.fill();
	}
	context.restore();
}

export function drawGrid(context, canvas) {
	const gridSpacing = 80;
	let x1 = gridSpacing;
	let y1 = 0;
	let x2 = gridSpacing;
	let y2 = canvas.height;
	while (x1 <= canvas.width) {
		drawLine(context, { type: 'grid', x1, y1, x2, y2, width: 1, color: '#ddd' });
		x1 += gridSpacing;
		x2 = x1;
	}
	x1 = 0;
	y1 = gridSpacing;
	x2 = canvas.width;
	y2 = gridSpacing;
	while (y1 <= canvas.height) {
		drawLine(context, { type: 'grid', x1, y1, x2, y2, width: 1, color: '#ddd' });
		y1 += gridSpacing;
		y2 = y1;
	}
}

export function clearCanvas(context, canvas) {
	context.fillStyle = 'white';
	context.fillRect(0, 0, canvas.width, canvas.height);
}

const app = document.querySelector('#app');
const main = document.createElement('canvas');
main.width = 1120;
main.height = 1000;
app.appendChild(main);

const context = main.getContext('2d');
let isDrawing = false;
let lineX = 0;
let lineY = 0;
let actionHistory = [];
let activeMode = 'line';
let currentScene = [];

function getScrollOffsetLeft() {
	let element = main;
	let offset = 0;
	while (element.offsetParent) {
		offset += element.offsetLeft;
		element = element.offsetParent;
	}
	return offset;
}

function getScrollOffsetTop() {
	let element = main;
	let offset = 0;
	while (element.offsetParent) {
		offset += element.offsetTop;
		element = element.offsetParent;
	}
	return offset;
}

function getMouseCoordsInCanvas(event) {
	return [
		event.pageX - getScrollOffsetLeft(),
		event.pageY - getScrollOffsetTop(),
	];
}

function handleKeyPress(event) {
	if (isDrawing) {
		return;
	}
	if (event.keyCode === 90 && event.metaKey) {
		// "cmd-z"
		event.preventDefault();
		undoLastLine();
	}
	if (event.keyCode === 76) {
		// "l"
		event.preventDefault();
		activeMode = 'line';
		renderScene();
	}
	if (event.keyCode === 86) {
		// "v"
		event.preventDefault();
		activeMode = 'select';
		renderScene();
	}
}

function undoLastLine() {
	const undoAction = { type: 'undo' };
	actionHistory = [...actionHistory, undoAction];
	renderScene();
}

function handleClickAt(x, y) {
	if (activeMode === 'line') {
		isDrawing = true;
		lineX = x;
		lineY = y;
		return;
	}
	if (activeMode === 'select') {
		// TODO: if there is a line at these coords, make it selected
		currentScene = currentScene.map(line => (line.selected = false));
		const selectedLine = currentScene.find(
			({ x1, y1 }) => x1 === x && y1 === y
		);
		if (selectedLine) {
			selectedLine.selected = true;
		}
		renderScene();
	}
}

function handleMoveMouseAt(x, y) {
	if (!isDrawing) {
		return;
	}
	const newLine = {
		type: 'line',
		x1: lineX,
		y1: lineY,
		x2: x,
		y2: y,
		color: 'green',
		temporary: true,
		width: 4,
	};
	actionHistory = [...actionHistory.filter(line => !line.temporary), newLine];
	renderScene();
}

function handleCancelDraw() {
	if (!isDrawing) {
		return;
	}
	isDrawing = false;
	actionHistory = actionHistory.filter(line => !line.temporary);
	renderScene();
}

function handleReleaseMouseAt(x, y) {
	if (!isDrawing) {
		return;
	}
	isDrawing = false;
	const newLine = {
		type: 'line',
		x1: lineX,
		y1: lineY,
		x2: x,
		y2: y,
		color: 'black',
		width: 3,
	};
	actionHistory = [...actionHistory.filter(line => !line.temporary), newLine];
	renderScene();
}

function renderScene() {
	clearCanvas();
	drawGrid();
	currentScene = actionHistory.reduce(applyAction, []).filter(x => x);
	currentScene.map(renderAction);
}

function applyAction(prevActions, action) {
	if (action.type === 'line') {
		return [...prevActions, action];
	}
	if (action.type === 'undo') {
		return prevActions.slice(0, prevActions.length - 1);
	}
	return prevActions;
}

function renderAction(action) {
	drawLine(action);
	if (activeMode === 'select') {
		drawSelectMarker(action);
	}
	if (action.selected) {
		drawLine({ ...action, color: 'red', width: 5 });
	}
}

function clearCanvas() {
	context.fillStyle = 'white';
	context.fillRect(0, 0, main.width, main.height);
}

function drawLine({ x1, y1, x2, y2, color = 'black', width = 1 }) {
	context.beginPath();
	context.strokeStyle = color;
	context.lineWidth = width;
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
}

function drawSelectMarker({ x1, y1 }) {
	const marker = new Path2D();
	context.strokeStyle = 'black';
	context.lineWidth = 5;
	context.fillStyle = 'green';
	marker.arc(x1, y1, 10, 0, 2 * Math.PI);
	context.fill(marker);
	context.stroke();
}

function drawGrid() {
	const gridSpacing = 80;
	let x1 = gridSpacing;
	let y1 = 0;
	let x2 = gridSpacing;
	let y2 = main.height;
	while (x1 <= main.width) {
		drawLine({ type: 'grid', x1, y1, x2, y2, width: 1, color: '#ddd' });
		x1 += gridSpacing;
		x2 = x1;
	}
	x1 = 0;
	y1 = gridSpacing;
	x2 = main.width;
	y2 = gridSpacing;
	while (y1 <= main.height) {
		drawLine({ type: 'grid', x1, y1, x2, y2, width: 1, color: '#ddd' });
		y1 += gridSpacing;
		y2 = y1;
	}
}

function init() {
	main.addEventListener('mousedown', event =>
		handleClickAt(...getMouseCoordsInCanvas(event))
	);

	main.addEventListener('mouseout', () => handleCancelDraw());

	main.addEventListener('mousemove', event =>
		handleMoveMouseAt(...getMouseCoordsInCanvas(event))
	);

	main.addEventListener('mouseup', event =>
		handleReleaseMouseAt(...getMouseCoordsInCanvas(event))
	);

	document.addEventListener('keydown', event => handleKeyPress(event));

	drawGrid();
}

init();

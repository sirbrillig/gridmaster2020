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
	if (event.key === 'z' && event.metaKey) {
		// "cmd-z"
		event.preventDefault();
		undoLastAction();
		renderScene();
	}
	if (event.key === 'l' && activeMode !== 'line') {
		event.preventDefault();
		activeMode = 'line';
		renderScene();
	}
	if (event.key === 'v' && activeMode !== 'select') {
		event.preventDefault();
		activeMode = 'select';
		renderScene();
	}
	if (event.key === 'Backspace' && activeMode === 'select') {
		event.preventDefault();
		removeSelected();
		renderScene();
	}
}

function undoLastAction() {
	actionHistory = [...actionHistory, { type: 'undo' }];
}

function removeSelected() {
	actionHistory = [...actionHistory, { type: 'delete' }];
}

function handleClickAt(x, y) {
	if (activeMode === 'line') {
		isDrawing = true;
		lineX = x;
		lineY = y;
		return;
	}
	if (activeMode === 'select') {
		// If there is a line at these coords, make it selected
		const selectedLine = currentScene.find(line =>
			doesPointTouchLine({ x, y }, line)
		);
		if (selectedLine) {
			console.log('selectedLine', selectedLine);
			actionHistory = [
				...actionHistory,
				{ type: 'select', selected: selectedLine },
			];
			renderScene();
		}
	}
}

function areLinesSame(line1, line2) {
	return (
		line1.x1 === line2.x1 &&
		line1.x2 === line2.x2 &&
		line1.y1 === line2.y1 &&
		line1.y2 === line2.y2
	);
}

function doesPointTouchLine({ x, y }, { x1, y1, x2, y2 }) {
	const t =
		((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) /
		((x2 - x1) ** 2 + (y2 - y1) ** 2);
	const footX = x1 + t * (x2 - x1);
	const footY = y1 + t * (y2 - y1);
	const distanceToFoot = Math.sqrt((footX - x) ** 2 + (footY - y) ** 2);
	if (0 <= t && t <= 1 && distanceToFoot <= 10) {
		return true;
	}
	return false;
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
	const modifiedHistory = actionHistory.reduce(applyHistoryAction, []);
	currentScene = modifiedHistory.reduce(applyAction, []).filter(x => x);
	console.log(
		'rendering scene',
		currentScene,
		'from actions',
		modifiedHistory,
		'and original actions',
		actionHistory
	);
	currentScene.map(renderAction);
}

function applyHistoryAction(prevActions, action) {
	if (action.type === 'undo') {
		console.log('undoing', prevActions[prevActions.length - 1]);
		return prevActions.slice(0, prevActions.length - 1);
	}
	return [...prevActions, action];
}

function applyAction(prevActions, action) {
	if (action.type === 'line') {
		return [...prevActions, action];
	}
	if (action.type === 'select') {
		return prevActions.map(prev => {
			if (prev.type !== 'line') {
				return prev;
			}
			if (areLinesSame(prev, action.selected)) {
				return { ...prev, selected: true };
			}
			return { ...prev, selected: false };
		});
	}
	if (action.type === 'delete') {
		return prevActions.filter(prev => (prev.selected === true ? false : true));
	}
	return prevActions;
}

function renderAction(action) {
	if (activeMode === 'select' && action.selected) {
		drawLine({ ...action, color: 'red', width: 5 });
		return;
	}
	drawLine(action);
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

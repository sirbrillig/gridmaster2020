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
let previousMode = 'line';
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
		return;
	}
	if (event.key === 't' && activeMode !== 'token') {
		event.preventDefault();
		previousMode = activeMode;
		activeMode = 'token';
		renderScene();
		return;
	}
	if (event.key === 'l' && activeMode !== 'line') {
		event.preventDefault();
		previousMode = activeMode;
		activeMode = 'line';
		renderScene();
		return;
	}
	if (event.key === 'v' && activeMode === 'select') {
		event.preventDefault();
		activeMode = previousMode;
		renderScene();
		return;
	}
	if (event.key === 'v' && activeMode !== 'select') {
		event.preventDefault();
		previousMode = activeMode;
		activeMode = 'select';
		renderScene();
		return;
	}
	if (event.key === 'Backspace' && activeMode === 'select') {
		event.preventDefault();
		removeSelected();
		renderScene();
		return;
	}
}

function undoLastAction() {
	addAction({ type: 'undo' });
}

function removeSelected() {
	addAction({ type: 'delete' });
}

function handleClickAt(x, y) {
	if (activeMode === 'line') {
		isDrawing = true;
		lineX = x;
		lineY = y;
		return;
	}
	if (activeMode === 'token') {
		isDrawing = true;
		addAction({
			type: 'token',
			x,
			y,
			radius: 30,
			color: 'green',
			temporary: true,
		});
		renderScene();
		return;
	}
	const selectedShape = currentScene.find(shape => shape.selected);
	if (
		activeMode === 'select' &&
		selectedShape &&
		doesPointTouchShape({ x, y }, selectedShape)
	) {
		// Move selected shape
		isDrawing = true;
		// TODO: generalize to other shapes
		addAction({
			type: 'token',
			x,
			y,
			radius: 30,
			color: 'green',
			temporary: true,
		});
		renderScene();
		return;
	}
	if (activeMode === 'select') {
		// If there is a line at these coords, make it selected
		const touchedShape = currentScene.find(shape =>
			doesPointTouchShape({ x, y }, shape)
		);
		if (touchedShape) {
			addAction({ type: 'select', selected: touchedShape });
			renderScene();
		}
		return;
	}
}

function areShapesSame(shape1, shape2) {
	if (shape1.type === 'line' && shape2.type === 'line') {
		return areLinesSame(shape1, shape2);
	}
	if (shape1.type === 'token' && shape2.type === 'token') {
		return areCirclesSame(shape1, shape2);
	}
	return false;
}

function areCirclesSame(circle1, circle2) {
	return (
		circle1.x === circle2.x &&
		circle1.y === circle2.y &&
		circle1.radius === circle2.radius
	);
}

function areLinesSame(line1, line2) {
	return (
		line1.x1 === line2.x1 &&
		line1.x2 === line2.x2 &&
		line1.y1 === line2.y1 &&
		line1.y2 === line2.y2
	);
}

function doesPointTouchShape(point, shape) {
	if (shape.type === 'line') {
		return doesPointTouchLine(point, shape);
	}
	if (shape.type === 'token') {
		return doesPointTouchCircle(point, shape);
	}
	return false;
}

function doesPointTouchCircle({ x, y }, { x: circleX, y: circleY, radius }) {
	return (x - circleX) ** 2 + (y - circleY) ** 2 < radius ** 2;
}

function doesPointTouchLine({ x, y }, { x1, y1, x2, y2 }) {
	const t =
		((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) /
		((x2 - x1) ** 2 + (y2 - y1) ** 2);
	const footX = x1 + t * (x2 - x1);
	const footY = y1 + t * (y2 - y1);
	const distanceToFoot = Math.sqrt((footX - x) ** 2 + (footY - y) ** 2);
	// Uncomment this to view the foot
	// drawLine({x1: x, y1: y, x2: footX, y2: footY, color: 'orange', width: 3});
	if (0 <= t && t <= 1 && distanceToFoot <= 10) {
		return true;
	}
	return false;
}

function handleMoveMouseAt(x, y) {
	if (!isDrawing) {
		return;
	}
	if (activeMode === 'line') {
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
		addAction(newLine);
		renderScene();
		return;
	}
	if (activeMode === 'token') {
		addAction({
			type: 'token',
			x,
			y,
			radius: 30,
			color: 'green',
			temporary: true,
		});
		renderScene();
		return;
	}
	const selectedShape = currentScene.find(shape => shape.selected);
	if (activeMode === 'select' && selectedShape) {
		// TODO: generalize to other shapes
		addAction({
			type: 'token',
			x,
			y,
			radius: 30,
			color: 'green',
			temporary: true,
		});
		renderScene();
		return;
	}
}

function handleCancelDraw() {
	if (!isDrawing) {
		return;
	}
	isDrawing = false;
	actionHistory = actionHistory.filter(action => !action.temporary);
	renderScene();
}

function handleReleaseMouseAt(x, y) {
	if (!isDrawing) {
		return;
	}
	if (activeMode === 'line') {
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
		addAction(newLine);
		renderScene();
		return;
	}
	if (activeMode === 'token') {
		isDrawing = false;
		addAction({ type: 'token', x, y, radius: 30, color: 'black' });
		renderScene();
		return;
	}
	const selectedShape = currentScene.find(shape => shape.selected);
	if (activeMode === 'select' && selectedShape) {
		isDrawing = false;
		addAction({ type: 'token', x, y, radius: 30, color: 'black' });
		renderScene();
		return;
	}
}

function renderScene() {
	clearCanvas();
	drawGrid();
	const modifiedHistory = actionHistory.reduce(applyActionToActions, []);
	currentScene = modifiedHistory.reduce(applyAction, []).filter(x => x);
	console.log(
		'rendering scene',
		currentScene,
		'from actions',
		modifiedHistory,
		'and original actions',
		actionHistory
	);
	currentScene.map(renderDrawCommand);
}

/**
 * Apply an action to create or modify the stack of actions
 *
 * This function is called as a reducer with a stack of actions. It should
 * return a stack of actions for use by `applyAction`.
 */
function applyActionToActions(prevActions, action) {
	if (action.type === 'undo') {
		return prevActions.slice(0, prevActions.length - 1);
	}
	return [...prevActions, action];
}

/**
 * Apply an action to create or modify the stack of draw commands
 *
 * This function is called as a reducer with a stack of actions. It should
 * return a stack of draw commands for use by `renderDrawCommand`.
 */
function applyAction(drawCommands, action) {
	if (action.type === 'line' || action.type === 'token') {
		return [...drawCommands, action];
	}
	if (action.type === 'select') {
		return drawCommands.map(prev => {
			if (areShapesSame(prev, action.selected)) {
				return { ...prev, selected: true };
			}
			return { ...prev, selected: false };
		});
	}
	if (action.type === 'delete') {
		return drawCommands.filter(prev => (prev.selected === true ? false : true));
	}
	return drawCommands;
}

function addAction(action) {
	actionHistory = [
		...actionHistory.filter(action => !action.temporary),
		action,
	];
}

function renderDrawCommand(drawCommand) {
	if (activeMode === 'select' && drawCommand.selected) {
		drawShape(drawCommand, { isSelectable: false, isSelected: true });
		return;
	}
	drawShape(drawCommand, {
		isSelectable: activeMode === 'select',
		isSelected: false,
	});
}

function clearCanvas() {
	context.fillStyle = 'white';
	context.fillRect(0, 0, main.width, main.height);
}

function drawShape(shape, { isSelectable, isSelected } = {}) {
	if (shape.type === 'line') {
		drawLine(isSelected ? { ...shape, color: 'red', width: 5 } : shape);
		if (isSelectable) {
			drawLine({ ...shape, color: 'lightblue', width: 2 });
		}
		return;
	}
	if (shape.type === 'token') {
		drawCircle(isSelected ? { ...shape, color: 'red' } : shape);
		if (isSelectable) {
			drawCircle({ ...shape, color: 'lightblue', radius: 5 });
		}
		return;
	}
}

function drawCircle({ x, y, radius, color = 'black' }) {
	context.beginPath();
	context.arc(x, y, radius, 0, Math.PI * 2);
	context.fillStyle = color;
	context.fill();
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

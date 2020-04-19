import { drawGrid, drawShape, clearCanvas } from './drawing';

const app = document.querySelector('#app');
const toolPanel = document.createElement('section');
const main = document.createElement('canvas');
main.width = 1120;
main.height = 1000;
const selectToolButton = document.createElement('input');
selectToolButton.type = 'radio';
selectToolButton.name = 'activeTool';
selectToolButton.id = 'select-tool-button';
const selectToolLabel = document.createElement('label');
selectToolLabel.htmlFor = 'select-tool-button';
selectToolLabel.innerText = 'Select';
const lineToolButton = document.createElement('input');
lineToolButton.type = 'radio';
lineToolButton.name = 'activeTool';
lineToolButton.id = 'line-tool-button';
lineToolButton.checked = true;
const lineToolLabel = document.createElement('label');
lineToolLabel.htmlFor = 'line-tool-button';
lineToolLabel.innerText = 'Line';
const tokenToolButton = document.createElement('input');
tokenToolButton.type = 'radio';
tokenToolButton.name = 'activeTool';
tokenToolButton.id = 'token-tool-button';
const tokenToolLabel = document.createElement('label');
tokenToolLabel.htmlFor = 'token-tool-button';
tokenToolLabel.innerText = 'Token';
app.appendChild(toolPanel);
toolPanel.appendChild(selectToolLabel);
toolPanel.appendChild(selectToolButton);
toolPanel.appendChild(lineToolLabel);
toolPanel.appendChild(lineToolButton);
toolPanel.appendChild(tokenToolLabel);
toolPanel.appendChild(tokenToolButton);
app.appendChild(main);

const context = main.getContext('2d');
let isDrawing = false;
let selectedShape = null;
let lineX = 0;
let lineY = 0;
let actionHistory = [];
let temporaryActionHistory = [];
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

function changeModeTo(mode) {
	console.log('changing mode from', activeMode, 'to', mode);
	previousMode = activeMode;
	activeMode = mode;
	selectedShape = null;
	switch (activeMode) {
		case 'select':
			selectToolButton.checked = true;
			break;
		case 'line':
			lineToolButton.checked = true;
			break;
		case 'token':
			tokenToolButton.checked = true;
			break;
	}
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
		changeModeTo('token');
		renderScene();
		return;
	}
	if (event.key === 'l' && activeMode !== 'line') {
		event.preventDefault();
		changeModeTo('line');
		renderScene();
		return;
	}
	if (event.key === 'v' && activeMode === 'select') {
		event.preventDefault();
		changeModeTo(previousMode);
		renderScene();
		return;
	}
	if (event.key === 'v' && activeMode !== 'select') {
		event.preventDefault();
		changeModeTo('select');
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
	console.log('undoing action');
	addAction({ type: 'undo' });
}

function removeSelected() {
	if (!selectedShape) {
		return;
	}
	console.log('removing selected shape');
	addAction({ type: 'delete', shape: selectedShape });
}

function handleClickAt(x, y) {
	console.log('heard click at', x, y);
	if (activeMode === 'line') {
		console.log('starting line');
		isDrawing = true;
		lineX = x;
		lineY = y;
		return;
	}
	if (activeMode === 'token') {
		isDrawing = true;
		console.log('creating token');
		addAction({
			type: 'token',
			x,
			y,
			radius: 30,
			temporary: true,
		});
		renderScene();
		return;
	}
	if (activeMode === 'select') {
		// If there is a line at these coords, make it selected
		const touchedShape = currentScene.find((shape) =>
			doesPointTouchShape({ x, y }, shape)
		);
		if (touchedShape) {
			isDrawing = true;
			selectedShape = touchedShape;
			console.log('selecting shape', touchedShape);
			renderScene();
		}
		return;
	}
}

function areShapesSame(shape1, shape2) {
	if (!shape1 || !shape2) {
		return false;
	}
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
		addTemporaryAction({
			type: 'drawing-line',
			x1: lineX,
			y1: lineY,
			x2: x,
			y2: y,
			width: 3,
		});
		renderScene();
		return;
	}
	if (activeMode === 'token') {
		addAction({
			type: 'token',
			x,
			y,
			radius: 30,
			temporary: true,
		});
		renderScene();
		return;
	}
	if (activeMode === 'select' && selectedShape) {
		if (selectedShape.type !== 'token') {
			// TODO: support moving lines
			renderScene();
			return;
		}
		addTemporaryAction({
			type: 'move-in-progress',
			x,
			y,
			shape: selectedShape,
		});
		renderScene();
		return;
	}
}

function handleCancelDraw() {
	if (!isDrawing) {
		return;
	}
	console.log('cancelling draw');
	isDrawing = false;
	clearTemporaryActions();
	actionHistory = actionHistory.filter((action) => !action.temporary);
	renderScene();
}

function handleReleaseMouseAt(x, y) {
	if (!isDrawing) {
		return;
	}
	isDrawing = false;
	clearTemporaryActions();
	if (activeMode === 'line') {
		console.log('finishing line');
		addAction({
			type: 'finish-line',
			x1: lineX,
			y1: lineY,
			x2: x,
			y2: y,
			width: 3,
		});
		renderScene();
		return;
	}
	if (activeMode === 'token') {
		console.log('finishing token');
		addAction({ type: 'token', x, y, radius: 30, color: 'black' });
		renderScene();
		return;
	}
	if (activeMode === 'select' && selectedShape) {
		if (selectedShape.type !== 'token') {
			// TODO: support moving lines
			renderScene();
			return;
		}
		if (areShapesSame(selectedShape, moveShapeTo({ ...selectedShape }, x, y))) {
			console.log('no actual movement');
			renderScene();
			return;
		}
		console.log('finishing token move');
		addAction({ type: 'move-complete', x, y, shape: selectedShape });
		renderScene();
		return;
	}
}

function renderScene() {
	setCursorTo(
		activeMode === 'select' ? (isDrawing ? 'grabbing' : 'grab') : 'auto'
	);
	clearCanvas(context, main);
	drawGrid(context, main);
	const modifiedHistory = actionHistory.reduce(applyActionToActions, []);
	currentScene = modifiedHistory.reduce(applyAction, []);
	currentScene = temporaryActionHistory
		.reduce(applyAction, currentScene)
		.filter((x) => x);
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
	if (action.type === 'drawing-line') {
		return [
			...drawCommands.filter((prev) => !prev.temporary),
			{ ...action, type: 'line', temporary: true },
		];
	}
	if (action.type === 'finish-line') {
		return [...drawCommands, { ...action, type: 'line' }];
	}
	if (action.type === 'drawing-token') {
		return [
			...drawCommands.filter((prev) => !prev.temporary),
			{ ...action, type: 'token', temporary: true },
		];
	}
	if (action.type === 'move-in-progress') {
		return [
			...drawCommands
				.filter((prev) => !prev.temporary)
				.filter((prev) => (areShapesSame(prev, action.shape) ? false : true)),
			moveShapeTo({ ...action.shape, temporary: true }, action.x, action.y),
		];
	}
	if (action.type === 'line' || action.type === 'token') {
		return [...drawCommands, action];
	}
	if (action.type === 'delete') {
		return drawCommands.filter((prev) =>
			areShapesSame(prev, action.shape) ? false : true
		);
	}
	if (action.type === 'move-complete') {
		return [
			...drawCommands
				.filter((prev) => !prev.temporary)
				.filter((prev) => (areShapesSame(prev, action.shape) ? false : true)),
			moveShapeTo({ ...action.shape }, action.x, action.y),
		];
	}
	return drawCommands;
}

function moveShapeTo(shape, x, y) {
	if (shape.type === 'token') {
		return { ...shape, x, y };
	}
	if (shape.type === 'line') {
		return { ...shape, x1: x, y1: y };
	}
}

function addAction(action) {
	console.log('adding action', action);
	actionHistory = [
		...actionHistory.filter((action) => !action.temporary),
		action,
	];
}

function addTemporaryAction(action) {
	console.log('adding temporary action', action);
	temporaryActionHistory.push(action);
}

function clearTemporaryActions() {
	temporaryActionHistory = [];
}

function renderDrawCommand(drawCommand) {
	drawShape(context, drawCommand, {
		isTemporary: drawCommand.temporary,
		isSelected: areShapesSame(selectedShape, drawCommand),
	});
}

function setCursorTo(type) {
	main.style.cursor = type;
}

function init() {
	main.addEventListener('mousedown', (event) =>
		handleClickAt(...getMouseCoordsInCanvas(event))
	);

	main.addEventListener('mouseout', () => handleCancelDraw());

	main.addEventListener('mousemove', (event) =>
		handleMoveMouseAt(...getMouseCoordsInCanvas(event))
	);

	main.addEventListener('mouseup', (event) =>
		handleReleaseMouseAt(...getMouseCoordsInCanvas(event))
	);

	selectToolButton.addEventListener('click', () => changeModeTo('select'));
	lineToolButton.addEventListener('click', () => changeModeTo('line'));
	tokenToolButton.addEventListener('click', () => changeModeTo('token'));

	document.addEventListener('keydown', (event) => handleKeyPress(event));

	drawGrid(context, main);
}

init();

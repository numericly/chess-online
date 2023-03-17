<script lang="ts">
	import type { Color, Team } from '$lib/game';
	import { onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { Game, BoardPosition, Piece, Move, type VisualBoard } from '../game';
	import BlackKing from '../images/bk.svg';
	import BlackQueen from '../images/bq.svg';
	import BlackRook from '../images/br.svg';
	import BlackBishop from '../images/bb.svg';
	import BlackKnight from '../images/bn.svg';
	import BlackPawn from '../images/bp.svg';

	import WhiteKing from '../images/wk.svg';
	import WhiteQueen from '../images/wq.svg';
	import WhiteRook from '../images/wr.svg';
	import WhiteBishop from '../images/wb.svg';
	import WhiteKnight from '../images/wn.svg';
	import WhitePawn from '../images/wp.svg';

	export let selected_piece: Writable<BoardPosition | undefined>;

	export let position: BoardPosition;
	export let board: VisualBoard;
	export let game: Game;
	export let legal_moves: Set<String>;
	export let team: Team;

	const image_map = {
		white: {
			king: WhiteKing,
			queen: WhiteQueen,
			rook: WhiteRook,
			bishop: WhiteBishop,
			knight: WhiteKnight,
			pawn: WhitePawn
		},
		black: {
			king: BlackKing,
			queen: BlackQueen,
			rook: BlackRook,
			bishop: BlackBishop,
			knight: BlackKnight,
			pawn: BlackPawn
		}
	};
	let piece: Piece | null = null;
	let dragging: undefined | [number, number];
	let squareColor: Color = (position.x + position.y) % 2 === 0 ? 'white' : 'black';

	$: game, registerListener();

	function registerListener() {
		game.on('move', onBoardUpdate);
		onBoardUpdate();
	}

	function getPosition(dragging: undefined | [number, number]): string {
		let x = board.offset.left + position.x * (board.size.width / 8);
		let y = board.offset.top + position.y * (board.size.height / 8);

		if (dragging !== undefined) {
			x += dragging[0];
			y += dragging[1];
		}

		return `top: ${y + 2}px;left: ${x + 2}px;`;
	}

	function onBoardUpdate() {
		piece = game.pieceAt(position);
	}

	function handleMouseMovement(e: MouseEvent) {
		if (dragging === undefined) return;
		if (e.movementX === 0 && e.movementY === 0) return;
		dragging = [dragging[0] + e.movementX, dragging[1] + e.movementY];
	}

	function handleMouseUp() {
		if (dragging === undefined) return;
		if (piece === null) return;

		window.removeEventListener('mousemove', handleMouseMovement);
		window.removeEventListener('mouseup', handleMouseUp);

		let x = Math.round(dragging[0] / (board.size.width / 8));
		let y = Math.round(dragging[1] / (board.size.height / 8));

		dragging = undefined;

		let from = new BoardPosition(position.x, position.y);

		if (position.x + x < 0 || position.x + x > 7) return;
		if (position.y + y < 0 || position.y + y > 7) return;

		let to = new BoardPosition(position.x + x, position.y + y);

		if (from.equals(to)) return;

		let move = new Move(from, to);

		game.makeMove(move, { user_generated: true });
	}

	function handleMouseDown(e: MouseEvent) {
		if (piece === null) return;
		if (game.turn !== piece.color) return;

		if (!canMove(piece)) return;

		let x = board.offset.left + position.x * (board.size.width / 8) + board.size.width / 8 / 2;
		let y = board.offset.top + position.y * (board.size.height / 8) + board.size.width / 8 / 2;

		dragging = [e.pageX - x, e.pageY - y];

		selected_piece.set(position);

		window.addEventListener('mousemove', handleMouseMovement);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function canMove(piece: Piece): boolean {
		if (piece.color === 'white' && (team === 'black' || team === 'spectator')) return false;
		if (piece.color === 'black' && (team === 'white' || team === 'spectator')) return false;
		if (game.turn !== piece.color) return false;
		return true;
	}

	onDestroy(() => {
		window.removeEventListener('mousemove', handleMouseMovement);
		window.removeEventListener('mouseup', handleMouseUp);
		game.removeListener('move', onBoardUpdate);
	});
</script>

<div class="square-container z-0 {squareColor === 'white' ? 'bg-white-square' : 'bg-black-square'}">
	{#if legal_moves.has(position.toFen())}
		{#if piece !== null}
			<div
				class="absolute z-1 rounded-full w-[90%] h-[90%] opacity-30 {squareColor === 'white'
					? 'border-black-square'
					: 'border-white-square'}"
				style="
					border-width: {board.size.width / 12 / 7.5}px;
					width: {board.size.width / 8}px; 
					height: {board.size.height / 8}px;
					{getPosition(dragging)}
				"
			/>
		{:else}
			<div
				class="relative rounded-full w-1/4 h-1/4 
				{squareColor === 'white' ? 'bg-black-square' : 'bg-white-square'}
			"
			/>
		{/if}
	{/if}
	{#if piece !== null && dragging === undefined}
		<img
			src={image_map[piece.color][piece.type]}
			class="select-none z-[2] w-full h-full {canMove(piece)
				? 'cursor-grab'
				: ''} {$selected_piece?.equals(position) ? 'drop-shadow-[0_3px_3px_#0007]' : ''}"
			alt={piece.toString()}
			on:dragstart={(event) => {
				event.preventDefault();
			}}
			on:mousedown={handleMouseDown}
		/>
	{/if}
</div>
{#if piece !== null && dragging}
	<img
		src={image_map[piece.color][piece.type]}
		class="select-none absolute {$selected_piece?.equals(position)
			? 'drop-shadow-[0_3px_3px_#0007]'
			: ''} cursor-grabbing z-10"
		style="width: {board.size.width / 8}px;height: {board.size.height / 8}px;{getPosition(
			dragging
		)}"
		alt={piece.toString()}
		on:dragstart={(event) => {
			event.preventDefault();
		}}
	/>
{/if}

<style>
	.square-container {
		@apply aspect-square flex content-center items-center justify-center;
	}
</style>

<script lang="ts">
	import { Team } from '$lib/game';
	import { onDestroy } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { Game, BoardPosition, Color, Piece, Move, type VisualBoard } from './game';

	export let position: BoardPosition;
	export let board: VisualBoard;
	export let game: Game;
	export let legal_moves: Set<String>;
	export let team: Team;

	export let selected_piece: Writable<BoardPosition | undefined>;
	let { board: game_board } = game;
	let piece: Piece | undefined;

	$: piece = $game_board[position.y][position.x];

	let dragging: undefined | [number, number];
	let squareColor: Color = (position.x + position.y) % 2 === 0 ? Color.White : Color.Black;

	function getPosition(dragging: undefined | [number, number]): string {
		let x = board.offset.left + position.x * (board.size.width / 8);
		let y = board.offset.top + position.y * (board.size.height / 8);

		if (dragging !== undefined) {
			x += dragging[0];
			y += dragging[1];
		}

		return `top: ${y + 2}px;left: ${x + 2}px;`;
	}

	function handleMouseMovement(e: MouseEvent) {
		if (dragging === undefined) return;
		if (e.movementX === 0 && e.movementY === 0) return;
		dragging = [dragging[0] + e.movementX, dragging[1] + e.movementY];
	}

	function handleMouseUp() {
		if (dragging === undefined) return;
		if (piece === undefined) return;

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

		let valid_pos = game.getMoves(piece, position).find((pos) => {
			return pos.equals(move.to);
		});

		if (valid_pos === undefined) return;

		game.makeMove(move);
	}

	function handleMouseDown(e: MouseEvent) {
		if (piece === undefined) return;
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
		if (piece.color === Color.White && (team === Team.Black || team === Team.Spectator))
			return false;
		if (piece.color === Color.Black && (team === Team.White || team === Team.Spectator))
			return false;
		if (game.turn !== piece.color) return false;
		return true;
	}

	onDestroy(() => {
		window.removeEventListener('mousemove', handleMouseMovement);
		window.removeEventListener('mouseup', handleMouseUp);
	});
</script>

<div
	class="square-container z-0 {squareColor === Color.White ? 'bg-white-square' : 'bg-black-square'}"
>
	{#if legal_moves.has(position.toFen())}
		{#if piece !== undefined}
			<div
				class="absolute z-1 rounded-full w-[90%] h-[90%] opacity-30 {squareColor === Color.White
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
				{squareColor === Color.White ? 'bg-black-square' : 'bg-white-square'}
			"
			/>
		{/if}
	{/if}
	{#if piece !== undefined && dragging === undefined}
		<img
			src={piece.image()}
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
{#if piece !== undefined && dragging}
	<img
		src={piece.image()}
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

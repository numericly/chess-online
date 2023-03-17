<script lang="ts">
	import { BoardPosition, Game, type VisualBoard } from '$lib/game';
	import SquareComponent from './SquareComponent.svelte';
	import { writable, type Writable } from 'svelte/store';
	import type { Team } from '$lib/game';

	export let team: Team;
	export let game: Game;
	export let size: string;

	let legal_moves = new Set<string>();
	let board_component: HTMLDivElement | undefined;
	let board: VisualBoard | undefined;
	let selected_piece: Writable<BoardPosition | undefined> = writable(undefined);

	$: game, registerListener();
	$: onResize(board_component);
	$: onPieceSelected($selected_piece);

	function registerListener() {
		function onBoardUpdate() {
			selected_piece.set(undefined);
			legal_moves = new Set();
		}
		game.on('move', onBoardUpdate);
		onBoardUpdate();
	}

	function onResize(board_component: HTMLDivElement | undefined) {
		if (board_component !== undefined) {
			board = {
				offset: {
					top: board_component.offsetTop,
					left: board_component.offsetLeft
				},
				size: {
					width: board_component.clientWidth,
					height: board_component.clientHeight
				}
			};
		}
	}

	function onPieceSelected(pos: BoardPosition | undefined) {
		if (pos === undefined) {
			legal_moves = new Set();
			return;
		}
		let selected_piece = game.pieceAt(pos);
		if (selected_piece !== null) {
			legal_moves = game.getMoves(selected_piece, pos).reduce((moves, move) => {
				moves.add(move.toFen());
				return moves;
			}, new Set<string>());
		}
	}
</script>

<svelte:window
	on:resize={() => {
		onResize(board_component);
	}}
/>

<div class="board" style="width: {size};height: {size};" bind:this={board_component}>
	{#if board !== undefined}
		{#each Array(8) as _, y}
			{#each Array(8) as _, x}
				<SquareComponent
					position={new BoardPosition(x, y)}
					{selected_piece}
					{legal_moves}
					{board}
					{team}
					{game}
				/>
			{/each}
		{/each}
	{/if}
</div>

<style>
	.board {
		@apply grid grid-cols-8 rounded-xl overflow-hidden border-base-200 border-2 shadow-lg;
	}
</style>

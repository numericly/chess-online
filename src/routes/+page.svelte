<script lang="ts">
	import type { ClientToServerEvents, ServerToClientEvents } from '$lib/server/server';
	import type { PageData } from './$types';
	import { io, Socket } from 'socket.io-client';
	import { Game, Move } from './game';
	import { Team } from '$lib/game';
	import Board from './Board.svelte';
	import { assets } from '$app/paths';
	import { get } from 'svelte/store';

	export let data: PageData;

	let connection: Socket<ServerToClientEvents, ClientToServerEvents> = io();

	connection.emit('hello', 42);

	let game = Game.default();
	let team = Team.Both;

	let { moves } = game;

	$: $moves, onMove();

	var wasmSupported =
		typeof WebAssembly === 'object' &&
		WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

	var stockfish = new Worker(
		wasmSupported ? `${assets}/stockfish.wasm.js` : `${assets}/stockfish.js`
	);

	stockfish.addEventListener('message', function (e) {
		const words = e.data.split(' ');
		if (words[0] === 'Total' && words[1] === 'evaluation:') {
			console.log('Eval', parseFloat(words[2]));
		} else if (words[0] === 'bestmove') {
			console.log(words[1]);
			game.makeMove(Move.fromFen(words[1]));
		}
	});

	function onMove() {
		stockfish.postMessage(
			'position startpos moves ' +
				get(moves).reduce((moves, move) => {
					moves += move.toFen() + ' ';
					return moves;
				}, '')
		);
		stockfish.postMessage('eval');
		stockfish.postMessage('go depth 12');
	}

	stockfish.postMessage('uci');
</script>

<!-- <div class="modal modal-open">
	<div class="modal-box">
		<p class="py-4">
			You've been selected for a chance to get one year of subscription to use Wikipedia for free!
		</p>
	</div>
</div> -->
<div class="flex justify-center h-screen w-screen">
	<div class="flex flex-col items-center justify-center pr-5 pl-5">
		<div class="stats shadow bg-base-200">
			<div class="stat">
				<div class="stat-eval">Total Page Views</div>
				<div class="stat-value">89,400</div>
				<div class="stat-desc">21% more than last month</div>
			</div>
		</div>
		<Board size="min(80vh, 80vw)" {game} {team} />
	</div>
</div>

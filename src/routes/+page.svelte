<script lang="ts">
	import type { ClientToServerEvents, ServerToClientEvents } from '$lib/server/server';
	import type { PageData } from './$types';
	import { io, Socket } from 'socket.io-client';
	import { Game } from './game';
	import { Team } from '$lib/game';
	import Board from './Board.svelte';
	import { assets } from '$app/paths';

	export let data: PageData;

	let connection: Socket<ServerToClientEvents, ClientToServerEvents> = io();

	connection.emit('hello', 42);

	let game = Game.default();
	let team = Team.Both;

	var wasmSupported =
		typeof WebAssembly === 'object' &&
		WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

	var stockfish = new Worker(
		wasmSupported ? `${assets}/stockfish.wasm.js` : `${assets}/stockfish.js`
	);

	stockfish.addEventListener('message', function (e) {
		console.log(e.data);
	});

	stockfish.postMessage('uci');
	stockfish.postMessage('position startpos');
	stockfish.postMessage('position startpos moves e2e4');
	stockfish.postMessage('d');
	stockfish.postMessage('eval');
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
		<Board size="min(80vh, 80vw)" {game} {team} />
	</div>
</div>

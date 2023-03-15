<script lang="ts">
	import type { ClientToServerEvents, ServerToClientEvents } from '$lib/server/server';
	import type { PageData } from './$types';
	import { io, Socket } from 'socket.io-client';
	import { Game, Move } from './game';
	import { Team } from '$lib/game';
	import Board from './Board.svelte';

	export let data: PageData;

	let connection: Socket<ServerToClientEvents, ClientToServerEvents> = io();

	connection.emit('hello', 42);

	let game = Game.default();
	let team = Team.Both;
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

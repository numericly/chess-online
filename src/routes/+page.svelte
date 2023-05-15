<script lang="ts">
	import type { PageData } from './$types';
	import { type Team, Game } from '$lib/game';
	import Board from '$lib/components/Board.svelte';
	import { v4 } from 'uuid';
	import { redirect } from '@sveltejs/kit';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let game = Game.default();
	let team = 'spectator' as Team;

	function createGame() {
		var arr = new Uint8Array(8);
		crypto.getRandomValues(arr);
		let game_id = Array.from(arr, (str) => {
			return str.toString(36);
		})
			.join('')
			.substring(0, 6);

		// console.log('creating game', game_id);
		goto(`/play/${game_id}`);
	}
</script>

<div class="modal modal-open">
	<div class="modal-box glass">
		<div class="flex flex-col">
			<a class="btn" href="/local-game">Local Game</a>
			<button class="btn mt-1" on:click={createGame}>Host Multiplayer</button>
			<button class="btn mt-1">Join</button>
			<button class="btn mt-1">Spectate</button>
		</div>
	</div>
</div>
<div class="flex justify-center h-screen w-screen">
	<div class="flex flex-col items-center justify-center pr-5 pl-5">
		<Board size="min(80vh, 80vw)" {game} {team} />
	</div>
</div>

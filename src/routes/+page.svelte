<script lang="ts">
	import type { PageData } from './$types';
	import { type Team, Game } from '$lib/game';
	import Board from '$lib/components/Board.svelte';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let game = Game.default();
	let game_code = '';
	let team = 'spectator' as Team;

	function createGame() {
		var arr = new Uint8Array(8);
		crypto.getRandomValues(arr);
		let game_id = Array.from(arr, (str) => {
			return str.toString(36);
		})
			.join('')
			.substring(0, 6);

		goto(`/play/${game_id}`);
	}

	function joinGame() {
		goto(`/play/${game_code}`);
	}
</script>

<div class="modal modal-open">
	<div class="modal-box glass">
		<div class="flex flex-col">
			<a class="btn" href="/local-game">Local Game</a>
			<button class="btn mt-1" on:click={createGame}>Host Multiplayer</button>
			<div class="input-group mt-1">
				<input
					type="text"
					placeholder="Game code"
					class="input input-bordered w-full"
					bind:value={game_code}
				/>
				<button class="btn btn-square px-8" on:click={joinGame}>Join</button>
			</div>
		</div>
	</div>
</div>
<div class="flex justify-center h-screen w-screen">
	<div class="flex flex-col items-center justify-center pr-5 pl-5">
		<Board size="min(80vh, 80vw)" {game} {team} />
	</div>
</div>

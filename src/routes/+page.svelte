<script lang="ts">
	import type { PageData } from './$types';
	import { type Team, Game } from '$lib/game';
	import Board from '$lib/components/Board.svelte';
	import { v4 } from 'uuid';

	export let data: PageData;

	let game = Game.default();
	let team = 'spectator' as Team;

	function createGame() {
		let game_id = v4();
	}
</script>

<div class="modal modal-open">
	<div class="modal-box glass">
		<div class="flex flex-col">
			<a class="btn" href="/local-game">Local Game</a>
			<button class="btn mt-1">Host Multiplayer</button>
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

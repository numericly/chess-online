<script lang="ts">
	import type { PageData } from './$types';
	import { Game, type Team } from '$lib/game';
	import Board from '$lib/components/Board.svelte';

	export let data: PageData;

	let game = Game.default();
	let team: Team = 'both';
</script>

<div class="flex justify-center h-screen w-screen">
	<div class="flex flex-col items-center justify-center pr-5 pl-5">
		<Board size="min(80vh, 80vw)" {game} {team} />
	</div>
</div>

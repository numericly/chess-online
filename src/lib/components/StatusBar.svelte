<script lang="ts">
	import type { TeamCard } from '../../routes/play/[id]/+page.server';

	export let turn: boolean;
	export let player: TeamCard | undefined;

	let time_remaining = 600;
	let minutes: HTMLElement | null;
	let seconds: HTMLElement | null;

	setInterval(() => {
		if (minutes === null || seconds === null) return;
		minutes.style.setProperty('--value', Math.floor(time_remaining / 60).toString());
		seconds.style.setProperty('--value', (time_remaining % 60).toString());
		time_remaining--;
	}, 1000);

	$: if (time_remaining <= 0) {
		time_remaining = 600;
	}
</script>

<div
	class="flex flex-row justify-between w-full items-center border-2 bg-base-200 rounded-xl p-1 my-1"
	class:border-black-square={turn}
	class:border-base-300={!turn}
>
	{#if player !== undefined}
		<div class="flex items-center">
			<span class="ml-2 font-mono">{player.player.display_name}</span>
		</div>
	{:else}
		<div class="flex items-center">
			<span class="ml-2 font-mono opacity-30">Player 2</span>
		</div>
	{/if}
	<span class="countdown font-mono mr-2">
		<span style="--value:10;" bind:this={minutes} />m
		<span style="--value:00;" bind:this={seconds} class="ml-1" />s
	</span>
</div>

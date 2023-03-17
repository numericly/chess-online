<script lang="ts">
	import type { PageData } from './$types';
	import { io, Socket } from 'socket.io-client';
	import { Game, type Team } from '$lib/game';
	import { ChevronUpIcon } from 'svelte-feather-icons';
	import Board from '$lib/components/Board.svelte';
	import {
		LoadGameSchema,
		MoveSchema,
		OtherPlayerSchema,
		type ClientToServerEvents,
		type OtherPlayer,
		type ServerToClientEvents
	} from '$lib/messages';
	import { z } from 'zod';

	export let data: PageData;

	let socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
		query: { id: data.game_id }
	});

	let game = Game.default();
	let team: Team = 'both';
	let players: OtherPlayer[] = [];

	socket.on('load_game', (data) => {
		let load_data = LoadGameSchema.parse(data);
		game = load_data.board;
		team = load_data.team;
		players = load_data.players;

		console.log(load_data.players);

		game.on('move', (move, user_generated) => {
			if (user_generated) {
				socket.emit('move', move);
			}
		});
	});

	socket.on('move', (data) => {
		let move = MoveSchema.parse(data);
		game.makeMove(move, { user_generated: false });
	});

	socket.on('player_join', (data) => {
		let player = OtherPlayerSchema.parse(data);
		players.push(player);

		players = [...players];
		console.log(players);
	});

	socket.on('player_leave', (data) => {
		let id = z.string().parse(data);

		players = players.filter((player) => player.id !== id);
		console.log(players);
	});
</script>

<div class="relative grow">
	<div class="flex justify-center h-screen w-screen">
		<div class="flex flex-col items-center justify-center pr-5 pl-5">
			<Board size="min(80vh, 80vw)" {game} {team} />
		</div>
	</div>
	<div class="absolute dropdown dropdown-top dropdown-end" style="bottom: 0; right: 0;">
		<button class="btn m-1">{team} <ChevronUpIcon size="25" class="ml-1" /></button>
		<ul class="dropdown-content menu p-2 shadow bg-base-300 rounded-box w-52">
			<li>
				<button>Black</button>
			</li>
			<li>
				<button>White</button>
			</li>
			<li>
				<button>Spectator</button>
			</li>
		</ul>
	</div>
</div>

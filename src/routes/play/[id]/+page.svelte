<script lang="ts">
	import type { PageData } from './$types';
	import { io, Socket } from 'socket.io-client';
	import { Game, type Team } from '$lib/game';
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
	import StatusBar from '$lib/components/StatusBar.svelte';
	import type { TeamCard } from './+page.server';

	export let data: PageData;

	let socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
		query: { id: data.game_id }
	});

	let game = Game.default();

	let black: TeamCard | undefined;
	let white: TeamCard | undefined;

	let team: Team = 'both';
	let turn = 'white';

	socket.on('load_game', (d) => {
		let load_data = LoadGameSchema.parse(d);
		turn = load_data.board.turn;
		game = load_data.board;
		team = load_data.team;

		game.on('move', () => {
			console.log('move');
			turn = game.turn === 'white' ? 'black' : 'white';
		});

		white = undefined;
		black = undefined;

		if (team === 'black') {
			black = {
				team: 'black',
				is_me: true,
				is_connected: true,
				player: {
					id: data.account.id,
					display_name: 'You',
					team: 'black'
				}
			};
		} else if (team === 'white') {
			white = {
				team: 'white',
				is_me: true,
				is_connected: true,
				player: {
					id: data.account.id,
					display_name: 'You',
					team: 'white'
				}
			};
		}

		load_data.players.forEach((player) => {
			if (player.team === 'black') {
				black = {
					team: 'black',
					is_me: false,
					is_connected: true,
					player
				};
			} else if (player.team === 'white') {
				white = {
					team: 'white',
					is_me: false,
					is_connected: true,
					player
				};
			}
		});

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

		if (player.team === 'black') {
			black = {
				team: 'black',
				is_me: false,
				is_connected: true,
				player
			};
		} else if (player.team === 'white') {
			white = {
				team: 'white',
				is_me: false,
				is_connected: true,
				player
			};
		}
	});

	socket.on('player_leave', (data) => {
		let id = z.string().parse(data);

		if (black !== undefined && black.player.id === id) {
			black = { ...black, is_connected: false };
		} else if (white !== undefined && white.player.id === id) {
			white = { ...white, is_connected: false };
		}
	});
</script>

<div class="relative grow">
	<div class="flex justify-center h-screen w-screen">
		<div class="flex flex-col items-center justify-center pr-5 pl-5">
			<StatusBar turn={turn == 'black'} player={black} />
			<Board size="min(80vh, 80vw)" {game} {team} />
			<StatusBar turn={turn == 'white'} player={white} />
		</div>
	</div>
</div>

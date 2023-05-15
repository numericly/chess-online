import type { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from './secrets';
import { z } from 'zod';
import {
	JoinGameSchema,
	MoveSchema,
	type ClientToServerEvents,
	type OtherPlayer,
	type ServerToClientEvents
} from '../messages';
import { Game, type Team } from '../game';

export const AccountSchema = z.object({
	id: z.string(),
	created_at: z.string()
});
export type Account = z.infer<typeof AccountSchema>;

export type Player = {
	socket: Socket<ClientToServerEvents, ServerToClientEvents>;
	account: Account;
};

export type Lobby = {
	id: string;
	white: Player | undefined;
	black: Player | undefined;
	spectators: Player[];
	game: Game;
};

export const games: { [id: string]: Lobby } = {};
export const game_manager = {
	games,
	getOrCreate: function (id: string) {
		if (this.games[id] === undefined) {
			this.games[id] = {
				id,
				spectators: [],
				white: undefined,
				black: undefined,
				game: Game.default()
			};
		}
		return this.games[id];
	},
	joinGame: function (game: Lobby, player: Player): Team {
		if (
			game.black !== undefined &&
			game.black.account.id === player.account.id &&
			!game.black.socket.connected
		) {
			game.black = player;
			return 'black';
		}
		if (
			game.white !== undefined &&
			game.white.account.id === player.account.id &&
			!game.white.socket.connected
		) {
			game.white = player;
			return 'white';
		}
		if (game.black === undefined && game.white === undefined) {
			if (Math.random() < 0.5) {
				game.white = player;
				return 'white';
			} else {
				game.black = player;
				return 'black';
			}
		} else if (game.black === undefined) {
			game.black = player;
			return 'black';
		} else if (game.white === undefined) {
			game.white = player;
			return 'white';
		}
		game.spectators.push(player);
		return 'spectator';
	},
	getOtherPlayers: function (game: Lobby, id: string, team: Team): OtherPlayer[] {
		const players = [];

		if (game.black !== undefined && (game.black.account.id !== id || team !== 'black'))
			players.push(this.convertPlayer(game.black, 'black'));
		if (game.white !== undefined && (game.white.account.id !== id || team !== 'white'))
			players.push(this.convertPlayer(game.white, 'white'));

		for (const spectator of game.spectators) {
			if (spectator.account.id === id) continue;
			players.push(this.convertPlayer(spectator, 'spectator'));
		}

		return players;
	},
	convertPlayer(player: Player, team: Team): OtherPlayer {
		return {
			id: player.account.id,
			team,
			display_name: 'Opponent'
		};
	}
};

export function start(server: Server<ClientToServerEvents, ServerToClientEvents>) {
	server.on('connection', async (socket) => {
		try {
			const account = parseAccountFromCookie(socket.request.headers.cookie);
			const player = { socket, account };
			const { id } = JoinGameSchema.parse(socket.handshake.query);
			const game = game_manager.getOrCreate(id);
			const team = game_manager.joinGame(game, player);

			const other_players = game_manager.getOtherPlayers(game, account.id, team);

			console.log('Client connected', account.id, id, team);

			socket.join(id);

			socket.emit('load_game', { board: game.game, team, players: other_players });

			if (team !== 'spectator') {
				socket.to(id).emit('player_join', game_manager.convertPlayer(player, team));

				socket.on('move', (data) => {
					try {
						const move_data = MoveSchema.parse(data);
						game.game.makeMove(move_data);
					} catch (e) {
						socket.disconnect();
					}
				});
				socket.on('disconnect', () => {
					socket.to(id).emit('player_leave', account.id);
				});
			}

			game.game.on('move', (move, _, turn) => {
				if (team !== turn) {
					socket.emit('move', move);
				}
			});
		} catch (e) {
			console.log('Error', e);
			socket.disconnect();
		}
	});
	console.log('Starting server...');
}

function parseAccountFromCookie(cookie: string | undefined): Account {
	if (cookie === undefined) throw new Error('No cookie');
	const cookie_data = parseCookie(cookie);
	const auth = cookie_data['auth'];
	if (auth === undefined) throw new Error('No auth cookie');
	return AccountSchema.parse(verify(auth, JWT_SECRET));
}

function parseCookie(cookie: string): { [key: string]: string } {
	return cookie.split(';').reduce((acc, c) => {
		const cookie = c.trim();
		const cookie_parts = cookie.split('=');
		if (cookie_parts.length !== 2) throw new Error('Invalid cookie');
		acc[cookie_parts[0]] = cookie_parts[1];
		return acc;
	}, {} as { [key: string]: string });
}

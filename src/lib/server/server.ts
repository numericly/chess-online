import type { Server } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from './secrets';
import { z } from 'zod';

export type ServerToClientEvents = {
	basicEmit: (a: number, b: string, c: Buffer) => void;
};

export type ClientToServerEvents = {
	hello: (a: number) => void;
};

export const AccountData = z.object({
	id: z.string(),
	created_at: z.string()
});

export function start(server: Server<ServerToClientEvents, ClientToServerEvents>) {
	server.on('connection', async (socket) => {
		let account: z.infer<typeof AccountData>;
		try {
			const cookie = socket.request.headers.cookie;
			if (cookie === undefined) throw new Error('No cookie');
			const cookie_data = parseCookie(cookie);
			const auth = cookie_data['auth'];
			if (auth === undefined) throw new Error('No auth cookie');
			account = AccountData.parse(verify(auth, JWT_SECRET));
		} catch (error) {
			return;
		}

		console.log(account);

		socket.on('disconnect', () => {
			console.log('Client disconnected');
		});
	});
	console.log('Starting server...');
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

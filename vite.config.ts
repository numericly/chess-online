import { start } from './src/lib/server/server';
import { sveltekit } from '@sveltejs/kit/vite';
import { Server } from 'socket.io';
import { defineConfig } from 'vite';

const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: any) {
		const io = new Server(server.httpServer);

		start(io);
	}
};

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});

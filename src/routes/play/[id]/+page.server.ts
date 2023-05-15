import { GAME_ID_PATTERN, type OtherPlayer } from '$lib/messages';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Team } from '$lib/game';

export type TeamCard = {
	player: OtherPlayer;
	team: Team;
	is_me: boolean;
	is_connected: boolean;
};

export const load = (async ({ parent, params }) => {
	if (!GAME_ID_PATTERN.test(params.id)) {
		throw error(404, 'Invalid game ID');
	}

	const { account } = await parent();

	return {
		account,
		game_id: params.id
	};
}) satisfies PageServerLoad;

export const ssr = false;

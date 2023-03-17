import { UUID_PATTERN } from '$lib/messages';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ parent, params }) => {
	if (!UUID_PATTERN.test(params.id)) {
		throw error(404, 'Invalid game ID');
	}

	const { account } = await parent();

	return {
		account,
		game_id: params.id
	};
}) satisfies PageServerLoad;

export const ssr = false;

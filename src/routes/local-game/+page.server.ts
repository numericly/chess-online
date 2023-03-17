import type { PageServerLoad } from './$types';

export const load = (async ({ parent }) => {
	const { account } = await parent();

	return {
		account
	};
}) satisfies PageServerLoad;

export const ssr = false;

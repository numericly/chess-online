import { JWT_SECRET } from '$lib/server/secrets';
import { AccountSchema } from '$lib/server/server';
import jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import { v4 } from 'uuid';
import type { z } from 'zod';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	try {
		const auth = cookies.get('auth');
		if (auth === undefined) {
			throw new Error('No auth cookie');
		}
		const account = AccountSchema.parse(verify(auth, JWT_SECRET));
		return {
			account
		};
	} catch (error) {
		const account: z.infer<typeof AccountSchema> = {
			id: v4(),
			created_at: Date.now().toString()
		};
		const auth = sign(account, JWT_SECRET);
		cookies.set('auth', auth, {
			httpOnly: true,
			expires: undefined,
			secure: false
		});
		return {
			account
		};
	}
}) satisfies LayoutServerLoad;

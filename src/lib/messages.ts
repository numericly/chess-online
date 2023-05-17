import { BoardPosition, Game, Move, Piece } from './game';
import { z } from 'zod';

export const GAME_ID_PATTERN = /^[a-z0-9]{3}$/;

export const TeamSchema = z.enum(['white', 'black', 'spectator', 'both']);
export const ColorSchema = z.enum(['white', 'black']);
export const PieceSchema = z
	.object({
		color: ColorSchema,
		type: z.enum(['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'])
	})
	.transform(Piece.from);
export const BoardPositionSchema = z
	.object({ x: z.number(), y: z.number() })
	.transform(({ x, y }) => new BoardPosition(x, y));
export const MoveSchema = z
	.object({
		from: BoardPositionSchema,
		to: BoardPositionSchema
	})
	.transform(({ from, to }) => new Move(from, to));
export const BoardSchema = z
	.object({
		turn: ColorSchema,
		castling: z.object({
			white_kingside: z.boolean(),
			white_queenside: z.boolean(),
			black_kingside: z.boolean(),
			black_queenside: z.boolean()
		}),
		board: z.array(z.array(z.union([PieceSchema, z.null()]))),
		en_passant: BoardPositionSchema.optional(),
		halfmove_clock: z.number(),
		fullmove_number: z.number(),
		moves: z.array(MoveSchema),
		last_move: MoveSchema.optional()
	})
	.transform((data) => new Game(data));
export const OtherPlayerSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	team: TeamSchema
});
export type OtherPlayer = z.infer<typeof OtherPlayerSchema>;

export const LoadGameSchema = z.object({
	board: BoardSchema,
	team: TeamSchema,
	players: z.array(OtherPlayerSchema)
});

export const OtherPlayerChangeNameSchema = z.object({
	id: z.string(),
	display_name: z.string().max(128).min(2)
});

export type ServerToClientEvents = {
	load_game: (data: z.infer<typeof LoadGameSchema>) => void;
	move: (data: z.infer<typeof MoveSchema>) => void;
	player_join: (data: z.infer<typeof OtherPlayerSchema>) => void;
	player_leave: (data: string) => void;
	player_change_name: (data: z.infer<typeof OtherPlayerChangeNameSchema>) => void;
};

export type ClientToServerEvents = {
	move: (data: z.infer<typeof MoveSchema>) => void;
};

export const JoinGameSchema = z.object({
	id: z.string().refine((id) => GAME_ID_PATTERN.test(id))
});
export type JoinGame = z.infer<typeof JoinGameSchema>;

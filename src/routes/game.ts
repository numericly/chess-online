import BlackKing from '$lib/images/b-k.svg';
import BlackQueen from '$lib/images/b-q.svg';
import BlackRook from '$lib/images/b-r.svg';
import BlackBishop from '$lib/images/b-b.svg';
import BlackKnight from '$lib/images/b-n.svg';
import BlackPawn from '$lib/images/b-p.svg';

import WhiteKing from '$lib/images/w-k.svg';
import WhiteQueen from '$lib/images/w-q.svg';
import WhiteRook from '$lib/images/w-r.svg';
import WhiteBishop from '$lib/images/w-b.svg';
import WhiteKnight from '$lib/images/w-n.svg';
import WhitePawn from '$lib/images/w-p.svg';
import { get, writable, type Writable } from 'svelte/store';

export type VisualBoard = {
	offset: {
		top: number;
		left: number;
	};
	size: {
		width: number;
		height: number;
	};
};

export enum PieceType {
	King,
	Queen,
	Pawn,
	Rook,
	Bishop,
	Knight
}

export class Move {
	from: BoardPosition;
	to: BoardPosition;

	static fromFen(fen: string): Move {
		if (fen.length !== 4) throw new Error('Invalid move. Length must be 4');
		const from = BoardPosition.fromFen(fen.slice(0, 2));
		const to = BoardPosition.fromFen(fen.slice(2, 4));
		return new Move(from, to);
	}

	constructor(from: BoardPosition, to: BoardPosition) {
		this.from = from;
		this.to = to;
	}

	toFen(): string {
		return `${this.from.toFen()}${this.to.toFen()}`;
	}
}

export class Game {
	turn: Color;
	castling: Castling;
	board: Writable<(Piece | undefined)[][]>;
	en_passant: BoardPosition | undefined;
	last_move: Writable<Move | undefined>;
	halfmove_clock: number;
	fullmove_number: number;
	moves: Writable<Move[]> = writable([]);

	static default(): Game {
		return new Game(
			Color.White,
			Castling.default(),
			[
				[
					new Rook(Color.Black),
					new Knight(Color.Black),
					new Bishop(Color.Black),
					new Queen(Color.Black),
					new King(Color.Black),
					new Bishop(Color.Black),
					new Knight(Color.Black),
					new Rook(Color.Black)
				],
				Array(8).fill(new Pawn(Color.Black)),
				Array(8).fill(undefined),
				Array(8).fill(undefined),
				Array(8).fill(undefined),
				Array(8).fill(undefined),
				Array(8).fill(new Pawn(Color.White)),
				[
					new Rook(Color.White),
					new Knight(Color.White),
					new Bishop(Color.White),
					new Queen(Color.White),
					new King(Color.White),
					new Bishop(Color.White),
					new Knight(Color.White),
					new Rook(Color.White)
				]
			],
			undefined,
			undefined,
			0,
			0,
			[]
		);
	}

	constructor(
		turn: Color,
		castling: Castling,
		board: (Piece | undefined)[][],
		en_passant: BoardPosition | undefined,
		last_move: Move | undefined,
		halfmove_clock: number,
		fullmove_number: number,
		moves: Move[]
	) {
		this.turn = turn;
		this.castling = castling;
		this.en_passant = en_passant;
		this.board = writable(board);
		this.last_move = writable(last_move);
		this.moves = writable(moves);
		this.halfmove_clock = halfmove_clock;
		this.fullmove_number = fullmove_number;
	}
	hasMoves(side: Color): boolean {
		const board = get(this.board);
		const moves = board.some((row, y) => {
			return row.some((iter_piece, x) => {
				if (iter_piece === undefined) return false;
				if (iter_piece.color !== side) return false;

				const moves = this.getMoves(iter_piece, new BoardPosition(x, y));
				return moves.length > 0;
			});
		});

		return moves;
	}
	getMoves(piece: Piece, position: BoardPosition): BoardPosition[] {
		const board = get(this.board);
		let moves = piece.getMoves(board, position);

		moves = moves.filter((move) => {
			return !this.createsCheck(new Move(position, move));
		});

		return moves;
	}

	inCheck(side: Color): boolean {
		const board = get(this.board);

		let king: BoardPosition | undefined = undefined;
		for (const [y, row] of board.entries()) {
			for (const [x, iter_piece] of row.entries()) {
				if (iter_piece === undefined) continue;
				if (iter_piece.color === side && iter_piece instanceof King) {
					king = new BoardPosition(x, y);
					break;
				}
			}
		}

		const check = board.some((row, y) => {
			return row.some((iter_piece, x) => {
				if (iter_piece === undefined) return false;
				if (side === iter_piece.color) return false;

				const moves = Piece.from(iter_piece).getMoves(board, new BoardPosition(x, y));

				return moves.some((move) => {
					if (king === undefined) return true;
					return move.equals(king);
				});
			});
		});
		return check;
	}

	createsCheck(move: Move): boolean {
		const board_data = get(this.board);
		const piece = board_data[move.from.y][move.from.x];
		if (piece === undefined) return false;

		let king: BoardPosition | undefined = undefined;
		if (piece instanceof King) {
			king = move.to;
		} else {
			for (const [y, row] of board_data.entries()) {
				for (const [x, iter_piece] of row.entries()) {
					if (iter_piece === undefined) continue;
					if (iter_piece.color === piece.color && iter_piece instanceof King) {
						king = new BoardPosition(x, y);
						break;
					}
				}
			}
		}

		const board = structuredClone(board_data);

		board[move.to.y][move.to.x] = board[move.from.y][move.from.x];
		board[move.from.y][move.from.x] = undefined;

		if (king === undefined) return false;

		const check = board.some((row, y) => {
			return row.some((iter_piece, x) => {
				if (iter_piece === undefined) return false;
				if (piece.color === iter_piece.color) return false;

				const moves = Piece.from(iter_piece).getMoves(board, new BoardPosition(x, y));

				return moves.some((move) => {
					if (king === undefined) return true;
					return move.equals(king);
				});
			});
		});

		return check;
	}

	makeMove(move: Move) {
		const board = get(this.board);

		board[move.to.y][move.to.x] = board[move.from.y][move.from.x];
		board[move.from.y][move.from.x] = undefined;

		this.board.set(board);

		this.turn = this.turn === Color.White ? Color.Black : Color.White;

		this.moves.update((moves) => {
			moves.push(move);
			return moves;
		});

		if (!this.hasMoves(this.turn)) {
			if (this.inCheck(this.turn)) {
				console.log('Checkmate!');
			} else {
				console.log('Stalemate!');
			}
		}
	}

	toString(): string {
		let str = '';
		for (const row of get(this.board)) {
			for (const piece of row) {
				str += piece ? piece.toString() : ' ';
			}
			str += '\n';
		}
		return str;
	}
	pieceAt(pos: BoardPosition): Piece | undefined {
		return get(this.board)[pos.y][pos.x];
	}
}

export class BoardPosition {
	x: number;
	y: number;

	static fromFen(fen: string): BoardPosition {
		if (fen.length !== 2) {
			throw new Error(`Invalid FEN - invalid board position: ${fen}`);
		}
		const file_mapping: { [file: string]: number } = {
			a: 0,
			b: 1,
			c: 2,
			d: 3,
			e: 4,
			f: 5,
			g: 6,
			h: 7
		};

		const x = file_mapping[fen[0]];

		if (x === undefined) {
			throw new Error(`Invalid FEN - invalid rank: ${fen[0]}`);
		}

		let y = parseInt(fen[1]);
		if (isNaN(y) || y > 8 || y < 1) {
			throw new Error(`Invalid FEN - invalid file: ${fen[1]}`);
		}
		y = 8 - y;
		return new BoardPosition(x, y);
	}

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	move(color: Color, x: number, y: number): BoardPosition | undefined {
		let new_x;
		let new_y;
		if (color === Color.White) {
			new_x = this.x + x;
			new_y = this.y - y;
		} else {
			new_x = this.x - x;
			new_y = this.y + y;
		}
		if (new_x >= 8 || new_x < 0 || new_y >= 8 || new_y < 0) {
			return undefined;
		}

		return new BoardPosition(new_x, new_y);
	}

	equals(pos: BoardPosition): boolean {
		return this.x === pos.x && this.y === pos.y;
	}

	toFen(): string {
		const file_mapping: { [file: number]: string } = {
			0: 'a',
			1: 'b',
			2: 'c',
			3: 'd',
			4: 'e',
			5: 'f',
			6: 'g',
			7: 'h'
		};
		return file_mapping[this.x] + (8 - this.y);
	}
}

class Castling {
	white_kingside: boolean;
	white_queenside: boolean;
	black_kingside: boolean;
	black_queenside: boolean;

	static default(): Castling {
		return new Castling(true, true, true, true);
	}

	constructor(
		white_kingside: boolean,
		white_queenside: boolean,
		black_kingside: boolean,
		black_queenside: boolean
	) {
		this.white_kingside = white_kingside;
		this.white_queenside = white_queenside;
		this.black_kingside = black_kingside;
		this.black_queenside = black_queenside;
	}
}

export enum Color {
	White,
	Black
}

type MoveOptions = {
	must_capture?: boolean;
	can_capture?: boolean;
};

export abstract class Piece {
	color: Color;
	type: PieceType;

	constructor(color: Color, type: PieceType) {
		this.color = color;
		this.type = type;
	}

	static from(data: { color: Color; type: PieceType }): Piece {
		const { color, type } = data;
		switch (type) {
			case PieceType.Pawn:
				return new Pawn(color);
			case PieceType.Bishop:
				return new Bishop(color);
			case PieceType.Knight:
				return new Knight(color);
			case PieceType.Rook:
				return new Rook(color);
			case PieceType.Queen:
				return new Queen(color);
			case PieceType.King:
				return new King(color);
		}
	}

	static fromFen(fen: string): Piece {
		const color = /[A-Z]/.test(fen) ? Color.White : Color.Black;
		switch (fen.toLowerCase()) {
			case 'p':
				return new Pawn(color);
			case 'r':
				return new Rook(color);
			case 'n':
				return new Knight(color);
			case 'b':
				return new Bishop(color);
			case 'q':
				return new Queen(color);
			case 'k':
				return new King(color);
			default:
				throw new Error(`Invalid FEN - unknown piece: ${fen}`);
		}
	}

	abstract getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[];
	abstract image(): string;
	abstract fen(): string;

	move(
		board: (Piece | undefined)[][],
		from: BoardPosition,
		x: number,
		y: number,
		opts?: MoveOptions
	): BoardPosition | undefined {
		const must_capture = opts?.must_capture ?? false;
		const can_capture = opts?.can_capture ?? true;
		const new_pos = from.move(this.color, x, y);

		if (new_pos === undefined) {
			return undefined;
		}
		const piece = board[new_pos.y][new_pos.x];

		if (piece !== undefined) {
			if (piece.color === this.color || !can_capture) {
				return undefined;
			}
		} else if (must_capture) {
			return undefined;
		}
		return new_pos;
	}

	toString(): string {
		return this.color === Color.White ? this.fen().toUpperCase() : this.fen().toLowerCase();
	}
}

class Pawn extends Piece {
	constructor(color: Color) {
		super(color, PieceType.Pawn);
	}

	getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[] {
		const moves = [
			this.move(board, position, 1, 1, { must_capture: true }),
			this.move(board, position, -1, 1, { must_capture: true }),
			this.move(board, position, 0, 1, { can_capture: false })
		];
		if (
			(this.color === Color.White && position.y === 6) ||
			(this.color === Color.Black && position.y === 1)
		) {
			const forward = position.move(this.color, 0, 1);
			if (forward !== undefined && board[forward.y][forward.x] === undefined) {
				moves.push(this.move(board, position, 0, 2, { can_capture: false }));
			}
		}

		return moves.filter((move) => move !== undefined) as BoardPosition[];
	}

	fen(): string {
		return 'p';
	}
	image(): string {
		return this.color === Color.White ? WhitePawn : BlackPawn;
	}
}

class Knight extends Piece {
	constructor(color: Color) {
		super(color, PieceType.Knight);
	}
	getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[] {
		const moves = [
			this.move(board, position, 1, 2),
			this.move(board, position, 2, 1),
			this.move(board, position, 2, -1),
			this.move(board, position, 1, -2),
			this.move(board, position, -1, -2),
			this.move(board, position, -2, -1),
			this.move(board, position, -2, 1),
			this.move(board, position, -1, 2)
		];

		return moves.filter((move) => move !== undefined) as BoardPosition[];
	}
	fen(): string {
		return 'n';
	}
	image(): string {
		return this.color === Color.White ? WhiteKnight : BlackKnight;
	}
}

enum Direction {
	Up,
	Down,
	Left,
	Right
}

class Bishop extends Piece {
	constructor(color: Color) {
		super(color, PieceType.Bishop);
	}
	getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[] {
		const moves: BoardPosition[] = [];

		for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
			for (let i = 0; i < 7; i++) {
				let move: BoardPosition | undefined;
				switch (direction) {
					case Direction.Up:
						move = this.move(board, position, i + 1, i + 1);
						break;
					case Direction.Right:
						move = this.move(board, position, i + 1, -(i + 1));
						break;
					case Direction.Down:
						move = this.move(board, position, -(i + 1), i + 1);
						break;
					case Direction.Left:
						move = this.move(board, position, -(i + 1), -(i + 1));
						break;
				}
				if (move === undefined) {
					break;
				}
				moves.push(move);
				if (board[move.y][move.x] !== undefined) {
					break;
				}
			}
		}
		return moves;
	}
	fen(): string {
		return 'b';
	}
	image(): string {
		return this.color === Color.White ? WhiteBishop : BlackBishop;
	}
}

class Rook extends Piece {
	constructor(color: Color) {
		super(color, PieceType.Rook);
	}
	getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[] {
		const moves: BoardPosition[] = [];

		for (const direction of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
			for (let i = 0; i < 7; i++) {
				let move: BoardPosition | undefined;
				switch (direction) {
					case Direction.Up:
						move = this.move(board, position, 0, i + 1);
						break;
					case Direction.Right:
						move = this.move(board, position, i + 1, 0);
						break;
					case Direction.Down:
						move = this.move(board, position, 0, -(i + 1));
						break;
					case Direction.Left:
						move = this.move(board, position, -(i + 1), 0);
						break;
				}
				if (move === undefined) {
					break;
				}
				moves.push(move);
				if (board[move.y][move.x] !== undefined) {
					break;
				}
			}
		}
		return moves;
	}
	fen(): string {
		return 'r';
	}
	image(): string {
		return this.color === Color.White ? WhiteRook : BlackRook;
	}
}

class Queen extends Piece {
	constructor(color: Color) {
		super(color, PieceType.Queen);
	}
	getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[] {
		const rook_moves = new Rook(this.color).getMoves(board, position);
		const bishop_moves = new Bishop(this.color).getMoves(board, position);

		return [...rook_moves, ...bishop_moves];
	}
	fen(): string {
		return 'q';
	}
	image(): string {
		return this.color === Color.White ? WhiteQueen : BlackQueen;
	}
}

class King extends Piece {
	constructor(color: Color) {
		super(color, PieceType.King);
	}
	getMoves(board: (Piece | undefined)[][], position: BoardPosition): BoardPosition[] {
		const moves = [
			this.move(board, position, 0, 1),
			this.move(board, position, 1, 1),
			this.move(board, position, 1, 0),
			this.move(board, position, 1, -1),
			this.move(board, position, 0, -1),
			this.move(board, position, -1, -1),
			this.move(board, position, -1, 0),
			this.move(board, position, -1, 1)
		];
		return moves.filter((move) => move !== undefined) as BoardPosition[];
	}
	fen(): string {
		return 'k';
	}
	image(): string {
		return this.color === Color.White ? WhiteKing : BlackKing;
	}
}

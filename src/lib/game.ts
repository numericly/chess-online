import { TypedEmitter } from 'tiny-typed-emitter';

export type GameEvents = {
	move: (move: Move, user_generated: boolean, color: Color) => void;
	checkmate: (winner: Color) => void;
	stalemate: () => void;
};

export type Team = 'white' | 'black' | 'both' | 'spectator';
export type Color = 'white' | 'black';
export type PieceType = 'king' | 'queen' | 'pawn' | 'rook' | 'bishop' | 'knight';

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

export type MoveOpts = {
	user_generated?: boolean;
};

export class Game extends TypedEmitter<GameEvents> {
	turn: Color;
	castling: Castling;
	board: (Piece | null)[][];
	en_passant: BoardPosition | undefined;
	last_move: Move | undefined;
	halfmove_clock: number;
	fullmove_number: number;
	moves: Move[] = [];

	static default(): Game {
		return new Game({
			turn: 'white',
			castling: {
				black_kingside: true,
				black_queenside: true,
				white_kingside: true,
				white_queenside: true
			},
			board: [
				[
					new Rook('black'),
					new Knight('black'),
					new Bishop('black'),
					new Queen('black'),
					new King('black'),
					new Bishop('black'),
					new Knight('black'),
					new Rook('black')
				],
				Array(8).fill(new Pawn('black')),
				Array(8).fill(null),
				Array(8).fill(null),
				Array(8).fill(null),
				Array(8).fill(null),
				Array(8).fill(new Pawn('white')),
				[
					new Rook('white'),
					new Knight('white'),
					new Bishop('white'),
					new Queen('white'),
					new King('white'),
					new Bishop('white'),
					new Knight('white'),
					new Rook('white')
				]
			],
			en_passant: undefined,
			last_move: undefined,
			halfmove_clock: 0,
			fullmove_number: 0,
			moves: []
		});
	}

	constructor(data: {
		turn: Color;
		castling: Castling;
		board: (Piece | null)[][];
		en_passant?: BoardPosition | undefined;
		last_move?: Move | undefined;
		halfmove_clock: number;
		fullmove_number: number;
		moves: Move[];
	}) {
		super();
		super.setMaxListeners(100);
		const { turn, castling, board, en_passant, last_move, halfmove_clock, fullmove_number, moves } =
			data;
		this.turn = turn;
		this.castling = castling;
		this.en_passant = en_passant;
		this.board = board;
		this.last_move = last_move;
		this.moves = moves;
		this.halfmove_clock = halfmove_clock;
		this.fullmove_number = fullmove_number;
	}

	hasMoves(side: Color): boolean {
		const moves = this.board.some((row, y) => {
			return row.some((iter_piece, x) => {
				if (iter_piece === null) return false;
				if (iter_piece.color !== side) return false;

				const moves = this.getMoves(iter_piece, new BoardPosition(x, y));
				return moves.length > 0;
			});
		});

		return moves;
	}

	getMoves(piece: Piece, position: BoardPosition): BoardPosition[] {
		let moves = piece.getMoves(this.board, position);

		moves = moves.filter((move) => {
			return !this.createsCheck(new Move(position, move));
		});

		return moves;
	}

	inCheck(side: Color): boolean {
		let king: BoardPosition | undefined = undefined;
		for (const [y, row] of this.board.entries()) {
			for (const [x, iter_piece] of row.entries()) {
				if (iter_piece === null) continue;
				if (iter_piece.color === side && iter_piece instanceof King) {
					king = new BoardPosition(x, y);
					break;
				}
			}
		}

		const check = this.board.some((row, y) => {
			return row.some((iter_piece, x) => {
				if (iter_piece === null) return false;
				if (side === iter_piece.color) return false;

				const moves = Piece.from(iter_piece).getMoves(this.board, new BoardPosition(x, y));

				return moves.some((move) => {
					if (king === undefined) return true;
					return move.equals(king);
				});
			});
		});
		return check;
	}

	createsCheck(move: Move): boolean {
		const board_data = this.board;
		const piece = board_data[move.from.y][move.from.x];
		if (piece === null) return false;

		let king: BoardPosition | undefined = undefined;
		if (piece instanceof King) {
			king = move.to;
		} else {
			for (const [y, row] of board_data.entries()) {
				for (const [x, iter_piece] of row.entries()) {
					if (iter_piece === null) continue;
					if (iter_piece.color === piece.color && iter_piece instanceof King) {
						king = new BoardPosition(x, y);
						break;
					}
				}
			}
		}

		const board = structuredClone(board_data);

		board[move.to.y][move.to.x] = board[move.from.y][move.from.x];
		board[move.from.y][move.from.x] = null;

		if (king === undefined) return false;

		const check = board.some((row, y) => {
			return row.some((iter_piece, x) => {
				if (iter_piece === null) return false;
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

	makeMove(move: Move, opts: MoveOpts = {}) {
		const user_generated = opts.user_generated ?? false;

		const piece = this.pieceAt(move.from);

		if (piece === null) return;

		const board = this.board;

		const valid_move = this.getMoves(piece, move.from).find((pos) => {
			return pos.equals(move.to);
		});

		if (valid_move === undefined) throw new Error('invalid move');

		board[move.to.y][move.to.x] = board[move.from.y][move.from.x];
		board[move.from.y][move.from.x] = null;

		this.moves.push(move);

		this.emit('move', move, user_generated, this.turn);

		this.turn = this.turn === 'white' ? 'black' : 'white';

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
		for (const row of this.board) {
			for (const piece of row) {
				str += piece ? piece.toString() : ' ';
			}
			str += '\n';
		}
		return str;
	}

	pieceAt(pos: BoardPosition): Piece | null {
		return this.board[pos.y][pos.x];
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
		if (color === 'white') {
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

export type Castling = {
	white_kingside: boolean;
	white_queenside: boolean;
	black_kingside: boolean;
	black_queenside: boolean;
};

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
			case 'pawn':
				return new Pawn(color);
			case 'bishop':
				return new Bishop(color);
			case 'knight':
				return new Knight(color);
			case 'rook':
				return new Rook(color);
			case 'queen':
				return new Queen(color);
			case 'king':
				return new King(color);
		}
	}

	static fromFen(fen: string): Piece {
		const color = /[A-Z]/.test(fen) ? 'white' : 'black';
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

	abstract getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[];
	abstract fen(): string;

	move(
		board: (Piece | null)[][],
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

		if (piece !== null) {
			if (piece.color === this.color || !can_capture) {
				return undefined;
			}
		} else if (must_capture) {
			return undefined;
		}
		return new_pos;
	}

	toString(): string {
		return this.color === 'white' ? this.fen().toUpperCase() : this.fen().toLowerCase();
	}
}

class Pawn extends Piece {
	constructor(color: Color) {
		super(color, 'pawn');
	}

	getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[] {
		const moves = [
			this.move(board, position, 1, 1, { must_capture: true }),
			this.move(board, position, -1, 1, { must_capture: true }),
			this.move(board, position, 0, 1, { can_capture: false })
		];
		if (
			(this.color === 'white' && position.y === 6) ||
			(this.color === 'black' && position.y === 1)
		) {
			const forward = position.move(this.color, 0, 1);
			if (forward !== undefined && board[forward.y][forward.x] === null) {
				moves.push(this.move(board, position, 0, 2, { can_capture: false }));
			}
		}

		return moves.filter((move) => move !== undefined) as BoardPosition[];
	}

	fen(): string {
		return 'p';
	}
}

class Knight extends Piece {
	constructor(color: Color) {
		super(color, 'knight');
	}

	getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[] {
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
}

enum Direction {
	Up,
	Down,
	Left,
	Right
}

class Bishop extends Piece {
	constructor(color: Color) {
		super(color, 'bishop');
	}

	getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[] {
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
				if (board[move.y][move.x] !== null) {
					break;
				}
			}
		}
		return moves;
	}

	fen(): string {
		return 'b';
	}
}

class Rook extends Piece {
	constructor(color: Color) {
		super(color, 'rook');
	}
	getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[] {
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
				if (board[move.y][move.x] !== null) {
					break;
				}
			}
		}
		return moves;
	}
	fen(): string {
		return 'r';
	}
}

class Queen extends Piece {
	constructor(color: Color) {
		super(color, 'queen');
	}
	getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[] {
		const rook_moves = new Rook(this.color).getMoves(board, position);
		const bishop_moves = new Bishop(this.color).getMoves(board, position);

		return [...rook_moves, ...bishop_moves];
	}
	fen(): string {
		return 'q';
	}
}

class King extends Piece {
	constructor(color: Color) {
		super(color, 'king');
	}
	getMoves(board: (Piece | null)[][], position: BoardPosition): BoardPosition[] {
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
}

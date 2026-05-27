/* chess.js – Full two-player chess engine */

'use strict';

// ── Piece constants ───────────────────────────────────────────────────────────
const W = 'white', B = 'black';

const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

// Map piece code → unicode symbol (for captured display)
const PIECE_SYMBOLS = PIECES;

// Piece values for captured-material scoring
const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

// ── Initial board state ───────────────────────────────────────────────────────
// null = empty; pieces stored as { color, type } objects
function buildInitialBoard() {
  const back = ['R','N','B','Q','K','B','N','R'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { color: B, type: back[c] };
    board[1][c] = { color: B, type: 'P' };
    board[6][c] = { color: W, type: 'P' };
    board[7][c] = { color: W, type: back[c] };
  }
  return board;
}

// ── Game state ────────────────────────────────────────────────────────────────
let state = {};

function initState() {
  state = {
    board:         buildInitialBoard(),
    turn:          W,
    selected:      null,        // { row, col }
    validMoves:    [],           // [{ row, col, special }]
    lastMove:      null,         // { from, to }
    enPassant:     null,         // square that can be captured en-passant { row, col }
    castlingRights: {
      [W]: { kingSide: true, queenSide: true },
      [B]: { kingSide: true, queenSide: true },
    },
    history:       [],           // array of snapshots for undo
    moveLog:       [],           // [{ white, black }]
    captured:      { [W]: [], [B]: [] },   // pieces captured by each side
    flipped:       false,
    status:        'playing',    // 'playing' | 'check' | 'checkmate' | 'stalemate'
    promoCallback: null,
  };
}

// ── Helper utilities ──────────────────────────────────────────────────────────
const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opponent = color => color === W ? B : W;
const pieceAt   = (board, r, c) => inBounds(r, c) ? board[r][c] : null;
const isEmpty   = (board, r, c) => inBounds(r, c) && board[r][c] === null;
const isEnemy   = (board, r, c, color) => {
  const p = pieceAt(board, r, c);
  return p && p.color !== color;
};
const isFriend  = (board, r, c, color) => {
  const p = pieceAt(board, r, c);
  return p && p.color === color;
};

// Deep-clone the board
function cloneBoard(board) {
  return board.map(row => row.map(p => p ? { ...p } : null));
}

// Deep-clone full state (for undo/check detection)
function snapshotState() {
  return {
    board:          cloneBoard(state.board),
    turn:           state.turn,
    selected:       state.selected ? { ...state.selected } : null,
    validMoves:     state.validMoves.map(m => ({ ...m })),
    lastMove:       state.lastMove ? { from: { ...state.lastMove.from }, to: { ...state.lastMove.to } } : null,
    enPassant:      state.enPassant ? { ...state.enPassant } : null,
    castlingRights: {
      [W]: { ...state.castlingRights[W] },
      [B]: { ...state.castlingRights[B] },
    },
    moveLog:        state.moveLog.map(e => ({ ...e })),
    captured:       { [W]: [...state.captured[W]], [B]: [...state.captured[B]] },
    flipped:        state.flipped,
    status:         state.status,
    promoCallback:  null,
  };
}

// ── Raw move generation (ignoring check) ─────────────────────────────────────
function rawMoves(board, r, c, enPassant, castlingRights) {
  const piece = board[r][c];
  if (!piece) return [];
  const { color, type } = piece;
  const moves = [];
  const dir = color === W ? -1 : 1;   // pawn direction

  const add = (tr, tc, special = null) => {
    if (inBounds(tr, tc)) moves.push({ row: tr, col: tc, special });
  };

  // ── Sliding helpers ──
  const slide = (dr, dc) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc].color !== color) add(nr, nc);
        break;
      }
      add(nr, nc);
      nr += dr; nc += dc;
    }
  };

  switch (type) {
    case 'P': {
      // Forward
      if (isEmpty(board, r + dir, c)) {
        add(r + dir, c);
        // Double push from starting rank
        const startRank = color === W ? 6 : 1;
        if (r === startRank && isEmpty(board, r + 2 * dir, c)) {
          add(r + 2 * dir, c, 'double-push');
        }
      }
      // Diagonal captures
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (isEnemy(board, tr, tc, color)) add(tr, tc);
        // En-passant
        if (enPassant && tr === enPassant.row && tc === enPassant.col) {
          add(tr, tc, 'en-passant');
        }
      }
      break;
    }
    case 'N': {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const tr = r + dr, tc = c + dc;
        if (inBounds(tr, tc) && !isFriend(board, tr, tc, color)) add(tr, tc);
      }
      break;
    }
    case 'B': {
      for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
      break;
    }
    case 'R': {
      for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    }
    case 'Q': {
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) slide(dr, dc);
      break;
    }
    case 'K': {
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const tr = r + dr, tc = c + dc;
        if (inBounds(tr, tc) && !isFriend(board, tr, tc, color)) add(tr, tc);
      }
      // Castling
      const backRank = color === W ? 7 : 0;
      if (r === backRank && c === 4) {
        const rights = castlingRights[color];
        if (rights.kingSide &&
            !board[backRank][5] && !board[backRank][6] &&
            board[backRank][7] && board[backRank][7].type === 'R') {
          add(backRank, 6, 'castle-king');
        }
        if (rights.queenSide &&
            !board[backRank][3] && !board[backRank][2] && !board[backRank][1] &&
            board[backRank][0] && board[backRank][0].type === 'R') {
          add(backRank, 2, 'castle-queen');
        }
      }
      break;
    }
  }
  return moves;
}

// ── Check detection ───────────────────────────────────────────────────────────
function isAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== byColor) continue;
      // Use raw moves without castling / en-passant for speed
      const moves = rawMoves(board, r, c, null, { [W]:{kingSide:false,queenSide:false}, [B]:{kingSide:false,queenSide:false} });
      if (moves.some(m => m.row === row && m.col === col)) return true;
    }
  }
  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].color === color && board[r][c].type === 'K')
        return { row: r, col: c };
  return null; // shouldn't happen
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isAttacked(board, king.row, king.col, opponent(color));
}

// ── Apply a move on a board copy (returns new board + side-effects) ───────────
function applyMove(board, from, to, special, promoteTo = 'Q') {
  const nb = cloneBoard(board);
  const piece = nb[from.row][from.col];
  let captured = null;

  if (special === 'en-passant') {
    const capturedRow = from.row;
    captured = nb[capturedRow][to.col];
    nb[capturedRow][to.col] = null;
  } else {
    captured = nb[to.row][to.col];
  }

  nb[to.row][to.col] = { ...piece };
  nb[from.row][from.col] = null;

  // Pawn promotion
  const promoRank = piece.color === W ? 0 : 7;
  if (piece.type === 'P' && to.row === promoRank) {
    nb[to.row][to.col].type = promoteTo;
  }

  // Castling: move the rook
  if (special === 'castle-king') {
    const rank = from.row;
    nb[rank][5] = nb[rank][7];
    nb[rank][7] = null;
  }
  if (special === 'castle-queen') {
    const rank = from.row;
    nb[rank][3] = nb[rank][0];
    nb[rank][0] = null;
  }

  return { board: nb, captured };
}

// ── Legal move generation (filters out moves that leave own king in check) ───
function legalMoves(board, r, c, enPassant, castlingRights) {
  const piece = board[r][c];
  if (!piece) return [];
  const raws = rawMoves(board, r, c, enPassant, castlingRights);
  const legal = [];

  for (const move of raws) {
    const { board: nb } = applyMove(board, { row: r, col: c }, move, move.special);
    if (!isInCheck(nb, piece.color)) {
      // Additional check for castling: king must not pass through attacked squares
      if (move.special === 'castle-king') {
        const rank = r;
        if (isInCheck(board, piece.color)) continue;            // can't castle while in check
        if (isAttacked(nb, rank, 5, opponent(piece.color))) continue; // passes through attacked
      }
      if (move.special === 'castle-queen') {
        const rank = r;
        if (isInCheck(board, piece.color)) continue;
        if (isAttacked(nb, rank, 3, opponent(piece.color))) continue;
      }
      legal.push(move);
    }
  }
  return legal;
}

// All legal moves for a color
function allLegalMoves(board, color, enPassant, castlingRights) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].color === color)
        for (const m of legalMoves(board, r, c, enPassant, castlingRights))
          moves.push({ from: { row: r, col: c }, ...m });
  return moves;
}

// ── Algebraic notation ────────────────────────────────────────────────────────
const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

function squareName(r, c) { return FILES[c] + RANKS[r]; }

function moveNotation(board, from, to, special, promoteTo) {
  const piece = board[from.row][from.col];
  const captured = board[to.row][to.col] || (special === 'en-passant' ? true : null);

  if (special === 'castle-king')  return 'O-O';
  if (special === 'castle-queen') return 'O-O-O';

  let notation = '';
  if (piece.type !== 'P') notation += piece.type;
  else if (captured) notation += FILES[from.col];
  if (captured) notation += 'x';
  notation += squareName(to.row, to.col);
  if (piece.type === 'P' && (to.row === 0 || to.row === 7)) notation += '=' + (promoteTo || 'Q');
  return notation;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function pieceCode(color, type) {
  return (color === W ? 'w' : 'b') + type;
}

function renderBoard() {
  const boardEl = $('board');
  boardEl.innerHTML = '';

  const selectedKey = state.selected ? `${state.selected.row},${state.selected.col}` : null;
  const validSet    = new Set(state.validMoves.map(m => `${m.row},${m.col}`));
  const captureSet  = new Set(
    state.validMoves.filter(m => {
      if (m.special === 'en-passant') return true;
      return state.board[m.row][m.col] !== null;
    }).map(m => `${m.row},${m.col}`)
  );
  const lastFromKey = state.lastMove ? `${state.lastMove.from.row},${state.lastMove.from.col}` : null;
  const lastToKey   = state.lastMove ? `${state.lastMove.to.row},${state.lastMove.to.col}`   : null;

  // King in check
  let checkKey = null;
  if (state.status === 'check' || state.status === 'checkmate') {
    const k = findKing(state.board, state.turn);
    if (k) checkKey = `${k.row},${k.col}`;
  }

  const flipOffset = state.flipped ? 7 : 0;
  const flipSign   = state.flipped ? -1 : 1;

  for (let vr = 0; vr < 8; vr++) {
    for (let vc = 0; vc < 8; vc++) {
      const r = flipSign < 0 ? 7 - vr : vr;
      const c = flipSign < 0 ? 7 - vc : vc;
      const key = `${r},${c}`;

      const sq = document.createElement('div');
      sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      sq.dataset.row = r;
      sq.dataset.col = c;

      if (key === selectedKey)   sq.classList.add('selected');
      if (key === lastFromKey)   sq.classList.add('last-move-from');
      if (key === lastToKey)     sq.classList.add('last-move-to');
      if (key === checkKey)      sq.classList.add('in-check');

      if (validSet.has(key)) {
        if (captureSet.has(key)) sq.classList.add('valid-capture');
        else                     sq.classList.add('valid-move');
      }

      const piece = state.board[r][c];
      if (piece) {
        sq.classList.add('has-piece');
        const span = document.createElement('span');
        span.className = `piece ${piece.color}`;
        span.textContent = PIECES[pieceCode(piece.color, piece.type)];
        sq.appendChild(span);
      }

      sq.addEventListener('click', onSquareClick);
      boardEl.appendChild(sq);
    }
  }

  // Update rank/file labels orientation
  updateAxisLabels();
}

function updateAxisLabels() {
  const rankEls = document.querySelectorAll('.rank-labels');
  const fileEl  = document.querySelector('.file-labels');

  const ranks = state.flipped ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'];
  const files = state.flipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];

  rankEls.forEach(el => {
    [...el.children].forEach((span, i) => span.textContent = ranks[i]);
  });
  [...fileEl.children].forEach((span, i) => span.textContent = files[i]);
}

function renderPlayers() {
  // Active turn highlight
  $('player-white').classList.toggle('active', state.turn === W && state.status !== 'checkmate' && state.status !== 'stalemate');
  $('player-black').classList.toggle('active', state.turn === B && state.status !== 'checkmate' && state.status !== 'stalemate');

  // Captured pieces
  const renderCaptured = (color, elId) => {
    const el = $(elId);
    // captured[W] = pieces captured BY white (so they are black pieces)
    el.textContent = state.captured[color]
      .sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a])
      .map(t => PIECES[pieceCode(opponent(color), t)])
      .join('');
  };
  renderCaptured(W, 'captured-white');
  renderCaptured(B, 'captured-black');
}

function renderStatus() {
  const icon  = $('status-icon');
  const text  = $('status-text');
  const sub   = $('status-sub');
  const turnLabel = state.turn === W ? 'White' : 'Black';

  switch (state.status) {
    case 'playing':
      icon.textContent = state.turn === W ? '♔' : '♚';
      text.textContent = `${turnLabel}'s turn`;
      sub.textContent  = '';
      break;
    case 'check':
      icon.textContent = '⚠️';
      text.textContent = `${turnLabel}'s turn`;
      sub.textContent  = 'King is in check!';
      break;
    case 'checkmate':
      icon.textContent = '🏆';
      text.textContent = 'Checkmate!';
      sub.textContent  = `${opponent(state.turn) === W ? 'White' : 'Black'} wins`;
      break;
    case 'stalemate':
      icon.textContent = '🤝';
      text.textContent = 'Stalemate';
      sub.textContent  = "It's a draw!";
      break;
  }
}

function renderMoveLog() {
  const log = $('move-log');
  log.innerHTML = '';
  state.moveLog.forEach((entry, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="move-num">${i+1}.</span>
                    <span class="move-white">${entry.white || ''}</span>
                    <span class="move-black">${entry.black || ''}</span>`;
    log.appendChild(li);
  });
  // Scroll to bottom
  log.scrollTop = log.scrollHeight;
}

function render() {
  renderBoard();
  renderPlayers();
  renderStatus();
  renderMoveLog();
}

// ── Square click handler ──────────────────────────────────────────────────────
function onSquareClick(e) {
  if (state.status === 'checkmate' || state.status === 'stalemate') return;
  if (state.promoCallback) return; // waiting for promotion choice

  const r = parseInt(e.currentTarget.dataset.row);
  const c = parseInt(e.currentTarget.dataset.col);

  if (state.selected) {
    // Check if this is a valid move
    const move = state.validMoves.find(m => m.row === r && m.col === c);
    if (move) {
      executeMove(state.selected.row, state.selected.col, r, c, move.special);
      return;
    }
    // Clicked own piece → re-select
    const piece = state.board[r][c];
    if (piece && piece.color === state.turn) {
      state.selected  = { row: r, col: c };
      state.validMoves = legalMoves(state.board, r, c, state.enPassant, state.castlingRights);
      render();
      return;
    }
    // Clicked elsewhere → deselect
    state.selected  = null;
    state.validMoves = [];
    render();
    return;
  }

  // No selection yet
  const piece = state.board[r][c];
  if (piece && piece.color === state.turn) {
    state.selected  = { row: r, col: c };
    state.validMoves = legalMoves(state.board, r, c, state.enPassant, state.castlingRights);
    render();
  }
}

// ── Execute a move ────────────────────────────────────────────────────────────
function executeMove(fr, fc, tr, tc, special, promoteTo) {
  // Check if pawn promotion is needed and we don't have a promoteTo yet
  const piece = state.board[fr][fc];
  const promoRank = piece.color === W ? 0 : 7;
  if (piece.type === 'P' && tr === promoRank && !promoteTo) {
    // Show promotion modal
    showPromoModal(piece.color, (chosen) => {
      executeMove(fr, fc, tr, tc, special, chosen);
    });
    return;
  }

  // Save snapshot for undo
  state.history.push(snapshotState());

  // Determine notation before applying
  const notation = moveNotation(state.board, { row: fr, col: fc }, { row: tr, col: tc }, special, promoteTo);

  // Apply move
  const { board: nb, captured } = applyMove(
    state.board, { row: fr, col: fc }, { row: tr, col: tc }, special, promoteTo || 'Q'
  );
  state.board = nb;

  // Track captured piece
  if (captured && captured !== true) {
    state.captured[state.turn].push(captured.type);
  } else if (special === 'en-passant') {
    state.captured[state.turn].push('P');
  }

  // Update castling rights
  updateCastlingRights(fr, fc, tr, tc);

  // Update en-passant target
  state.enPassant = null;
  if (special === 'double-push') {
    const epRow = piece.color === W ? fr - 1 : fr + 1;
    state.enPassant = { row: epRow, col: fc };
  }

  // Update last move
  state.lastMove = { from: { row: fr, col: fc }, to: { row: tr, col: tc } };

  // Record in move log
  if (state.turn === W) {
    state.moveLog.push({ white: notation, black: '' });
  } else {
    if (state.moveLog.length === 0) state.moveLog.push({ white: '', black: '' });
    state.moveLog[state.moveLog.length - 1].black = notation;
  }

  // Switch turns
  state.turn = opponent(state.turn);
  state.selected  = null;
  state.validMoves = [];

  // Check game status
  updateStatus();

  // Append check/mate suffix to notation in log
  if (state.status === 'checkmate') {
    const entry = state.moveLog[state.moveLog.length - 1];
    if (state.turn === W) entry.white += '#';
    else entry.black += '#';
  } else if (state.status === 'check') {
    const entry = state.moveLog[state.moveLog.length - 1];
    if (state.turn === W) entry.white += '+';
    else entry.black += '+';
  }

  render();

  // Show game-over modal after render
  if (state.status === 'checkmate') {
    setTimeout(showCheckmate, 400);
  } else if (state.status === 'stalemate') {
    setTimeout(showStalemate, 400);
  }
}

function updateCastlingRights(fr, fc, tr, tc) {
  // King moves
  if (state.board[tr][tc]?.type === 'K' || (fr === 7 && fc === 4) || (fr === 0 && fc === 4)) {
    const color = fr === 7 ? W : B;
    state.castlingRights[color].kingSide  = false;
    state.castlingRights[color].queenSide = false;
  }
  // Rook moves or captured
  const rookSquares = [
    { r: 7, c: 0, color: W, side: 'queenSide' },
    { r: 7, c: 7, color: W, side: 'kingSide'  },
    { r: 0, c: 0, color: B, side: 'queenSide' },
    { r: 0, c: 7, color: B, side: 'kingSide'  },
  ];
  for (const rs of rookSquares) {
    if ((fr === rs.r && fc === rs.c) || (tr === rs.r && tc === rs.c)) {
      state.castlingRights[rs.color][rs.side] = false;
    }
  }
}

function updateStatus() {
  const moves = allLegalMoves(state.board, state.turn, state.enPassant, state.castlingRights);
  if (moves.length === 0) {
    state.status = isInCheck(state.board, state.turn) ? 'checkmate' : 'stalemate';
  } else if (isInCheck(state.board, state.turn)) {
    state.status = 'check';
  } else {
    state.status = 'playing';
  }
}

// ── Promotion modal ───────────────────────────────────────────────────────────
function showPromoModal(color, callback) {
  state.promoCallback = callback;
  const modal = $('promo-modal');
  const choices = $('promo-choices');
  choices.innerHTML = '';

  const options = ['Q', 'R', 'B', 'N'];
  for (const type of options) {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.textContent = PIECES[pieceCode(color, type)];
    btn.title = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }[type];
    btn.addEventListener('click', () => {
      modal.hidden = true;
      const cb = state.promoCallback;
      state.promoCallback = null;
      cb(type);
    });
    choices.appendChild(btn);
  }

  modal.hidden = false;
}

// ── Game-over modals ──────────────────────────────────────────────────────────
function showCheckmate() {
  const winner = opponent(state.turn); // turn already switched
  $('gameover-icon').textContent  = '🏆';
  $('gameover-title').textContent = 'Checkmate!';
  $('gameover-sub').textContent   = `${winner === W ? 'White' : 'Black'} wins!`;
  $('gameover-modal').hidden = false;
}

function showStalemate() {
  $('gameover-icon').textContent  = '🤝';
  $('gameover-title').textContent = 'Stalemate!';
  $('gameover-sub').textContent   = "It's a draw — no legal moves!";
  $('gameover-modal').hidden = false;
}

// ── Undo ──────────────────────────────────────────────────────────────────────
function undo() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  // Restore all fields
  state.board          = prev.board;
  state.turn           = prev.turn;
  state.selected       = null;
  state.validMoves     = [];
  state.lastMove       = prev.lastMove;
  state.enPassant      = prev.enPassant;
  state.castlingRights = prev.castlingRights;
  state.moveLog        = prev.moveLog;
  state.captured       = prev.captured;
  state.status         = prev.status;
  state.promoCallback  = null;
  $('gameover-modal').hidden = true;
  $('promo-modal').hidden    = true;
  render();
}

// ── New game ──────────────────────────────────────────────────────────────────
function newGame() {
  const flipped = state.flipped;
  initState();
  state.flipped = flipped;
  $('gameover-modal').hidden = true;
  $('promo-modal').hidden    = true;
  render();
}

// ── Initialise controls ───────────────────────────────────────────────────────
$('new-game-btn').addEventListener('click', newGame);
$('play-again-btn').addEventListener('click', newGame);
$('undo-btn').addEventListener('click', undo);
$('flip-btn').addEventListener('click', () => {
  state.flipped = !state.flipped;
  render();
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initState();
render();

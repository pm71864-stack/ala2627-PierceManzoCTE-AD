const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const choices = document.querySelectorAll('.game-choice');
const difficultyPanel = document.querySelector('#difficulty-panel');
const difficultyChoices = document.querySelectorAll('.difficulty-choice');
const startCard = document.querySelector('#start-card');
const startButton = document.querySelector('#start-button');
const restartButton = document.querySelector('#restart-button');
const title = document.querySelector('#game-title');
const label = document.querySelector('#game-label');
const scoreElement = document.querySelector('#score');
const scoreLabel = document.querySelector('#score-label');
const controlsCopy = document.querySelector('#controls-copy');
const touchButtons = document.querySelectorAll('.touch-controls button');
const colors = { lime: '#d5f36b', orange: '#ff7a59', cyan: '#6de8e0', ink: '#f4f0e8', muted: '#a8a59e' };
const pongSettings = { easy: { speed: 4, aiSkill: .035, serveY: 2.4 }, medium: { speed: 5, aiSkill: .055, serveY: 3 }, hard: { speed: 6.5, aiSkill: .085, serveY: 4 } };
const extraModes = ['meteor', 'snake', 'memory', 'drift', 'dungeon', 'bubble', 'laser', 'orbit', 'stack', 'color'];
const extraDifficulty = { easy: { speed: .7, count: 9, time: 1500 }, medium: { speed: 1, count: 12, time: 1100 }, hard: { speed: 1.35, count: 16, time: 780 } };
let mode = 'dash';
let difficulty = 'medium';
let running = false;
let score = 0;
let frame = 0;
let keys = {};
let game;
let animationFrame;
let audioContext;
let blackjackButtons;
let bankroll = 250;

function setScore(value) {
  score = value;
  scoreElement.textContent = String(Math.max(0, Math.floor(value))).padStart(4, '0');
}

function setStartCard(heading, message, buttonText) {
  startCard.querySelector('h3').textContent = heading;
  startCard.querySelector('p').textContent = message;
  startButton.textContent = buttonText;
}

function createAudio() {
  if (!audioContext && window.AudioContext) audioContext = new AudioContext();
  if (audioContext && audioContext.state === 'suspended') audioContext.resume();
}

function beatSound() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const kick = audioContext.createOscillator();
  const gain = audioContext.createGain();
  kick.type = 'sine';
  kick.frequency.setValueAtTime(130, now);
  kick.frequency.exponentialRampToValueAtTime(55, now + .12);
  gain.gain.setValueAtTime(.18, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + .16);
  kick.connect(gain);
  gain.connect(audioContext.destination);
  kick.start(now);
  kick.stop(now + .16);
}

function reset() {
  cancelAnimationFrame(animationFrame);
  running = false;
  frame = 0;
  setScore(0);
  scoreLabel.textContent = 'SCORE';
  difficultyPanel.hidden = true;
  startCard.classList.remove('hidden');
  removeBlackjackButtons();

  if (mode === 'dash') {
    title.textContent = 'Neon Dash';
    label.textContent = '01 / NEON DASH';
    controlsCopy.textContent = 'SPACE / CLICK - JUMP ON THE BEAT';
    setStartCard('Ready to run?', 'The obstacles move with the beat. Jump when it drops.', 'Start game');
    game = { x: 130, y: 390, vy: 0, ground: 390, speed: 5, obstacles: [], beatLength: 42, beat: 0, beatPulse: 0, lastBeat: -999 };
  }

  if (mode === 'shooter') {
    title.textContent = 'Starfall';
    label.textContent = '02 / STARFALL';
    controlsCopy.textContent = 'ARROWS / A D - MOVE - SPACE - FIRE';
    setStartCard('Defend the sky?', 'Move with arrows and fire with Space.', 'Launch mission');
    game = { x: 450, bullets: [], enemies: [], tick: 0 };
  }

  if (mode === 'pong') {
    const settings = pongSettings[difficulty];
    difficultyPanel.hidden = false;
    title.textContent = 'Pixel Pong';
    label.textContent = `03 / PIXEL PONG - ${difficulty.toUpperCase()}`;
    controlsCopy.textContent = 'W / S OR UP / DOWN - MOVE';
    setStartCard('First to 7 wins', 'Choose a difficulty, then return the ball.', 'Serve');
    game = { player: 210, ai: 210, speed: settings.speed, aiSkill: settings.aiSkill, serveY: settings.serveY, ball: { x: 450, y: 250, vx: settings.speed, vy: settings.serveY }, playerScore: 0, aiScore: 0 };
  }

  if (mode === 'hoops') {
    title.textContent = 'Street Hoops';
    label.textContent = '04 / STREET HOOPS';
    controlsCopy.textContent = 'A / D - AIM - HOLD SPACE - CHARGE - RELEASE - SHOOT';
    setStartCard('Find your rhythm', 'Aim, hold Space to charge, then release for power.', 'Check the court');
    game = { time: 30, aim: 700, hoopX: 730, shots: 0, makes: 0, flying: false, charging: false, charge: 72, chargeDirection: 1, shotPower: 72, ball: { x: 170, y: 400, t: 0 } };
  }

  if (mode === 'blackjack') {
    title.textContent = 'Blackjack 21';
    label.textContent = '05 / BLACKJACK 21';
    scoreLabel.textContent = 'BANKROLL';
    controlsCopy.textContent = 'CHOOSE A CHIP - DEAL - H - HIT - S - STAND';
    setStartCard('Beat the dealer', 'Choose your chips, then deal a hand.', 'Deal cards');
    game = { deck: [], player: [], dealer: [], revealed: false, over: false, message: 'Choose a chip to bet.', bankroll, bet: 0 };
    createBlackjackButtons();
    setScore(bankroll);
  }

  if (mode === 'reflex') {
    title.textContent = 'Reflex Grid';
    label.textContent = '06 / REFLEX GRID';
    controlsCopy.textContent = 'CLICK THE TARGET - SPACE ALSO WORKS';
    setStartCard('How fast are you?', 'Hit ten targets before the clock catches you.', 'Start test');
    game = { round: 0, hits: 0, target: null, deadline: 0, best: 0 };
  }

  if (extraModes.includes(mode)) resetExtra();

  draw();
}

function start() {
  if (running) return;
  if (mode === 'blackjack' && game.bet < 1) {
    setStartCard('Choose a chip', 'Pick a digital chip before dealing.', 'Deal cards');
    return;
  }
  createAudio();
  running = true;
  startCard.classList.add('hidden');
  if (mode === 'blackjack') dealBlackjack();
  if (mode === 'reflex') spawnTarget();
  game.startedAt = performance.now();
  animationFrame = requestAnimationFrame(loop);
}

function finish(message) {
  running = false;
  setStartCard(message, `Score: ${Math.floor(score)} - press play again to run it back.`, 'Play again');
  startCard.classList.remove('hidden');
  if (mode === 'blackjack') disableBlackjackButtons();
}

function loop(timestamp) {
  if (!running) return;
  update(timestamp);
  draw();
  animationFrame = requestAnimationFrame(loop);
}

function text(value, x, y, size, color = colors.ink) {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.fillText(value, x, y);
}

function background() {
  ctx.fillStyle = '#081012';
  ctx.fillRect(0, 0, 900, 500);
  ctx.strokeStyle = 'rgba(213,243,107,.08)';
  for (let x = 0; x < 900; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 500);
    ctx.stroke();
  }
  for (let y = 0; y < 500; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(900, y);
    ctx.stroke();
  }
}

function update(timestamp) {
  if (mode === 'dash') updateDash();
  if (mode === 'shooter') updateShooter();
  if (mode === 'pong') updatePong();
  if (mode === 'hoops') updateHoops();
  if (mode === 'blackjack') updateBlackjack();
  if (mode === 'reflex') updateReflex(timestamp);
  if (extraModes.includes(mode)) updateExtra(timestamp);
}

function draw() {
  if (mode === 'dash') drawDash();
  if (mode === 'shooter') drawShooter();
  if (mode === 'pong') drawPong();
  if (mode === 'hoops') drawHoops();
  if (mode === 'blackjack') drawBlackjack();
  if (mode === 'reflex') drawReflex();
  if (extraModes.includes(mode)) drawExtra();
  scoreElement.textContent = String(Math.max(0, Math.floor(score))).padStart(4, '0');
}

function updateDash() {
  frame++;
  game.y += game.vy;
  game.vy += .7;
  if (game.y > game.ground) {
    game.y = game.ground;
    game.vy = 0;
  }
  if (frame % game.beatLength === 0) {
    game.beat++;
    game.beatPulse = 1;
    game.lastBeat = frame;
    beatSound();
    const heights = [55, 72, 48, 82];
    game.obstacles.push({ x: 920, w: 28, h: heights[(game.beat - 1) % heights.length] });
  }
  game.beatPulse = Math.max(0, game.beatPulse - .08);
  game.obstacles.forEach(obstacle => obstacle.x -= game.speed);
  game.obstacles = game.obstacles.filter(obstacle => obstacle.x > -50);
  for (const obstacle of game.obstacles) {
    if (game.x + 30 > obstacle.x && game.x < obstacle.x + obstacle.w && game.y + 30 > game.ground - obstacle.h) {
      finish('Run ended');
      return;
    }
  }
  setScore(frame / 5);
}

function jump() {
  if (mode === 'dash' && game.y === game.ground) {
    if (frame - game.lastBeat <= 8) score += 5;
    game.vy = -13;
  }
}

function drawDash() {
  background();
  ctx.fillStyle = '#162321';
  ctx.fillRect(0, 420, 900, 80);
  ctx.strokeStyle = colors.lime;
  ctx.beginPath();
  ctx.moveTo(0, 420);
  ctx.lineTo(900, 420);
  ctx.stroke();
  if (game.beatPulse > 0) {
    ctx.fillStyle = `rgba(213,243,107,${game.beatPulse * .12})`;
    ctx.fillRect(0, 0, 900, 500);
  }
  ctx.fillStyle = colors.orange;
  ctx.fillRect(game.x, game.y, 30, 30);
  ctx.fillStyle = colors.lime;
  ctx.fillRect(game.x + 7, game.y + 7, 6, 6);
  ctx.fillStyle = colors.cyan;
  game.obstacles.forEach(obstacle => ctx.fillRect(obstacle.x, game.ground + 30 - obstacle.h, obstacle.w, obstacle.h));
  text('RUN // KEEP THE BEAT', 28, 40, 16, colors.muted);
  text(`DISTANCE ${Math.floor(score)}`, 700, 40, 14, colors.lime);
  text(`BEAT ${String(game.beat).padStart(2, '0')}`, 28, 472, 13, game.beatPulse > 0 ? colors.lime : colors.muted);
}

function updateShooter() {
  game.tick++;
  if (keys.ArrowLeft || keys.a) game.x = Math.max(25, game.x - 7);
  if (keys.ArrowRight || keys.d) game.x = Math.min(875, game.x + 7);
  game.bullets.forEach(bullet => bullet.y -= 10);
  game.enemies.forEach(enemy => enemy.y += enemy.speed);
  game.bullets = game.bullets.filter(bullet => bullet.y > -20);
  if (game.tick % 45 === 0) game.enemies.push({ x: 30 + Math.random() * 840, y: -25, speed: 1.5 + Math.random() * 2 });
  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      if (Math.abs(bullet.x - enemy.x) < 22 && Math.abs(bullet.y - enemy.y) < 22) {
        bullet.y = -40;
        enemy.y = 600;
        score += 10;
      }
    }
  }
  game.enemies = game.enemies.filter(enemy => enemy.y < 530);
  if (game.enemies.some(enemy => Math.abs(enemy.x - game.x) < 28 && enemy.y > 440)) finish('Ship destroyed');
}

function fire() {
  if (mode === 'shooter' && running) game.bullets.push({ x: game.x, y: 445 });
}

function drawShooter() {
  background();
  for (let index = 0; index < 60; index++) {
    ctx.fillStyle = index % 3 === 0 ? colors.lime : '#52716b';
    ctx.fillRect((index * 137) % 900, (index * 71 + game.tick) % 470, 2, 2);
  }
  ctx.fillStyle = colors.cyan;
  ctx.beginPath();
  ctx.moveTo(game.x, 420);
  ctx.lineTo(game.x - 22, 466);
  ctx.lineTo(game.x + 22, 466);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.orange;
  game.bullets.forEach(bullet => ctx.fillRect(bullet.x - 2, bullet.y, 4, 13));
  game.enemies.forEach(enemy => {
    ctx.fillStyle = colors.orange;
    ctx.fillRect(enemy.x - 17, enemy.y - 13, 34, 26);
    ctx.fillStyle = colors.lime;
    ctx.fillRect(enemy.x - 7, enemy.y - 4, 5, 5);
    ctx.fillRect(enemy.x + 3, enemy.y - 4, 5, 5);
  });
  text(`WAVE ${Math.ceil(game.tick / 180)}`, 28, 40, 16, colors.muted);
  text('10 PTS / HIT', 750, 40, 14, colors.lime);
}

function serveBall(direction) {
  return { x: 450, y: 250, vx: game.speed * direction, vy: game.serveY * (Math.random() > .5 ? 1 : -1) };
}

function updatePong() {
  if (keys.ArrowUp || keys.w) game.player = Math.max(58, game.player - 7);
  if (keys.ArrowDown || keys.s) game.player = Math.min(442, game.player + 7);
  game.ai += (game.ball.y - game.ai) * game.aiSkill;
  game.ball.x += game.ball.vx;
  game.ball.y += game.ball.vy;
  if (game.ball.y < 12 || game.ball.y > 488) game.ball.vy *= -1;
  if (game.ball.x < 42 && Math.abs(game.ball.y - game.player) < 60) {
    game.ball.vx = Math.abs(game.ball.vx) + .2;
    score++;
  }
  if (game.ball.x > 858 && Math.abs(game.ball.y - game.ai) < 60) game.ball.vx = -Math.abs(game.ball.vx) - .2;
  if (game.ball.x < 0) {
    game.aiScore++;
    game.ball = serveBall(1);
  }
  if (game.ball.x > 900) {
    game.playerScore++;
    game.ball = serveBall(-1);
  }
  if (game.playerScore >= 7 || game.aiScore >= 7) finish(game.playerScore >= 7 ? 'You win!' : 'Game over');
}

function drawPong() {
  background();
  ctx.strokeStyle = 'rgba(244,240,232,.3)';
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(450, 0);
  ctx.lineTo(450, 500);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colors.lime;
  ctx.fillRect(28, game.player - 55, 14, 110);
  ctx.fillStyle = colors.orange;
  ctx.fillRect(858, game.ai - 55, 14, 110);
  ctx.fillStyle = colors.ink;
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, 10, 0, Math.PI * 2);
  ctx.fill();
  text(String(game.playerScore), 390, 65, 42, colors.lime);
  text(String(game.aiScore), 495, 65, 42, colors.orange);
  text(`${difficulty.toUpperCase()} // FIRST TO 7`, 28, 40, 16, colors.muted);
}

function updateHoops() {
  game.time -= 1 / 60;
  if (game.time <= 0) {
    game.time = 0;
    finish('Buzzer');
    return;
  }
  if (keys.a || keys.ArrowLeft) game.aim = Math.max(620, game.aim - 5);
  if (keys.d || keys.ArrowRight) game.aim = Math.min(820, game.aim + 5);
  if (game.charging) {
    game.charge += game.chargeDirection * 2.4;
    if (game.charge >= 100 || game.charge <= 0) game.chargeDirection *= -1;
  }
  if (game.flying) {
    game.ball.t += .045;
    const progress = game.ball.t;
    game.ball.x = 170 + (game.hoopX - 170) * progress;
    game.ball.y = 400 - Math.sin(progress * Math.PI) * 230;
    if (progress >= 1) {
      game.flying = false;
      game.shots++;
      const aimGood = Math.abs(game.aim - game.hoopX) < 48;
      const powerGood = Math.abs(game.shotPower - 72) < 22;
      if (aimGood && powerGood) game.makes++;
      setScore(game.makes * 2);
      game.ball = { x: 170, y: 400, t: 0 };
    }
  }
}

function shootHoop() {
  if (mode === 'hoops' && running && !game.flying) {
    game.charging = false;
    game.shotPower = game.charge;
    game.flying = true;
    game.ball.t = 0;
  }
}

function drawHoops() {
  background();
  ctx.fillStyle = '#b66a3c';
  ctx.fillRect(0, 410, 900, 90);
  ctx.fillStyle = '#e6d5b8';
  ctx.fillRect(660, 155, 12, 180);
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(672, 155, 95, 76);
  ctx.strokeStyle = colors.orange;
  ctx.beginPath();
  ctx.arc(game.hoopX, 245, 27, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colors.orange;
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.ink;
  ctx.fillRect(game.aim - 26, 440, 52, 4);
  ctx.strokeStyle = colors.orange;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(185, 380);
  ctx.lineTo(game.aim - 22, 380);
  ctx.stroke();
  ctx.fillStyle = colors.orange;
  ctx.beginPath();
  ctx.moveTo(game.aim - 10, 380);
  ctx.lineTo(game.aim - 30, 369);
  ctx.lineTo(game.aim - 30, 391);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1b2925';
  ctx.fillRect(28, 80, 180, 12);
  ctx.fillStyle = colors.cyan;
  ctx.fillRect(28, 80, Math.max(0, game.aim - 620) * .9, 12);
  ctx.strokeStyle = colors.ink;
  ctx.strokeRect(28, 80, 180, 12);
  ctx.fillStyle = '#1b2925';
  ctx.fillRect(28, 116, 180, 12);
  ctx.fillStyle = game.charging ? colors.orange : colors.lime;
  ctx.fillRect(28, 116, game.charge * 1.8, 12);
  ctx.strokeStyle = colors.ink;
  ctx.strokeRect(28, 116, 180, 12);
  text('AIM', 220, 91, 12, colors.cyan);
  text('POWER', 220, 127, 12, colors.orange);
  text('FACING', 220, 145, 12, colors.orange);
  text(`TIME ${Math.ceil(game.time)}`, 28, 40, 16, colors.muted);
  text(`${game.makes} BUCKETS`, 735, 40, 14, colors.lime);
}

function newDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  suits.forEach(suit => ranks.forEach(rank => deck.push({ suit, rank })));
  return deck.sort(() => Math.random() - .5);
}

function cardValue(hand) {
  let total = 0;
  let aces = 0;
  hand.forEach(card => {
    if (card.rank === 'A') { total += 11; aces++; }
    else if (['K', 'Q', 'J'].includes(card.rank)) total += 10;
    else total += Number(card.rank);
  });
  while (total > 21 && aces) { total -= 10; aces--; }
  return total;
}

function dealBlackjack() {
  if (game.bet > bankroll) game.bet = bankroll;
  if (game.bet < 1) {
    finish('Out of chips');
    return;
  }
  bankroll -= game.bet;
  game.bankroll = bankroll;
  game.deck = newDeck();
  game.player = [game.deck.pop(), game.deck.pop()];
  game.dealer = [game.deck.pop(), game.deck.pop()];
  game.revealed = false;
  game.over = false;
  game.message = 'Hit or stand.';
  createBlackjackButtons();
  blackjackButtons.classList.add('hand-active');
  blackjackButtons.querySelectorAll('[data-chip]').forEach(button => button.disabled = true);
  blackjackButtons.querySelectorAll('[data-card-action]').forEach(button => button.disabled = false);
  setScore(bankroll);
}

function setBet(amount) {
  if (mode !== 'blackjack' || running) return;
  game.bet = Math.min(amount, bankroll);
  game.message = `Bet set to $${game.bet}. Deal when ready.`;
  blackjackButtons.querySelectorAll('[data-chip]').forEach(button => button.classList.toggle('selected', Number(button.dataset.chip) === game.bet));
  setStartCard('Chip locked', `Bet: $${game.bet}. Deal your hand when ready.`, 'Deal cards');
  draw();
}

function hitBlackjack() {
  if (!running || mode !== 'blackjack' || game.over) return;
  game.player.push(game.deck.pop());
  setScore(bankroll);
  if (cardValue(game.player) > 21) {
    game.message = 'Bust. Dealer wins.';
    game.over = true;
    finish('Bust');
  }
}

function standBlackjack() {
  if (!running || mode !== 'blackjack' || game.over) return;
  game.revealed = true;
  while (cardValue(game.dealer) < 17) game.dealer.push(game.deck.pop());
  const playerTotal = cardValue(game.player);
  const dealerTotal = cardValue(game.dealer);
  game.over = true;
  if (dealerTotal > 21 || playerTotal > dealerTotal) { bankroll += game.bet * 2; game.bankroll = bankroll; game.message = 'You beat the dealer.'; setScore(bankroll); finish('You win!'); }
  else if (playerTotal === dealerTotal) { bankroll += game.bet; game.bankroll = bankroll; game.message = 'Push. Nobody wins.'; setScore(bankroll); finish('Push'); }
  else { game.message = 'Dealer takes it.'; finish('Dealer wins'); }
}

function createBlackjackButtons() {
  if (blackjackButtons) return;
  blackjackButtons = document.createElement('span');
  blackjackButtons.className = 'blackjack-buttons';
  blackjackButtons.innerHTML = '<span class="chip-label">CHIPS</span><button type="button" data-chip="5">$5</button><button type="button" data-chip="10">$10</button><button type="button" data-chip="25">$25</button><button type="button" data-chip="50">$50</button><button type="button" data-chip="100">$100</button><button type="button" data-chip="200">$200</button><button type="button" data-card-action="hit" disabled>Hit</button><button type="button" data-card-action="stand" disabled>Stand</button>';
  document.querySelector('.controls').prepend(blackjackButtons);
  blackjackButtons.querySelectorAll('[data-chip]').forEach(button => button.addEventListener('click', () => setBet(Number(button.dataset.chip))));
  blackjackButtons.querySelector('[data-card-action="hit"]').addEventListener('click', hitBlackjack);
  blackjackButtons.querySelector('[data-card-action="stand"]').addEventListener('click', standBlackjack);
}

function removeBlackjackButtons() {
  if (blackjackButtons) blackjackButtons.remove();
  blackjackButtons = null;
}

function disableBlackjackButtons() {
  if (blackjackButtons) blackjackButtons.querySelectorAll('button').forEach(button => button.disabled = true);
}

function updateBlackjack() {}

function drawCard(card, x, y, hidden = false) {
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(x, y, 74, 100);
  ctx.strokeStyle = colors.orange;
  ctx.strokeRect(x, y, 74, 100);
  if (hidden) text('?', x + 29, y + 63, 30, colors.orange);
  else {
    const color = ['♥', '♦'].includes(card.suit) ? colors.orange : '#19201e';
    text(card.rank, x + 12, y + 34, 18, color);
    text(card.suit, x + 27, y + 70, 28, color);
  }
}

function drawBlackjack() {
  background();
  text(`BANKROLL $${bankroll}`, 570, 48, 15, colors.lime);
  text(`BET $${game.bet}`, 750, 48, 15, colors.orange);
  text('DEALER', 40, 48, 15, colors.muted);
  game.dealer.forEach((card, index) => drawCard(card, 40 + index * 88, 70, index === 1 && !game.revealed));
  text('PLAYER', 40, 278, 15, colors.muted);
  game.player.forEach((card, index) => drawCard(card, 40 + index * 88, 300));
  text(`DEALER TOTAL ${game.revealed ? cardValue(game.dealer) : '?'}`, 570, 110, 15, colors.orange);
  text(`YOUR TOTAL ${cardValue(game.player)}`, 570, 340, 15, colors.lime);
  text(game.message, 570, 390, 15, colors.ink);
}

function spawnTarget() {
  game.round++;
  game.target = { x: 100 + Math.random() * 700, y: 100 + Math.random() * 300, radius: 22 };
  game.deadline = performance.now() + Math.max(450, 1250 - game.round * 55);
}

function hitTarget() {
  if (mode !== 'reflex' || !running || !game.target) return;
  game.hits++;
  setScore(game.hits * 10);
  if (game.hits >= 10) { finish('Grid cleared'); return; }
  spawnTarget();
}

function updateReflex(timestamp) {
  if (timestamp > game.deadline) {
    finish('Too slow');
    return;
  }
}

function drawReflex() {
  background();
  if (game.target) {
    ctx.strokeStyle = colors.lime;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(game.target.x, game.target.y, game.target.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.orange;
    ctx.beginPath();
    ctx.arc(game.target.x, game.target.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  text(`TARGET ${game.hits + 1} / 10`, 28, 40, 16, colors.muted);
  text('CLICK THE RING', 700, 40, 14, colors.lime);
}

function extraConfig() {
  return extraDifficulty[difficulty];
}

function resetExtra() {
  const config = extraConfig();
  difficultyPanel.hidden = false;
  const details = {
    meteor: ['Meteor Run', 'DODGE THE STORM', 'ARROWS / A D - MOVE', 'Stay alive as long as possible.'],
    snake: ['Neon Serpent', 'EAT THE LIGHT', 'ARROWS / W A S D - STEER', 'Collect sparks without crossing yourself.'],
    memory: ['Memory Matrix', 'FLIP THE PATTERN', 'CLICK CARDS - MATCH PAIRS', 'Find every matching signal.'],
    drift: ['Drift Circuit', 'OWN THE CORNERS', 'ARROWS / A D - STEER', 'Thread the cones for distance.'],
    dungeon: ['Crystal Quest', 'LIGHT THE RUINS', 'ARROWS / W A S D - MOVE', 'Collect crystals and avoid sentries.'],
    bubble: ['Bubble Pop', 'CLEAR THE CLUSTER', 'CLICK BUBBLES - SPACE - POP', 'Pop every bubble before the timer fades.'],
    laser: ['Laser Lock', 'BREAK THE GRID', 'ARROWS / A D - MOVE - SPACE - FIRE', 'Clear the drones before they reach you.'],
    orbit: ['Orbit Shift', 'CATCH THE SATELLITES', 'ARROWS / A D - SHIFT ORBIT', 'Intercept satellites as they swing past.'],
    stack: ['Perfect Stack', 'BUILD THE SKYLINE', 'CLICK / SPACE - DROP BLOCK', 'Land each block on the last.'],
    color: ['Color Rush', 'HIT THE SIGNAL', 'CLICK THE MATCHING COLOR', 'React before the signal changes.']
  }[mode];
  title.textContent = details[0];
  label.textContent = `0${7 + extraModes.indexOf(mode)} / ${details[1]} - ${difficulty.toUpperCase()}`;
  controlsCopy.textContent = details[2];
  setStartCard('Ready to play?', details[3], 'Start game');
  game = { tick: 0, config };
  if (mode === 'meteor') game.player = { x: 450, y: 420 }, game.rocks = [];
  if (mode === 'snake') { game.cells = [{ x: 9, y: 8 }, { x: 8, y: 8 }, { x: 7, y: 8 }]; game.dir = { x: 1, y: 0 }; game.next = { x: 1, y: 0 }; game.food = randomCell(game.cells); game.tick = 0; }
  if (mode === 'memory') { const size = difficulty === 'hard' ? 6 : difficulty === 'easy' ? 3 : 4; game.size = size; game.cards = shuffle([...Array((size * size) / 2).keys(), ...Array((size * size) / 2).keys()]); game.revealed = []; game.matched = []; game.flipAt = 0; }
  if (mode === 'drift') game.player = { x: 450, y: 405 }, game.obstacles = [], game.lane = 0;
  if (mode === 'dungeon') game.player = { x: 1, y: 1 }, game.crystals = [{ x: 8, y: 2 }, { x: 3, y: 6 }, { x: 12, y: 8 }], game.enemies = [{ x: 12, y: 2 }, { x: 6, y: 7 }];
  if (mode === 'bubble') game.bubbles = Array.from({ length: config.count }, () => ({ x: 80 + Math.random() * 740, y: 100 + Math.random() * 310, r: 18 + Math.random() * 16, hue: Math.random() * 360 }));
  if (mode === 'laser') game.player = 450, game.bullets = [], game.drones = [];
  if (mode === 'orbit') game.angle = 0, game.offset = 0, game.satellites = Array.from({ length: config.count - 4 }, (_, index) => ({ angle: index * 1.5, radius: 90 + index * 24, hit: false }));
  if (mode === 'stack') game.blocks = [{ x: 300, w: 300, y: 460 }], game.current = { x: 300, w: 300, y: 410, dir: 1 };
  if (mode === 'color') { game.round = 0; game.options = []; nextColor(); }
}

function shuffle(items) { return items.sort(() => Math.random() - .5); }
function randomCell(occupied) { let cell; do { cell = { x: 1 + Math.floor(Math.random() * 16), y: 1 + Math.floor(Math.random() * 10) }; } while (occupied.some(item => item.x === cell.x && item.y === cell.y)); return cell; }
function updateExtra(timestamp) {
  const config = game.config;
  game.tick++;
  if (mode === 'meteor') { if (keys.ArrowLeft || keys.a) game.player.x -= 6; if (keys.ArrowRight || keys.d) game.player.x += 6; game.player.x = Math.max(28, Math.min(872, game.player.x)); if (game.tick % Math.max(16, Math.floor(34 / config.speed)) === 0) game.rocks.push({ x: 20 + Math.random() * 860, y: -30, r: 12 + Math.random() * 22 }); game.rocks.forEach(rock => rock.y += 3.4 * config.speed); game.rocks = game.rocks.filter(rock => rock.y < 540); if (game.rocks.some(rock => Math.hypot(rock.x - game.player.x, rock.y - game.player.y) < rock.r + 22)) finish('Storm hit'); else setScore(game.tick / 3); }
  if (mode === 'snake' && game.tick % Math.max(5, Math.floor(10 / config.speed)) === 0) { if (keys.ArrowUp || keys.w) game.next = { x: 0, y: -1 }; if (keys.ArrowDown || keys.s) game.next = { x: 0, y: 1 }; if (keys.ArrowLeft || keys.a) game.next = { x: -1, y: 0 }; if (keys.ArrowRight || keys.d) game.next = { x: 1, y: 0 }; if (game.next.x !== -game.dir.x || game.next.y !== -game.dir.y) game.dir = game.next; const head = { x: game.cells[0].x + game.dir.x, y: game.cells[0].y + game.dir.y }; if (head.x < 0 || head.x > 17 || head.y < 0 || head.y > 11 || game.cells.some(cell => cell.x === head.x && cell.y === head.y)) { finish('Serpent crashed'); return; } game.cells.unshift(head); if (head.x === game.food.x && head.y === game.food.y) { score += 10; game.food = randomCell(game.cells); } else game.cells.pop(); setScore(score); }
  if (mode === 'memory' && game.revealed.length === 2 && game.tick > game.flipAt + 35) { if (game.cards[game.revealed[0]] === game.cards[game.revealed[1]]) { game.matched.push(...game.revealed); score += 20; } game.revealed = []; if (game.matched.length === game.cards.length) finish('Matrix solved'); }
  if (mode === 'drift') { if (keys.ArrowLeft || keys.a) game.player.x -= 5; if (keys.ArrowRight || keys.d) game.player.x += 5; game.player.x = Math.max(45, Math.min(855, game.player.x)); if (game.tick % 42 === 0) game.obstacles.push({ x: 50 + Math.random() * 800, y: -20, w: 22 }); game.obstacles.forEach(obstacle => obstacle.y += 3.5 * config.speed); game.obstacles = game.obstacles.filter(obstacle => obstacle.y < 530); if (game.obstacles.some(obstacle => Math.abs(obstacle.x - game.player.x) < 35 && Math.abs(obstacle.y - game.player.y) < 35)) finish('Off the track'); else setScore(game.tick / 4); }
  if (mode === 'dungeon') { if (game.tick % 8 === 0) moveDungeon(); game.enemies.forEach(enemy => { if (game.tick % 24 === 0) enemy.x += Math.sign(game.player.x - enemy.x); if (game.tick % 24 === 0) enemy.y += Math.sign(game.player.y - enemy.y); }); if (game.enemies.some(enemy => enemy.x === game.player.x && enemy.y === game.player.y)) finish('Sentry found you'); }
  if (mode === 'bubble') { setScore(game.bubbles.length ? score : 100); if (!game.bubbles.length) finish('Cluster cleared'); }
  if (mode === 'laser') { if (keys.ArrowLeft || keys.a) game.player -= 6; if (keys.ArrowRight || keys.d) game.player += 6; game.player = Math.max(25, Math.min(875, game.player)); game.bullets.forEach(bullet => bullet.y -= 10); if (game.tick % Math.max(18, Math.floor(38 / config.speed)) === 0) game.drones.push({ x: 30 + Math.random() * 840, y: -20 }); game.drones.forEach(drone => drone.y += 2.2 * config.speed); game.bullets.forEach(bullet => game.drones.forEach(drone => { if (Math.abs(bullet.x - drone.x) < 24 && Math.abs(bullet.y - drone.y) < 24) drone.y = 600; })); game.bullets = game.bullets.filter(bullet => bullet.y > -20); game.drones = game.drones.filter(drone => drone.y < 530); if (game.drones.some(drone => drone.y > 430 && Math.abs(drone.x - game.player) < 30)) finish('Lock breached'); else setScore(score); }
  if (mode === 'orbit') { if (keys.ArrowLeft || keys.a) game.offset -= .035; if (keys.ArrowRight || keys.d) game.offset += .035; game.angle += .018 * config.speed; game.satellites.forEach(satellite => { satellite.angle += .01 * config.speed; if (Math.abs(Math.sin(satellite.angle + game.offset)) < .035) { satellite.hit = true; score += 5; setScore(score); } }); if (game.satellites.every(satellite => satellite.hit)) finish('Orbit secured'); }
  if (mode === 'stack') { game.current.x += game.current.dir * 4 * config.speed; if (game.current.x < 20 || game.current.x + game.current.w > 880) game.current.dir *= -1; }
  if (mode === 'color' && timestamp > game.deadline) finish('Signal lost');
}
function moveDungeon() { if (keys.ArrowUp || keys.w) game.player.y = Math.max(1, game.player.y - 1); if (keys.ArrowDown || keys.s) game.player.y = Math.min(9, game.player.y + 1); if (keys.ArrowLeft || keys.a) game.player.x = Math.max(1, game.player.x - 1); if (keys.ArrowRight || keys.d) game.player.x = Math.min(15, game.player.x + 1); const index = game.crystals.findIndex(crystal => crystal.x === game.player.x && crystal.y === game.player.y); if (index >= 0) { game.crystals.splice(index, 1); score += 25; setScore(score); } if (!game.crystals.length) finish('Ruins restored'); }
function nextColor() { const palette = [colors.lime, colors.orange, colors.cyan, '#c18cff']; game.targetColor = palette[Math.floor(Math.random() * palette.length)]; game.options = shuffle(palette.slice()); game.deadline = performance.now() + game.config.time; }
function fireExtra() { if (mode === 'laser' && running) game.bullets.push({ x: game.player, y: 440 }); if (mode === 'bubble' && running && game.bubbles.length) game.bubbles.pop(); if (mode === 'stack' && running) dropBlock(); }
function dropBlock() { const previous = game.blocks[game.blocks.length - 1]; const left = Math.max(previous.x, game.current.x); const right = Math.min(previous.x + previous.w, game.current.x + game.current.w); if (right - left < 12) { finish('Stack collapsed'); return; } game.blocks.push({ x: left, w: right - left, y: game.current.y }); score += 10; setScore(score); game.current = { x: 20, w: right - left, y: game.current.y - 50, dir: 1 }; if (game.blocks.length > 8) finish('Skyline complete'); }
function extraClick(x, y) { if (mode === 'memory' && game.revealed.length < 2 && game.tick > game.flipAt + 35) { const gap = 12, size = 360 / game.size, left = 270, top = 55; const col = Math.floor((x - left) / (size + gap)), row = Math.floor((y - top) / (size + gap)), index = row * game.size + col; if (col >= 0 && col < game.size && row >= 0 && row < game.size && !game.matched.includes(index) && !game.revealed.includes(index)) { game.revealed.push(index); game.flipAt = game.tick; } } if (mode === 'bubble') game.bubbles = game.bubbles.filter(bubble => Math.hypot(x - bubble.x, y - bubble.y) > bubble.r); if (mode === 'stack') dropBlock(); if (mode === 'color') { const index = game.options.findIndex((_, optionIndex) => 170 + optionIndex * 150 < x && x < 290 + optionIndex * 150 && y > 260 && y < 380); if (game.options[index] === game.targetColor) { score += 10; game.round++; setScore(score); if (game.round >= 10) finish('Signal master'); else nextColor(); } else finish('Wrong signal'); } }
function drawExtra() {
  background();
  if (mode === 'meteor') { game.rocks.forEach(rock => { ctx.fillStyle = colors.orange; ctx.beginPath(); ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2); ctx.fill(); }); ctx.fillStyle = colors.cyan; ctx.beginPath(); ctx.moveTo(game.player.x, 390); ctx.lineTo(game.player.x - 24, 445); ctx.lineTo(game.player.x + 24, 445); ctx.closePath(); ctx.fill(); text('METEOR FIELD', 28, 40, 16, colors.muted); }
  if (mode === 'snake') { const unit = 48; ctx.fillStyle = colors.orange; ctx.fillRect(game.food.x * unit + 5, game.food.y * unit + 5, 38, 38); game.cells.forEach((cell, index) => { ctx.fillStyle = index ? colors.cyan : colors.lime; ctx.fillRect(cell.x * unit + 4, cell.y * unit + 4, 40, 40); }); text('SPARKS ' + Math.floor(score / 10), 28, 40, 16, colors.muted); }
  if (mode === 'memory') { const gap = 12, size = 360 / game.size, left = 270, top = 55; game.cards.forEach((card, index) => { const col = index % game.size, row = Math.floor(index / game.size), open = game.revealed.includes(index) || game.matched.includes(index); ctx.fillStyle = open ? [colors.lime, colors.orange, colors.cyan, '#c18cff'][card % 4] : '#25342f'; ctx.fillRect(left + col * (size + gap), top + row * (size + gap), size, size); if (open) text(String(card + 1), left + col * (size + gap) + size / 2 - 7, top + row * (size + gap) + size / 2 + 8, 20, '#081012'); }); text('PAIRS ' + game.matched.length / 2 + ' / ' + game.cards.length / 2, 28, 40, 16, colors.muted); }
  if (mode === 'drift') { ctx.fillStyle = '#182a28'; ctx.fillRect(180, 0, 540, 500); ctx.strokeStyle = colors.lime; ctx.setLineDash([12, 20]); ctx.strokeRect(220, 0, 460, 500); ctx.setLineDash([]); ctx.fillStyle = colors.cyan; ctx.fillRect(game.player.x - 25, game.player.y - 18, 50, 36); game.obstacles.forEach(obstacle => { ctx.fillStyle = colors.orange; ctx.fillRect(obstacle.x - 12, obstacle.y - 16, 24, 32); }); text('LAP DISTANCE ' + Math.floor(score), 28, 40, 16, colors.muted); }
  if (mode === 'dungeon') { for (let y = 1; y < 10; y++) for (let x = 1; x < 16; x++) { ctx.fillStyle = (x + y) % 2 ? '#142421' : '#19302b'; ctx.fillRect(x * 48, y * 48, 46, 46); } game.crystals.forEach(crystal => { ctx.fillStyle = colors.lime; ctx.fillRect(crystal.x * 48 + 15, crystal.y * 48 + 15, 18, 18); }); game.enemies.forEach(enemy => { ctx.fillStyle = colors.orange; ctx.beginPath(); ctx.arc(enemy.x * 48 + 23, enemy.y * 48 + 23, 15, 0, Math.PI * 2); ctx.fill(); }); ctx.fillStyle = colors.cyan; ctx.fillRect(game.player.x * 48 + 12, game.player.y * 48 + 12, 24, 24); text('CRYSTALS ' + (3 - game.crystals.length) + ' / 3', 28, 40, 16, colors.muted); }
  if (mode === 'bubble') { game.bubbles.forEach(bubble => { ctx.fillStyle = `hsl(${bubble.hue}, 85%, 65%)`; ctx.beginPath(); ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = colors.ink; ctx.stroke(); }); text('BUBBLES ' + game.bubbles.length, 28, 40, 16, colors.muted); }
  if (mode === 'laser') { ctx.fillStyle = colors.cyan; ctx.fillRect(game.player - 22, 440, 44, 20); ctx.fillStyle = colors.lime; game.bullets.forEach(bullet => ctx.fillRect(bullet.x - 2, bullet.y, 4, 14)); game.drones.forEach(drone => { ctx.fillStyle = colors.orange; ctx.fillRect(drone.x - 18, drone.y - 12, 36, 24); }); text('DRONES ' + game.drones.length, 28, 40, 16, colors.muted); }
  if (mode === 'orbit') { ctx.strokeStyle = colors.cyan; ctx.beginPath(); ctx.arc(450, 250, 145, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = colors.lime; ctx.beginPath(); ctx.arc(450, 250, 24, 0, Math.PI * 2); ctx.fill(); game.satellites.forEach(satellite => { const x = 450 + Math.cos(satellite.angle) * satellite.radius, y = 250 + Math.sin(satellite.angle) * satellite.radius; ctx.fillStyle = satellite.hit ? colors.muted : colors.orange; ctx.fillRect(x - 8, y - 8, 16, 16); }); text('SATELLITES ' + game.satellites.filter(satellite => satellite.hit).length + ' / ' + game.satellites.length, 28, 40, 16, colors.muted); }
  if (mode === 'stack') { game.blocks.forEach(block => { ctx.fillStyle = colors.cyan; ctx.fillRect(block.x, block.y, block.w, 42); }); ctx.fillStyle = colors.orange; ctx.fillRect(game.current.x, game.current.y, game.current.w, 42); text('LEVEL ' + (game.blocks.length - 1), 28, 40, 16, colors.muted); }
  if (mode === 'color') { text('MATCH THE SIGNAL', 28, 40, 16, colors.muted); ctx.fillStyle = game.targetColor; ctx.beginPath(); ctx.arc(450, 150, 60, 0, Math.PI * 2); ctx.fill(); game.options.forEach((color, index) => { ctx.fillStyle = color; ctx.fillRect(170 + index * 150, 275, 120, 90); }); text('ROUND ' + game.round + ' / 10', 700, 40, 14, colors.lime); }
}

function action(name) {
  if (name === 'action') {
    if (mode === 'dash') jump();
    if (mode === 'shooter') fire();
    if (mode === 'pong') start();
    if (mode === 'hoops') shootHoop();
    if (mode === 'reflex') hitTarget();
    if (extraModes.includes(mode)) fireExtra();
  }
  if (name === 'left') keys.ArrowLeft = true;
  if (name === 'right') keys.ArrowRight = true;
}

choices.forEach(button => button.addEventListener('click', () => {
  choices.forEach(choice => choice.classList.remove('active'));
  button.classList.add('active');
  mode = button.dataset.game;
  reset();
}));

difficultyChoices.forEach(button => button.addEventListener('click', () => {
  difficultyChoices.forEach(choice => choice.classList.remove('active'));
  button.classList.add('active');
  difficulty = button.dataset.difficulty;
  if (mode === 'pong' || extraModes.includes(mode)) reset();
}));

startButton.addEventListener('click', () => {
  if (running) return;
  if (mode !== 'blackjack') reset();
  start();
});
restartButton.addEventListener('click', () => { reset(); start(); });
canvas.addEventListener('click', event => {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
  const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
  if (mode === 'hoops') shootHoop();
  if (mode === 'reflex' && game.target && Math.hypot(x - game.target.x, y - game.target.y) <= game.target.radius + 12) hitTarget();
  if (extraModes.includes(mode)) extraClick(x, y);
});
window.addEventListener('keydown', event => {
  keys[event.key] = true;
  if (event.code === 'Space') {
    event.preventDefault();
    if (!running) start();
    else if (mode === 'dash') jump();
    else if (mode === 'shooter') fire();
    else if (mode === 'hoops') game.charging = true;
    else if (mode === 'reflex') hitTarget();
    else if (extraModes.includes(mode)) fireExtra();
  }
  if (mode === 'dungeon' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) moveDungeon();
  if (event.key.toLowerCase() === 'h') hitBlackjack();
  if (event.key.toLowerCase() === 's') standBlackjack();
  if (event.key === 'Enter' && !running) start();
});
window.addEventListener('keyup', event => {
  if (event.code === 'Space' && mode === 'hoops' && running) shootHoop();
  keys[event.key] = false;
});
touchButtons.forEach(button => {
  button.addEventListener('touchstart', event => { event.preventDefault(); action(button.dataset.action); });
  button.addEventListener('touchend', () => { keys.ArrowLeft = false; keys.ArrowRight = false; });
});
reset();

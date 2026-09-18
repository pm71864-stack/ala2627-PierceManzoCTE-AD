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
}

function draw() {
  if (mode === 'dash') drawDash();
  if (mode === 'shooter') drawShooter();
  if (mode === 'pong') drawPong();
  if (mode === 'hoops') drawHoops();
  if (mode === 'blackjack') drawBlackjack();
  if (mode === 'reflex') drawReflex();
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

function action(name) {
  if (name === 'action') {
    if (mode === 'dash') jump();
    if (mode === 'shooter') fire();
    if (mode === 'pong') start();
    if (mode === 'hoops') shootHoop();
    if (mode === 'reflex') hitTarget();
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
  if (mode === 'pong') reset();
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
  }
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

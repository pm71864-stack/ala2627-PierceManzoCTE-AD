const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const message = document.querySelector("#game-message");
const messageTitle = message.querySelector("h2");
const messageText = message.querySelector("p:not(.message-kicker)");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");

const keys = new Set();
let animationFrame;
let lastTime = 0;
let score = 0;
let lives = 3;
let playing = false;
let paused = false;
let player;
let objects;
let spawnTimer;

function resetGame() {
  score = 0;
  lives = 3;
  player = { x: canvas.width / 2, y: canvas.height - 58, width: 34, height: 24, speed: 360 };
  objects = [];
  spawnTimer = 0;
  updateHud();
}

function updateHud() {
  scoreElement.textContent = String(score).padStart(4, "0");
  livesElement.textContent = String(lives).padStart(2, "0");
}

function showMessage(title, text, buttonLabel) {
  messageTitle.textContent = title;
  messageText.textContent = text;
  startButton.textContent = buttonLabel;
  message.classList.remove("is-hidden");
}

function startGame() {
  resetGame();
  playing = true;
  paused = false;
  message.classList.add("is-hidden");
  lastTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(loop);
}

function togglePause() {
  if (!playing) return;
  paused = !paused;
  if (paused) {
    showMessage("Signal paused.", "The field is holding its breath.", "Resume");
  } else {
    message.classList.add("is-hidden");
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(loop);
  }
}

function spawnObject() {
  const isPulse = Math.random() > 0.28;
  objects.push({
    x: 24 + Math.random() * (canvas.width - 48),
    y: -20,
    size: isPulse ? 9 : 15 + Math.random() * 8,
    speed: 115 + Math.random() * 75 + score * 0.15,
    type: isPulse ? "pulse" : "static",
    rotation: Math.random() * Math.PI
  });
}

function collides(item) {
  return Math.abs(item.x - player.x) < item.size + player.width / 2 &&
    Math.abs(item.y - player.y) < item.size + player.height / 2;
}

function update(delta) {
  const direction = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
  player.x = Math.max(25, Math.min(canvas.width - 25, player.x + direction * player.speed * delta));
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnObject();
    spawnTimer = Math.max(0.22, 0.62 - score / 1800);
  }
  objects.forEach((item) => { item.y += item.speed * delta; item.rotation += delta; });
  objects = objects.filter((item) => {
    if (collides(item)) {
      if (item.type === "pulse") score += 25;
      else lives -= 1;
      updateHud();
      return false;
    }
    return item.y < canvas.height + 30;
  });
  if (lives <= 0) {
    playing = false;
    showMessage("Transmission lost.", `Final score: ${score}. The night shift is yours to reclaim.`, "Try again");
  }
}

function draw() {
  context.fillStyle = "#071013";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#183033";
  context.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke(); }
  for (let y = 0; y < canvas.height; y += 40) { context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke(); }
  objects.forEach((item) => {
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rotation);
    context.fillStyle = item.type === "pulse" ? "#0aff1e" : "#ff7068";
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 14;
    context.fillRect(-item.size / 2, -item.size / 2, item.size, item.size);
    context.restore();
  });
  context.save();
  context.translate(player.x, player.y);
  context.fillStyle = "#d5ff51";
  context.shadowColor = "#d5ff51";
  context.shadowBlur = 18;
  context.beginPath();
  context.moveTo(0, -16); context.lineTo(17, 12); context.lineTo(0, 7); context.lineTo(-17, 12); context.closePath(); context.fill();
  context.restore();
}

function loop(timestamp) {
  if (!playing || paused) return;
  const delta = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;
  update(delta);
  draw();
  if (playing) animationFrame = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  keys.add(key);
  if (key === "p") togglePause();
  if (key === "r") startGame();
});
document.addEventListener("keyup", (event) => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
startButton.addEventListener("click", () => paused ? togglePause() : startGame());
pauseButton.addEventListener("click", togglePause);

resetGame();
draw();

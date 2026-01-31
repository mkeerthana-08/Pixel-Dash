const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

let player, obstacles, coins, powerUps;
let score, highScore, speed, gravity;
let gameOver = false;
let lastObstacleTime = 0;
let lastCoinTime = 0;
let lastPowerTime = 0;

let groundY = H - 40;

// Power system
let activePower = null;
let powerTimer = 0;
let shieldActive = false;
let coinMultiplier = 1;

const PIXEL_ORANGE = '#ffb347';
const PIXEL_BROWN = '#7c4700';
const PIXEL_GREEN = '#7fff7f';
const PIXEL_GRAY = '#444';
const PIXEL_YELLOW = '#ffe066';

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function resetGame() {
  player = {
    x: 60,
    y: groundY - 32,
    w: 32,
    h: 32,
    vy: 0,
    jump: false,
    alive: true
  };

  obstacles = [];
  coins = [];
  powerUps = [];

  score = 0;
  speed = 5;
  gravity = 1.1;

  activePower = null;
  powerTimer = 0;
  shieldActive = false;
  coinMultiplier = 1;

  gameOver = false;

  document.getElementById('restartBtn').style.display = 'none';
}

function drawGround() {
  ctx.fillStyle = PIXEL_BROWN;
  ctx.fillRect(0, groundY, W, 40);

  for (let i = 0; i < W; i += 8) {
    ctx.fillStyle = PIXEL_GREEN;
    ctx.fillRect(i, groundY, 6, 6);
  }
}

function drawPlayer() {
  // Body
  ctx.fillStyle = PIXEL_ORANGE;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Ear
  ctx.fillStyle = '#fff';
  ctx.fillRect(player.x + 22, player.y + 4, 6, 6);

  // Eye
  ctx.fillStyle = '#222';
  ctx.fillRect(player.x + 20, player.y + 14, 4, 4);

  // Tail
  ctx.fillStyle = '#fff';
  ctx.fillRect(player.x - 8, player.y + 18, 10, 6);

  // Shield effect
  if (shieldActive) {
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x - 4, player.y - 4, player.w + 8, player.h + 8);
  }
}


function drawObstacles() {
  obstacles.forEach(o => {
    ctx.fillStyle = PIXEL_GRAY;
    ctx.fillRect(o.x, o.y, o.w, o.h);
  });
}

function drawCoins() {
  coins.forEach(c => {
    ctx.fillStyle = PIXEL_YELLOW;
    ctx.beginPath();
    ctx.arc(c.x + c.r, c.y + c.r, c.r, 0, 2 * Math.PI);
    ctx.fill();
  });
}

function drawPowerUps() {
  powerUps.forEach(p => {
    ctx.fillStyle = p.type === 'shield' ? '#4ecdc4' : '#ffd93d';
    ctx.beginPath();
    ctx.arc(p.x + p.r, p.y + p.r, p.r, 0, 2 * Math.PI);
    ctx.fill();
  });
}

function drawScore() {
  ctx.font = '18px "Press Start 2P", Arial';
  ctx.fillStyle = '#23272e';
  ctx.fillText('Score: ' + score, 16, 32);
  ctx.fillText('High: ' + highScore, 16, 60);

  if (activePower) {
    ctx.fillText('Power: ' + activePower.toUpperCase(), 16, 90);
  }
}

function update(ts) {

  if (!gameOver) {

    // Physics
    player.vy += gravity;
    player.y += player.vy;

    if (player.y > groundY - player.h) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.jump = false;
    }

    // Obstacles
    if (!lastObstacleTime || ts - lastObstacleTime > randInt(900, 1600)) {
      let h = randInt(28, 44);
      obstacles.push({ x: W, y: groundY - h, w: randInt(18, 32), h });
      lastObstacleTime = ts;
    }

    obstacles.forEach(o => o.x -= speed);
    obstacles = obstacles.filter(o => o.x + o.w > 0);

    // Coins
    if (!lastCoinTime || ts - lastCoinTime > randInt(1200, 2200)) {
      coins.push({ x: W, y: groundY - randInt(60, 120), r: 10 });
      lastCoinTime = ts;
    }

    coins.forEach(c => c.x -= speed);
    coins = coins.filter(c => c.x + c.r > 0);

    // PowerUps
    if (!lastPowerTime || ts - lastPowerTime > randInt(6000, 10000)) {
      const type = Math.random() > 0.5 ? 'shield' : 'double';
      powerUps.push({ x: W, y: groundY - randInt(80, 140), r: 12, type });
      lastPowerTime = ts;
    }

    powerUps.forEach(p => p.x -= speed);
    powerUps = powerUps.filter(p => p.x + p.r > 0);

    // Collisions - Obstacles
    obstacles.forEach((o, i) => {
      if (
        player.x < o.x + o.w &&
        player.x + player.w > o.x &&
        player.y < o.y + o.h &&
        player.y + player.h > o.y
      ) {
        if (shieldActive) {
          shieldActive = false;
          activePower = null;
          obstacles.splice(i, 1);
        } else {
          gameOver = true;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('pixeldash_highscore', highScore);
          }
          document.getElementById('restartBtn').style.display = 'block';
        }
      }
    });

    // Collisions - Coins
    coins.forEach((c, i) => {
      if (
        player.x < c.x + c.r * 2 &&
        player.x + player.w > c.x &&
        player.y < c.y + c.r * 2 &&
        player.y + player.h > c.y
      ) {
        score += 10 * coinMultiplier;
        coins.splice(i, 1);
      }
    });

    // Collisions - PowerUps
    powerUps.forEach((p, i) => {
      if (
        player.x < p.x + p.r * 2 &&
        player.x + player.w > p.x &&
        player.y < p.y + p.r * 2 &&
        player.y + player.h > p.y
      ) {
        applyPowerUp(p.type);
        powerUps.splice(i, 1);
      }
    });

    // Power timer
    if (activePower) {
      powerTimer--;
      if (powerTimer <= 0) {
        activePower = null;
        shieldActive = false;
        coinMultiplier = 1;
      }
    }

    score++;
    if (score % 400 === 0) speed += 0.7;
  }

  ctx.clearRect(0, 0, W, H);
  drawGround();
  drawPlayer();
  drawObstacles();
  drawCoins();
  drawPowerUps();
  drawScore();

  requestAnimationFrame(update);
}

function applyPowerUp(type) {
  activePower = type;
  powerTimer = 300;

  if (type === 'shield') shieldActive = true;
  if (type === 'double') coinMultiplier = 2;
}

function jump() {
  if (!player.jump && !gameOver) {
    player.vy = -17;
    player.jump = true;
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space') jump();
  if (gameOver && e.code === 'KeyR') resetGame();
});

canvas.addEventListener('mousedown', () => {
  if (!gameOver) jump();
  else resetGame();
});

document.getElementById('restartBtn').onclick = resetGame;

highScore = +localStorage.getItem('pixeldash_highscore') || 0;

resetGame();
requestAnimationFrame(update);

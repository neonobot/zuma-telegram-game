// zuma-engine.js

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

canvas.width = WIDTH;
canvas.height = HEIGHT;

// ----- Assets -----
const assets = {
    frog: new Image(),
    ballSprite: new Image(),
    victory: new Image(),
    defeat: new Image(),
};
assets.frog.src = 'assets/frog_sprite.png';
assets.ballSprite.src = 'assets/balls_spritesheet.png';
assets.victory.src = 'assets/victory.png';
assets.defeat.src = 'assets/defeat.png';

// ----- Game state -----
let gameState = 'start'; // start, play, victory, defeat
let level = 1;

let balls = []; // цепочка шариков
let frog = {
    x: WIDTH / 2,
    y: HEIGHT - 150,
    width: 128,
    height: 192,
    frame: 0,
    frameCount: 4,
    shootCooldown: 0,
};

let path = []; // массив точек траектории
let ballSize = 64; // размер шарика
let ballSpeed = 2; // скорость цепочки

const BALL_COLORS = 6;

// ----- Helpers -----
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ----- Initialize path -----
function generatePath() {
    path = [];
    let margin = 100;
    let steps = 500;
    for (let i = 0; i < steps; i++) {
        let t = i / steps;
        let x = WIDTH / 2 + Math.sin(t * Math.PI * 4) * 200;
        let y = margin + t * (HEIGHT - 2 * margin);
        path.push({ x, y });
    }
}
generatePath();

// ----- Initialize balls chain -----
function initBalls() {
    balls = [];
    for (let i = 0; i < 20; i++) {
        balls.push({
            pathIndex: -i * (ballSize + 2),
            color: Math.floor(Math.random() * BALL_COLORS),
        });
    }
}
initBalls();

// ----- Shoot -----
let currentBall = { color: Math.floor(Math.random() * BALL_COLORS), x: 0, y: 0, vx: 0, vy: 0, flying: false };

canvas.addEventListener('click', (e) => {
    if (gameState === 'start') {
        gameState = 'play';
    } else if (gameState === 'play' && !currentBall.flying) {
        let rect = canvas.getBoundingClientRect();
        let targetX = e.clientX - rect.left;
        let targetY = e.clientY - rect.top;

        let dx = targetX - frog.x;
        let dy = targetY - frog.y;
        let len = Math.hypot(dx, dy);

        currentBall.vx = (dx / len) * 10;
        currentBall.vy = (dy / len) * 10;
        currentBall.x = frog.x;
        currentBall.y = frog.y;
        currentBall.flying = true;
    }
});

// ----- Update -----
function update() {
    if (gameState === 'play') {
        // Update frog animation
        frog.frame += 0.1;
        if (frog.frame >= frog.frameCount) frog.frame = 0;

        // Move balls along path
        for (let b of balls) {
            b.pathIndex += ballSpeed;
        }

        // Ball collision
        if (currentBall.flying) {
            currentBall.x += currentBall.vx;
            currentBall.y += currentBall.vy;

            for (let i = 0; i < balls.length; i++) {
                let ballPos = path[Math.floor(balls[i].pathIndex)];
                if (!ballPos) continue;
                let d = distance(currentBall, ballPos);
                if (d < ballSize) {
                    // insert ball
                    balls.splice(i, 0, { pathIndex: balls[i].pathIndex - 1, color: currentBall.color });
                    currentBall.flying = false;
                    currentBall.color = Math.floor(Math.random() * BALL_COLORS);
                    break;
                }
            }
        }

        // Check matches ≥3
        for (let i = 0; i < balls.length; i++) {
            let count = 1;
            let color = balls[i].color;
            for (let j = i + 1; j < balls.length; j++) {
                if (balls[j].color === color) count++;
                else break;
            }
            if (count >= 3) {
                balls.splice(i, count);
                break;
            }
        }

        // Check victory
        if (balls.length === 0) gameState = 'victory';
    }
}

// ----- Draw -----
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    if (gameState === 'start') {
        ctx.fillStyle = '#b0e0e6';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#000';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${level}`, WIDTH / 2, HEIGHT / 2 - 50);
        ctx.fillText('Click to Start', WIDTH / 2, HEIGHT / 2 + 50);
    } else if (gameState === 'play') {
        // Draw path (optional debug)
        // ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        // ctx.beginPath();
        // for (let p of path) ctx.lineTo(p.x, p.y);
        // ctx.stroke();

        // Draw balls
        for (let b of balls) {
            let idx = Math.floor(b.pathIndex);
            if (!path[idx]) continue;
            let pos = path[idx];
            let sx = b.color * ballSize;
            ctx.drawImage(assets.ballSprite, sx, 0, ballSize, ballSize, pos.x - ballSize / 2, pos.y - ballSize / 2, ballSize, ballSize);
        }

        // Draw flying ball
        if (currentBall.flying) {
            ctx.drawImage(assets.ballSprite, currentBall.color * ballSize, 0, ballSize, ballSize, currentBall.x - ballSize / 2, currentBall.y - ballSize / 2, ballSize, ballSize);
        }

        // Draw frog
        ctx.drawImage(assets.frog, Math.floor(frog.frame) * frog.width, 0, frog.width, frog.height, frog.x - frog.width / 2, frog.y - frog.height / 2, frog.width, frog.height);
    } else if (gameState === 'victory') {
        ctx.drawImage(assets.victory, 0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#000';
        ctx.font = '64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Level Complete!', WIDTH / 2, HEIGHT / 2);
    } else if (gameState === 'defeat') {
        ctx.drawImage(assets.defeat, 0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#000';
        ctx.font = '64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2);
    }
}

// ----- Main loop -----
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();

// ----- Resize -----
window.addEventListener('resize', () => {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    generatePath();
});

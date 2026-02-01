// =========================
// game-ui.js
// =========================

const LIFE_RESTORE_TIME = 10 * 60 * 1000; // 10 минут
const MAX_LIVES = 3;

let game;
const canvas = document.getElementById('gameCanvas');

// =========================
// UI & Input Bridge
// =========================

function initUI() {
    canvas.addEventListener('click', () => {
        if (game.state === 'PLAY') game.handleClick();
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (game.state === 'PLAY') game.handleClick();
        }
        if (e.code === 'KeyP') {
            game.isPaused = !game.isPaused;
        }
        if (e.code === 'KeyR') {
            game.resetGame();
            game.init();
        }
    });

    // touch input
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (game.state === 'PLAY') game.handleClick();
    }, { passive: false });

    // start button (optional)
    const startBtn = document.getElementById('startButton');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            game.resetGame();
            game.init();
        });
    }
}

// =========================
// Game Loop UI Overlay
// =========================

function drawUI() {
    const ctx = game.ctx;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${game.score}`, 20, 30);

    // Lives
    for (let i = 0; i < game.lives; i++) {
        ctx.fillStyle = '#FF5555';
        ctx.beginPath();
        ctx.arc(20 + i * 30, 60, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // Next Ball Indicator
    ctx.fillStyle = game.frog.nextBall;
    ctx.beginPath();
    ctx.arc(game.width - 40, game.height - 40, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeText('Next', game.width - 80, game.height - 35);
}

// =========================
// Main
// =========================

function startGame() {
    game = new ZumaGame('gameCanvas');
    initUI();

    function loop() {
        if (!game.isPaused) {
            drawUI();
        }
        requestAnimationFrame(loop);
    }

    game.init();
    loop();
}

startGame();

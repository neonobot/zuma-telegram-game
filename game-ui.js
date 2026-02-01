// =========================
// game-ui.js
// =========================

const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game = null;

function loadLives() {
    let data = JSON.parse(localStorage.getItem('zumaLives')) || {
        lives: MAX_LIVES,
        lastLost: Date.now()
    };

    const now = Date.now();
    const restored = Math.floor((now - data.lastLost) / LIFE_RESTORE_TIME);
    if (restored > 0) {
        data.lives = Math.min(MAX_LIVES, data.lives + restored);
        data.lastLost = now;
    }

    localStorage.setItem('zumaLives', JSON.stringify(data));
    return data.lives;
}

function saveLives(lives) {
    localStorage.setItem('zumaLives', JSON.stringify({
        lives,
        lastLost: Date.now()
    }));
}

document.getElementById('startButton').onclick = () => {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';

    const music = document.getElementById('bgMusic');
    if (music) {
        music.volume = 0.25;
        music.play().catch(() => {});
    }

    if (!game) {
        game = new ZumaGame('gameCanvas');
        game.lives = loadLives();
        game.init();
    } else {
        game.resetGame();
        game.lives = loadLives();
        game.init();
    }
};

const canvas = document.getElementById('gameCanvas');

function updateFrogAim(clientX, clientY) {
    if (!game || game.state !== 'PLAY') return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const dx = x - game.frog.x;
    const dy = y - game.frog.y;

    game.frog.angle = Math.atan2(dy, dx) * 180 / Math.PI;
    game.frog.angle = Math.max(-170, Math.min(170, game.frog.angle));
}

// Мышь
canvas.addEventListener('mousemove', e => updateFrogAim(e.clientX, e.clientY));

// Палец
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    updateFrogAim(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchstart', () => {
    // Для drag detection
});

canvas.addEventListener('touchend', () => {
    if (game && game.state === 'PLAY') {
        game.shoot();
    }
});

canvas.addEventListener('click', () => {
    if (!game) return;
    game.handleClick();
    if (game.state === 'LOSE') saveLives(game.lives);
});

document.getElementById('pauseButton')?.addEventListener('click', () => {
    if (game) game.isPaused = !game.isPaused;
});

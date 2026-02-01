// game-ui.js — версия под state-машину

const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game = null;

/* =========================
   LIVES STORAGE
========================= */

function loadLives() {
    let data = JSON.parse(localStorage.getItem('zumaLives'));

    if (!data) {
        data = {
            lives: MAX_LIVES,
            lastLost: Date.now()
        };
    }

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
    localStorage.setItem(
        'zumaLives',
        JSON.stringify({
            lives,
            lastLost: Date.now()
        })
    );
}

/* =========================
   GAME START
========================= */

document.getElementById('startButton').onclick = () => {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';

    const music = document.getElementById('bgMusic');
    if (music) {
        music.volume = 0.25;
        music.play().catch(() => {});
    }

    game = new ZumaGame('gameCanvas');
    game.lives = loadLives();
    game.init();
};

/* =========================
   INPUT → ENGINE
========================= */

const canvas = document.getElementById('gameCanvas');

canvas.addEventListener('click', () => {
    if (!game) return;

    game.handleClick();

    // если проиграли — сохраняем жизни
    if (game.state === 'lose') {
        saveLives(game.lives);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!game || game.state !== 'play') return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dx = mx - game.frog.x;
    const dy = my - game.frog.y;

    game.frog.angle = Math.atan2(dy, dx) * 180 / Math.PI;
    game.frog.angle = Math.max(-160, Math.min(160, game.frog.angle));
});

/* =========================
   PAUSE (опционально)
========================= */

document.getElementById('pauseButton')?.addEventListener('click', () => {
    if (game) game.isPaused = !game.isPaused;
});

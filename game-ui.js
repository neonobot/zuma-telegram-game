const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game = null;

function loadLives() {
    let data = JSON.parse(localStorage.getItem('zumaLives'));

    if (!data) {
        data = { lives: MAX_LIVES, lastLost: Date.now() };
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
        JSON.stringify({ lives, lastLost: Date.now() })
    );
}

/* =========================
   GAME START
========================= */
document.getElementById('startButton').onclick = () => {
    document.getElementById('startButton').style.display = 'none';

    const music = document.getElementById('bgMusic');
    if (music) { music.volume = 0.25; music.play().catch(() => {}); }

    game = new ZumaGame('gameCanvas');
    game.lives = loadLives();
    game.state = 'PLAY';
    game.init();
};

/* =========================
   INPUT → ENGINE
========================= */
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
canvas.addEventListener('click', () => {
    if (!game || game.state !== 'PLAY') return;
    game.shoot();
});

// Touch
let isDragging = false;
canvas.addEventListener('touchstart', () => { isDragging = false; });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    isDragging = true;
    const t = e.touches[0];
    updateFrogAim(t.clientX, t.clientY);
}, { passive: false });
canvas.addEventListener('touchend', () => {
    if (game && game.state === 'PLAY') game.shoot();
});

// Pause
document.getElementById('pauseButton')?.addEventListener('click', () => {
    if (game) game.isPaused = !game.isPaused;
});

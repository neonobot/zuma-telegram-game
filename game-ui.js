const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game = null;

function loadLives() {
    let data = JSON.parse(localStorage.getItem('zumaLives'));
    if (!data) data = { lives: MAX_LIVES, lastLost: Date.now() };
    const now = Date.now();
    const restored = Math.floor((now - data.lastLost) / LIFE_RESTORE_TIME);
    if (restored > 0) data.lives = Math.min(MAX_LIVES, data.lives + restored);
    localStorage.setItem('zumaLives', JSON.stringify(data));
    return data.lives;
}

function saveLives(lives) {
    localStorage.setItem('zumaLives', JSON.stringify({ lives, lastLost: Date.now() }));
}

document.getElementById('startButton').onclick = () => {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';

    game = new ZumaGame('gameCanvas');
    game.lives = loadLives();
    game.init();
};

const canvas = document.getElementById('gameCanvas');

canvas.addEventListener('click', () => {
    if (!game) return;
    game.handleClick?.();
    if (game.state === 'lose') saveLives(game.lives);
});

canvas.addEventListener('mousemove', e => {
    if (!game || game.state !== 'PLAY') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.frog.angle = Math.atan2(y - game.frog.y, x - game.frog.x) * 180 / Math.PI;
    game.frog.angle = Math.max(-170, Math.min(170, game.frog.angle));
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    game.frog.angle = Math.atan2(y - game.frog.y, x - game.frog.x) * 180 / Math.PI;
}, { passive: false });

canvas.addEventListener('touchend', () => { if (game) game.shoot(); });

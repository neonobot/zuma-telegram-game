const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

function loadLives() {
    let data = JSON.parse(localStorage.getItem('zumaLives'));
    if (!data) {
        data = { lives: MAX_LIVES, lastLost: Date.now() };
    }

    const now = Date.now();
    const restored = Math.floor((now - data.lastLost) / LIFE_RESTORE_TIME);
    data.lives = Math.min(MAX_LIVES, data.lives + restored);
    if (restored > 0) data.lastLost = now;

    localStorage.setItem('zumaLives', JSON.stringify(data));
    return data.lives;
}

function loseLife() {
    const data = JSON.parse(localStorage.getItem('zumaLives'));
    data.lives = Math.max(0, data.lives - 1);
    data.lastLost = Date.now();
    localStorage.setItem('zumaLives', JSON.stringify(data));
}

let game = null;

document.getElementById('startButton').onclick = () => {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';

    const music = document.getElementById('bgMusic');
    music.volume = 0.25;
    music.play().catch(()=>{});

    game = new ZumaGame('gameCanvas');
    game.lives = loadLives();
    game.init();

    updateUI();
};

document.getElementById('menuButton').onclick = () => {
    location.reload();
};

document.getElementById('pauseButton').onclick = () => {
    game.isPaused = !game.isPaused;
};

document.getElementById('nextLevelBtn').onclick = () => {
    document.getElementById('winScreen').style.display = 'none';
    game.nextLevel();
};

document.getElementById('toMenuBtn').onclick = () => {
    location.reload();
};

function updateUI() {
    if (!game) return;

    document.getElementById('score').textContent = game.score;
    document.getElementById('level').textContent = game.level;
    document.getElementById('lives').textContent = game.lives;

    if (game.gameOver) {
        loseLife();
        location.reload();
    }

    if (game.levelCompleted) {
        document.getElementById('winScreen').style.display = 'flex';
    }

    requestAnimationFrame(updateUI);
}

updateUI();

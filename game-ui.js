// game-ui.js — SAFE INIT VERSION

const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game = null;
let canvas = null;

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
   AIMING
========================= */

function updateFrogAim(clientX, clientY) {
    if (!game || game.state !== 'PLAY') return;

    const rect = canvas.getBoundingClientRect();

    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    const dx = mx - game.frog.x;
    const dy = my - game.frog.y;

    let angle = Math.atan2(dy, dx);

    const MAX = Math.PI * 0.95;
    angle = Math.max(-MAX, Math.min(MAX, angle));

    game.frog.angle = angle;
}

/* =========================
   UI BUTTON CLICK CHECK
========================= */

function handleUIClick(clientX, clientY) {
    if (!game) return false;

    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    for (const b of game.uiButtons) {
        if (
            mx > b.x - b.w / 2 &&
            mx < b.x + b.w / 2 &&
            my > b.y - b.h / 2 &&
            my < b.y + b.h / 2
        ) {
            b.onClick();
            return true;
        }
    }
    return false;
}

/* =========================
   INIT AFTER DOM READY
========================= */

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');

    if (!canvas) {
        console.error('Canvas not found in DOM');
        return;
    }

    // ===== MOUSE =====
    canvas.addEventListener('mousemove', e => {
        updateFrogAim(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousedown', e => {
        updateFrogAim(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseup', e => {
        if (handleUIClick(e.clientX, e.clientY)) return;

        if (game && game.state === 'PLAY') {
            game.shoot();
        }
    });

    // ===== TOUCH =====
    canvas.addEventListener(
        'touchstart',
        e => {
            const t = e.touches[0];
            updateFrogAim(t.clientX, t.clientY);
        },
        { passive: false }
    );

    canvas.addEventListener(
        'touchmove',
        e => {
            e.preventDefault();
            const t = e.touches[0];
            updateFrogAim(t.clientX, t.clientY);
        },
        { passive: false }
    );

    canvas.addEventListener(
        'touchend',
        () => {
            if (game && game.state === 'PLAY') {
                game.shoot();
            }
        },
        { passive: false }
    );

    // ===== GAME START =====
    game = new ZumaGame('gameCanvas');
    game.lives = loadLives();
    game.start();
});

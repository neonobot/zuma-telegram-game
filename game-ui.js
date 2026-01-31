const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game = null;

document.getElementById('startButton').onclick = () => {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    startGame();
};

function startGame() {
    game = new ZumaGame('gameCanvas');
    game.level = parseInt(document.getElementById('startLevel').textContent);
    game.init();
}

// Обработка кликов и движений мыши/тача
const canvas = document.getElementById('gameCanvas');

canvas.addEventListener('mousemove', e => {
    if (!game || game.state !== 'PLAY') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.frog.angle = Math.atan2(y - game.frog.y, x - game.frog.x) * 180 / Math.PI;
    game.frog.angle = Math.max(-170, Math.min(170, game.frog.angle));
});

canvas.addEventListener('click', () => { if(game) game.shoot(); });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    game.frog.angle = Math.atan2(y - game.frog.y, x - game.frog.x) * 180 / Math.PI;
}, { passive: false });

canvas.addEventListener('touchend', () => { if(game) game.shoot(); });

function showEndScreen(win) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = win ? '#FFF9C4' : '#FFCDD2';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = '#333';
    ctx.font = '48px Nunito';
    ctx.textAlign = 'center';
    ctx.fillText(win ? 'Уровень пройден!' : 'Попробуй снова!', canvas.width/2, 100);

    // Рисуем милого лягушонка
    const frogImg = new Image();
    frogImg.src = game.frogImg.src;
    frogImg.onload = () => {
        ctx.drawImage(frogImg, canvas.width/2-64, canvas.height/2-64, 128,128);
        // Кнопка
        ctx.fillStyle = '#FFB74D';
        ctx.fillRect(canvas.width/2-100, canvas.height/2+80, 200, 60);
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width/2-100, canvas.height/2+80, 200, 60);
        ctx.fillStyle = '#222';
        ctx.font = '28px Nunito';
        ctx.fillText(win?'Следующий уровень':'Рестарт', canvas.width/2, canvas.height/2+120);
    };

    // Слушаем клики по кнопке
    function onClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if(x>=canvas.width/2-100 && x<=canvas.width/2+100 && y>=canvas.height/2+80 && y<=canvas.height/2+140){
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchend', onClick);
            if(win) game.level++;
            startGame();
        }
    }
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchend', onClick);
}

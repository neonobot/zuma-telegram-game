// zuma-engine.js - Версия 3.0 с улучшенной графикой
console.log('Zuma Frog Game Engine loading...');
const ART = {
    colors: {
        water: '#6FB7B1',
        waterDark: '#4FA19B',
        streamEdge: '#5A9F99',

        frog: '#5FA77A',
        frogShadow: '#3E6F58',

        lily: '#6EA96E',
        lotus: '#F3B6C4',

        whirlpoolCenter: '#3E6F73',
        whirlpoolEdge: '#7FC6C2',

        bugRed: '#E55A5A'
    },

    shadowColor: 'rgba(0, 40, 30, 0.25)'
};
const ASSETS = {
    balls: new Image(),
    bug: new Image(),
    whirlpool: new Image(),
    ready: false
};

ASSETS.balls.src = './assets/images/balls.png';
ASSETS.bug.src = './assets/images/bug.png';
ASSETS.whirlpool.src = './assets/images/whirlpool.png';

const BALL_SPRITE = {
    frameWidth: 96,
    frameHeight: 96,
    cols: 0,
    rows: 0,
    ready: false
};


let assetsLoaded = 0;
Object.values(ASSETS).forEach(img => {
    if (!(img instanceof Image)) return;
    img.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === 3) {
            ASSETS.ready = true;
            console.log('✅ All assets loaded');
        }
        if (ASSETS.balls.complete) {
    BALL_SPRITE.cols = Math.floor(
        ASSETS.balls.width / BALL_SPRITE.frameWidth
    );
    BALL_SPRITE.rows = Math.floor(
        ASSETS.balls.height / BALL_SPRITE.frameHeight
    );
    BALL_SPRITE.ready = true;

    console.log(
        '🎨 Ball sprite sheet:',
        BALL_SPRITE.cols,
        'x',
        BALL_SPRITE.rows
    );
}

    };
});


const WIN_CONDITION_LAST_BUG = true;
const LOSE_POSITION = 0.95;

const GAME_STATE = {
    MENU: 'MENU',
    MAP: 'MAP',
    PLAY: 'PLAY',
    WIN: 'WIN',
    LOSE: 'LOSE'
};
const BALL_RADIUS = 20;
const BALL_SPACING = 0.008;
const BALL_COLORS_COUNT = 5;



class ZumaGame {
    constructor(canvasId) {
    console.log('Creating game instance...');

    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
        throw new Error('Canvas not found!');
    }

    // ✅ сначала контекст
    this.ctx = this.canvas.getContext('2d');

    // ✅ потом resize
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.width = 800;
    this.height = 600;

    this.state = GAME_STATE.PLAY;
        
        this.tutorialSteps = [
    {
        text: 'Проведи пальцем,\nчтобы прицелиться',
        shown: false,
        condition: () => this.frog.angle !== -90
    },
    {
        text: 'Отпусти — шар полетит',
        shown: false,
        condition: () => this.projectiles.length > 0
    },
    {
        text: 'Собери 3 одинаковых\nшара подряд',
        shown: false,
        condition: () => this.score > 0
    },
    {
        text: 'Жучок — последний!\nУбери его, чтобы победить 🐞',
        shown: false,
        condition: () =>
            this.chain.balls.length === 1 &&
            this.chain.balls[0].type === 'bug'
    }
];

this.currentTutorialStep = 0;

        // Пастельные цвета шаров
        this.colors = [
            '#FFD1DC', // Розовый
            '#B5EAD7', // Мятный
            '#E6E6FA', // Лавандовый
            '#FFDAB9', // Персиковый
            '#FFF8E1', // Ванильный
            '#B3E0FF'  // Голубой
        ];
        
        // Инициализация игры
        this.resetGame();
        
        console.log('Game initialized');
    }
    
    // Сброс игры для рестарта
    resetGame() {
        // Игровые переменные
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.maxLives = 3;
        this.lastLifeRestore = Date.now();
        this.isPaused = false;
        this.gameOver = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameLoopId = null;
        this.isTutorial = this.level === 1;
        this.chain = {
            balls: [],
            path: this.generateRoundSpiralPath(),

            // ⬇️ ВАЖНО
            speed: this.isTutorial ? 0.08 : 0.18 + this.level * 0.001,

            headPosition: 0,
            isAssembling: true,
            assembleProgress: -0.25,
            freeze: 40
        };

        
        // Лягушка - теперь в ЦЕНТРЕ!
        this.frog = {
            x: this.width / 2,
            y: this.height / 2, // Центр экрана!
            angle: -90,
            nextBall: this.getNextBallColor(),
            state: 'idle',
            blinkTimer: 0,
            mouthOpen: false,
            smile: 0 // Для анимации улыбки
        };

        const losePoint = this.getPathPoint(LOSE_POSITION);

        this.whirlpool = {
            x: losePoint.x,
            y: losePoint.y,
            radius: 42,
            angle: 0,
            pulse: 0
        };

        // Цепочка шаров - большая круглая спираль
        this.chain = {
            balls: [],
            path: this.generateRoundSpiralPath(),
            speed: 0.09 + (this.level * 0.015),
            headPosition: 0,

            // 🧲 фаза сборки
            isAssembling: true,
            assembleProgress: -0.25
        };

        
        // Проектили
        this.projectiles = [];
        
        // Эффекты
        this.explosions = [];
        this.particles = [];
        this.comboTexts = [];
        
        // Создаем цепочку
        this.createChain();
        
        this.isSucking = false;
        this.suckTimer = 0;

        console.log('Game reset');
    }
    startWhirlpoolSuck() {
    if (this.isSucking) return;

    this.isSucking = true;
    this.suckTimer = 0;

    // фиксируем текущие координаты
    for (const ball of this.chain.balls) {
        const p = this.getPathPoint(ball.position);
        ball.suck = {
            angle: Math.atan2(p.y - this.whirlpool.y, p.x - this.whirlpool.x),
            radius: Math.hypot(p.x - this.whirlpool.x, p.y - this.whirlpool.y)
        };
    }
}
    getNextBallColor() {
    // собираем все цвета в цепочке кроме жучка
    const availableColors = this.chain.balls
        .filter(b => b.type !== 'bug')
        .map(b => b.colorIndex);

    if (availableColors.length === 0) {
        // если шаров кроме жучка нет, возвращаем любой цвет
        return Math.floor(Math.random() * this.colors.length);
    }

    // выбираем случайный из оставшихся
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    return availableColors[randomIndex];
}

    updateWhirlpoolSuck(delta) {
    this.whirlpool.angle += 0.18 * delta;
    const speed = 0.05 * delta;

    for (let i = this.chain.balls.length - 1; i >= 0; i--) {
        const ball = this.chain.balls[i];

        ball.suck.angle += 0.25 * delta;
        ball.suck.radius -= speed * 30;

        const x =
            this.whirlpool.x +
            Math.cos(ball.suck.angle) * ball.suck.radius;
        const y =
            this.whirlpool.y +
            Math.sin(ball.suck.angle) * ball.suck.radius;

        ball.renderX = x;
        ball.renderY = y;

        if (ball.suck.radius <= 6) {
            this.chain.balls.splice(i, 1);
        }
    }

    this.suckTimer += delta;

    if (this.chain.balls.length === 0 && this.suckTimer > 20) {
        this.finishLose();
    }
}
    finishLose() {
    this.isSucking = false;
    this.state = GAME_STATE.LOSE;
    this.gameOver = true;
}



    
    // Генерация КРУГЛОЙ спирали в виде ручейка
    generateRoundSpiralPath() {
    const path = [];

    const cx = this.width / 2;
    const cy = this.height / 2;

    const turns = 3.0;
    const pointsPerTurn = 160;
    const total = Math.floor(turns * pointsPerTurn);

    const startR = Math.min(this.width, this.height) * 0.46;
    const endR   = Math.min(this.width, this.height) * 0.22; // ⬅️ НЕ ДО ЦЕНТРА

    for (let i = 0; i < total; i++) {
        const t = i / (total - 1);

        const angle = t * turns * Math.PI * 2;
        const radius = startR - t * (startR - endR);

        path.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        });
    }

    return path;
}
    resize() {
    if (!this.ctx) return; // 🛡 защита

    const dpr = window.devicePixelRatio || 1;

    const baseW = 800;
    const baseH = 600;

    const scale = Math.min(
        window.innerWidth / baseW,
        window.innerHeight / baseH
    );

    this.canvas.width = baseW * dpr;
    this.canvas.height = baseH * dpr;

    this.canvas.style.width = `${baseW * scale}px`;
    this.canvas.style.height = `${baseH * scale}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.width = baseW;
    this.height = baseH;
}




    formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
}
    drawLivesUI() {
    const ctx = this.ctx;
    const x = 24;
    const y = 24;

    ctx.save();

    // мягкая плашка
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeStyle = '#A5D6A7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 12, 160, 56, 18);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < this.maxLives; i++) {
        const hx = x + i * 30;
        const hy = y + 20;

        ctx.globalAlpha = i < this.lives ? 1 : 0.3;

        ctx.font = '22px serif';
        ctx.fillText('💗', hx, hy);
    }

    // таймер восстановления
    if (this.lives < this.maxLives) {
        const left = Math.max(
            0,
            600000 - (Date.now() - this.lastLifeRestore)
        );

        const s = Math.floor(left / 1000);
        const m = Math.floor(s / 60);

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#4E6E5D';
        ctx.font = '13px Nunito';
        ctx.fillText(
            `${m}:${(s % 60).toString().padStart(2, '0')}`,
            x,
            y + 38
        );
    }

    ctx.restore();
}

    // Добавьте этот метод в класс ZumaGame
updateEffects(delta) {
    // Обновление частиц
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += p.gravity;
        p.life--;
        
        if (p.life <= 0) {
            this.particles.splice(i, 1);
        }
    }
    
    // Обновление текстов комбо
    for (let i = this.comboTexts.length - 1; i >= 0; i--) {
        const text = this.comboTexts[i];
        
        text.y -= 1 * delta;
        text.life--;
        
        if (text.life <= 0) {
            this.comboTexts.splice(i, 1);
        }
    }
}
    
    // Получение точки на пути с плавностью
    getPathPoint(t) {
        t = Math.max(0, Math.min(1, t));
        const path = this.chain.path;
        
        // Используем кубическую интерполяцию для плавности
        const index = t * (path.length - 1);
        const i1 = Math.floor(index);
        const i0 = Math.max(i1 - 1, 0);
        const i2 = Math.min(i1 + 1, path.length - 1);
        const i3 = Math.min(i1 + 2, path.length - 1);
        const frac = index - i1;
        
        // Функция плавной интерполяции
        const cubicInterpolate = (p0, p1, p2, p3, t) => {
            const t2 = t * t;
            const t3 = t2 * t;
            return 0.5 * (
                (2 * p1) +
                (-p0 + p2) * t +
                (2*p0 - 5*p1 + 4*p2 - p3) * t2 +
                (-p0 + 3*p1 - 3*p2 + p3) * t3
            );
        };
        
        return {
            x: cubicInterpolate(path[i0].x, path[i1].x, path[i2].x, path[i3].x, frac),
            y: cubicInterpolate(path[i0].y, path[i1].y, path[i2].y, path[i3].y, frac)
        };
    }
    
    getRandomColor() {
        return Math.floor(Math.random() * this.colors.length);
}
    
    init() {
    console.log('Starting game...');
    this.startGameLoop();
}

    
    createChain() {
    this.chain.balls = [];

    const ballCount = 18 + this.level * 2;
    let pos = -BALL_SPACING * ballCount;

    for (let i = 0; i < ballCount; i++) {
        this.chain.balls.push({
            position: pos,
            colorIndex: Math.floor(Math.random() * 5),
            radius: BALL_RADIUS,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.015 + Math.random() * 0.015
        });

        pos += BALL_SPACING;
    }

    // 🐞 последний — жучок
    this.chain.balls[this.chain.balls.length - 1].type = 'bug';

    this.chain.headPosition = this.chain.balls[0].position;
    this.chain.isAssembling = true;
    this.chain.assembleProgress = this.chain.headPosition;
    this.chain.freeze = 30;
}

    
    startGameLoop() {
        // Останавливаем предыдущий цикл если есть
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        const gameLoop = (timestamp) => {
            if (!this.isPaused && !this.gameOver) {
                if (this.lastTime === 0) this.lastTime = timestamp;
                this.deltaTime = timestamp - this.lastTime;
                this.lastTime = timestamp;
                
                // Фиксированный шаг времени для плавности
                const fixedDelta = Math.min(this.deltaTime, 32) / 16.67;
                
                this.update(fixedDelta);
                this.draw();
            } else if (this.gameOver) {
                this.drawGameOverScreen();
            }
            
            this.gameLoopId = requestAnimationFrame(gameLoop);
        };
        
        this.gameLoopId = requestAnimationFrame(gameLoop);
    }
    updateWhirlpool(delta) {
    const p = this.getPathPoint(LOSE_POSITION);

    this.whirlpool.x = p.x;
    this.whirlpool.y = p.y;

    this.whirlpool.angle += 0.06 * delta;
    this.whirlpool.pulse =
        Math.sin(Date.now() * 0.004) * 6;
}


    update(delta) {
    if (this.state !== GAME_STATE.PLAY) return;

    this.updateFrog(delta);
    this.updateChain(delta);
    this.updateProjectiles(delta);
    this.updateEffects(delta);
    this.updateWhirlpool(delta);

    // ❤️ восстановление жизни
    if (
        this.lives < this.maxLives &&
        Date.now() - this.lastLifeRestore > 600000
    ) {
        this.lives++;
        this.lastLifeRestore = Date.now();
    
    }
}
    
    updateFrog(delta) {
        // Анимация улыбки
        this.frog.smile = Math.sin(Date.now() * 0.002) * 0.3;
        
        // Моргание
        this.frog.blinkTimer += delta;
        if (this.frog.blinkTimer > 300) {
            this.frog.blinkTimer = 0;
            this.frog.state = 'blinking';
            setTimeout(() => {
                if (this.frog.state === 'blinking') this.frog.state = 'idle';
            }, 150);
        }
    }
    
    updateChain(delta) {
    if (this.isSucking) {
        this.updateWhirlpoolSuck(delta);
        return;
    }
    for (const ball of this.chain.balls) {
        ball.renderX = undefined;
        ball.renderY = undefined;
    }


    /* ===============================
       1. ФАЗА СБОРКИ (СТАРТ)
    =============================== */
    if (this.chain.isAssembling) {
        this.chain.assembleProgress += 0.04 * delta; // ⬅ быстрее

        for (let i = 0; i < this.chain.balls.length; i++) {
            const target =
                this.chain.assembleProgress -
                i * BALL_SPACING;

            this.chain.balls[i].position +=
                (target - this.chain.balls[i].position) * 0.25;
        }

        // ✅ ВАЖНО: гарантированный выход
        if (this.chain.assembleProgress >= 0) {
            this.chain.isAssembling = false;
            this.chain.headPosition = 0;
        }

        return;
    }

    /* ===============================
       2. ЗАМОРОЗКА ПОСЛЕ ВЗРЫВА
    =============================== */
    if (this.chain.freeze > 0) {
        this.chain.freeze--;
        return;
    }

    /* ===============================
       3. ОСНОВНОЕ ДВИЖЕНИЕ (ZUMA)
    =============================== */

    const speed = this.chain.speed * delta * 0.002;
    this.chain.headPosition += speed;

    for (let i = 0; i < this.chain.balls.length; i++) {
        const ball = this.chain.balls[i];

        if (i === 0) {
            ball.position = this.chain.headPosition;
        } else {
            const prev = this.chain.balls[i - 1];
            const target = prev.position - BALL_SPACING;

            const diff = target - ball.position;

            // 🔥 Zuma-style compression
            ball.position += diff * 0.22;
        }

        ball.wobble += ball.wobbleSpeed * delta;

        // проигрыш
        if (ball.position >= LOSE_POSITION) {
            this.triggerLose();
            return;
        }
    }
}

    
    
    loseLife() {
    if (this.lives <= 0) return;

    this.lives--;
    this.lastLifeRestore = Date.now();

    localStorage.setItem(
        'zumaLives',
        JSON.stringify({
            lives: this.lives,
            lastLost: Date.now()
        })
    );

    const p = this.getPathPoint(0.85);
    this.createExplosion(p.x, p.y, '#FF8A80', 30);

    if (this.lives <= 0) {
        this.state = GAME_STATE.LOSE;
        this.gameOver = true;
    } else {
        setTimeout(() => {
            this.createChain();
        }, 600);
    }
}
    triggerLose() {
    if (this.gameOver || this.isSucking) return;

    this.lives--;
    this.lastLifeRestore = Date.now();

    localStorage.setItem(
        'zumaLives',
        JSON.stringify({
            lives: this.lives,
            lastLost: Date.now()
        })
    );

    this.startWhirlpoolSuck();
}




    
    // Остальные методы остаются такими же, но с улучшенной графикой...
    // Здесь должны быть все остальные методы из предыдущей версии,
    // но с изменениями в drawFrog() и drawPath() для новой графики
    updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        
        // Обновление позиции
        proj.x += proj.vx * delta;
        proj.y += proj.vy * delta;
        
        // Добавляем точку в след
        proj.trail.push({ x: proj.x, y: proj.y });
        if (proj.trail.length > 5) proj.trail.shift();
        
        // Уменьшаем время жизни
        proj.life -= delta;
        
        // Проверка выхода за границы
        if (proj.x < -proj.radius || proj.x > this.width + proj.radius ||
            proj.y < -proj.radius || proj.y > this.height + proj.radius ||
            proj.life <= 0) {
            this.chain.balls.unshift({
                position: this.chain.balls[0]?.position - BALL_SPACING || 0,
                colorIndex: proj.colorIndex,
                radius: BALL_RADIUS,
                wobble: 0,
                wobbleSpeed: 0.02
            });


this.projectiles.splice(i, 1);
            
            continue;
        }
        
        // Проверка столкновения с цепочкой
        const collision = this.checkProjectileCollision(proj);
        if (collision) {
            this.handleProjectileCollision(i, proj, collision);
        }
    }
}

checkProjectileCollision(proj) {
    for (let i = 0; i < this.chain.balls.length; i++) {
        const ball = this.chain.balls[i];
        const p = this.getPathPoint(ball.position);

        const dx = proj.x - p.x;
        const dy = proj.y - p.y;
        const dist = Math.hypot(dx, dy);

        // 🔥 плотное попадание как в Zuma
        if (dist < proj.radius + ball.radius + 4) {
            return { ball, index: i, point: p };
        }
    }
    return null;
}


handleProjectileCollision(projIndex, proj, collision) {
    // Создаем эффект взрыва
    this.createExplosion(
        proj.x,
        proj.y,
        this.colors[proj.colorIndex],
        15
    );

    
    // Вставляем шар в цепочку
    const newBall = {
        position: collision.ball.position,
        colorIndex: proj.colorIndex, // ✅ ВАЖНО
        radius: BALL_RADIUS,
        wobble: 0,
        wobbleSpeed: 0.02 + Math.random() * 0.02
    };

    
    // Вставляем шар перед тем, в который попали
    this.chain.balls.splice(collision.index, 0, newBall);
    
    // Удаляем снаряд
    this.projectiles.splice(projIndex, 1);

    // Обновляем следующий шар в рту лягушки
    this.frog.nextBall = this.getNextBallColor();
    
    // Проверяем совпадения
    this.checkForMatches(collision.index);
}
    createExplosion(x, y, color, size) {
    for (let i = 0; i < 15; i++) {
        this.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            color,
            size: Math.random() * size + 2,
            life: 30 + Math.random() * 30,
            gravity: 0.2
        });
    }
}

checkForMatches(startIndex) {
    if (startIndex < 0 || startIndex >= this.chain.balls.length) return;
    
    const color = this.chain.balls[startIndex].colorIndex;
    let matches = [startIndex];
    
    // Проверяем влево
    for (let i = startIndex - 1; i >= 0; i--) {
        if (this.chain.balls[i].colorIndex === color) {
            matches.unshift(i);
        } else break;
    }
    
    // Проверяем вправо
    for (let i = startIndex + 1; i < this.chain.balls.length; i++) {
        if (this.chain.balls[i].colorIndex === color) {
            matches.push(i);
        } else break;
    }
    
    // Если 3 или больше совпадений
    if (matches.length >= 3) {
        this.removeMatches(matches);
    }
}

removeMatches(matches) {
    // Сортируем по убыванию, чтобы удалять с конца
    matches.sort((a, b) => b - a);
    
    // Подсчет очков
    const baseScore = 100;
    const multiplier = Math.min(matches.length - 2, 5);
    const scoreGained = baseScore * multiplier;
    this.score += scoreGained;
    
    // Создаем текст комбо
    const firstBall = this.chain.balls[matches[matches.length - 1]];
    const point = this.getPathPoint(firstBall.position);
    this.comboTexts.push({
        x: point.x,
        y: point.y,
        text: `+${scoreGained} COMBO x${multiplier}!`,
        life: 60,
        color: '#FFD700'
    });
    
    // Удаляем шары
    for (const index of matches) {
        const ball = this.chain.balls[index];
        const point = this.getPathPoint(ball.position);
        
        // Создаем эффект взрыва
        this.createExplosion(point.x, point.y, this.colors[ball.colorIndex], 25);
        
        // Удаляем шар
        this.chain.balls.splice(index, 1);
    }
    
    // Обновляем индексы
    for (let i = 0; i < this.chain.balls.length; i++) {
        this.chain.balls[i].index = i;
    }
    
    // Проверяем конец уровня
    if (
        this.chain.balls.length === 1 &&
        this.chain.balls[0].type === 'bug'
    ) {
        this.state = GAME_STATE.WIN;
    }


}

levelUp() {
    this.level++;
    this.lives = Math.min(this.lives + 1, 10); // Добавляем жизнь, но не больше 10
    
    // Увеличиваем 
    this.chain.speed = 0.15 + (this.level * 0.015);
    
    // Создаем новую цепочку
    this.createChain();
    
    // Эффект перехода уровня
    this.comboTexts.push({
        x: this.width / 2,
        y: this.height / 2,
        text: `УРОВЕНЬ ${this.level}!`,
        life: 120,
        color: '#4CAF50',
        size: 40
    });
}

drawChain() {
    for (let i = 0; i < this.chain.balls.length; i++) {
        const ball = this.chain.balls[i];
        const x = ball.renderX ?? this.getPathPoint(ball.position).x;
        const y = ball.renderY ?? this.getPathPoint(ball.position).y;

        const wobbleX = Math.sin(ball.wobble) * 2;
        const wobbleY = Math.cos(ball.wobble) * 2;

        // 🐞 Жучок
        if (ball.type === 'bug') {
            this.drawBug(x + wobbleX, y + wobbleY, ball.radius, ball);
        } else {
            this.drawBallSprite(
                x + wobbleX,
                y + wobbleY,
                ball.radius,
                ball.colorIndex ?? 0
            );
        }
    }
}


drawBug(x, y, r, ball) {
    if (!ASSETS.ready) return;

    const frameSize = 128;
    const totalFrames = 20;

    if (ball.bugFrame === undefined) ball.bugFrame = 0;

    ball.bugFrame += 0.15;
    const frame = Math.floor(ball.bugFrame) % totalFrames;

    const scale = (r * 200) / frameSize;

    this.ctx.drawImage(
        ASSETS.bug,
        frame * frameSize, 0, frameSize, frameSize,
        x - r, y - r,
        frameSize * scale, frameSize * scale
    );
}
    drawShinyBall(x, y, r, color = '#4af') {
    const ctx = this.ctx;

    // основной шар
    const grad = ctx.createRadialGradient(
        x - r * 0.3, y - r * 0.3, r * 0.2,
        x, y, r
    );
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, '#000');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // блик
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(
        x - r * 0.35,
        y - r * 0.35,
        r * 0.25,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

   
drawBallSprite(x, y, r, colorIndex = 0) {
    if (!ASSETS.ready || !BALL_SPRITE.ready) return;

    const fw = BALL_SPRITE.frameWidth;
    const fh = BALL_SPRITE.frameHeight;
    const cols = BALL_SPRITE.cols;
    
    if (!Number.isInteger(colorIndex)) {
        console.warn('⚠️ Invalid colorIndex:', colorIndex);
    }

    // 🔢 как в Python:
    // index → (row, col)
    const col = colorIndex % cols;
    const row = Math.floor(colorIndex / cols);

    const sx = col * fw;
    const sy = row * fh;

    const size = r * 2;

    this.ctx.drawImage(
        ASSETS.balls,
        sx, sy, fw, fh,
        x - r, y - r,
        size, size
    );
}




drawProjectiles() {
    for (const proj of this.projectiles) {
        // след можно оставить через fillStyle, но можно и убрать
        for (let i = 0; i < proj.trail.length; i++) {
            const p = proj.trail[i];
            const alpha = (i / proj.trail.length) * 0.25;
            this.ctx.globalAlpha = alpha;
            this.drawBallSprite(p.x, p.y, proj.radius, proj.colorIndex);
        }

        // основной шар
        this.ctx.globalAlpha = 1;
        this.drawBallSprite(proj.x, proj.y, proj.radius, proj.colorIndex);
    }
}



drawEffects() {
    // Частицы
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life--;
        
        if (p.life <= 0) {
            this.particles.splice(i, 1);
            continue;
        }
        
        this.ctx.globalAlpha = p.life / 60;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    
    // Тексты комбо
    for (let i = this.comboTexts.length - 1; i >= 0; i--) {
        const text = this.comboTexts[i];
        
        text.y -= 1;
        text.life--;
        
        if (text.life <= 0) {
            this.comboTexts.splice(i, 1);
            continue;
        }
        
        this.ctx.globalAlpha = Math.min(text.life / 30, 1);
        this.ctx.fillStyle = text.color;
        this.ctx.font = `bold ${text.size || 24}px Nunito, Arial, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text.text, text.x, text.y);
        
        // Контур
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(text.text, text.x, text.y);
    }
    this.ctx.globalAlpha = 1;
}

drawNextBall() {
    if (!Number.isInteger(this.frog.nextBall)) return;

    const x = this.width - 70;
    const y = 60;

    // Пульсация
    const pulse = Math.sin(Date.now() * 0.004) * 4;

    // Фон с градиентом
    const bgGradient = this.ctx.createRadialGradient(
        x, y, 10,
        x, y, 40 + pulse
    );
    bgGradient.addColorStop(0, '#FFFDE7');
    bgGradient.addColorStop(1, '#FFE082');

    this.ctx.fillStyle = bgGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 40, y - 40, 80, 80, 20);
    this.ctx.fill();

    // Золотая рамка
    this.ctx.strokeStyle = '#FFB300';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    // Текст
    this.ctx.fillStyle = '#6D4C41';
    this.ctx.font = 'bold 14px Nunito, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ДАЛЕЕ', x, y - 28);

    // Шар
    this.drawShinyBall(x, y + 8, 20 + pulse * 0.3, this.frog.nextBall);

    // Блик
    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.beginPath();
    this.ctx.arc(x - 10, y - 2, 6, 0, Math.PI * 2);
    this.ctx.fill();
}

drawAim() {
    if (this.gameOver || this.isPaused || this.state !== GAME_STATE.PLAY) return;

    const angle = this.frog.angle * Math.PI / 180;

    const startX = this.frog.x;
    const startY = this.frog.y;

    // 👉 максимальная длина — до начала спирали
    const firstPoint = this.chain.path[0];
    const dx = firstPoint.x - startX;
    const dy = firstPoint.y - startY;
    const maxLength = Math.sqrt(dx * dx + dy * dy) - 10;

    this.ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);

    const steps = Math.floor(maxLength / 20);
    let x = startX;
    let y = startY;

    for (let i = 0; i < steps; i++) {
        x += Math.cos(angle) * 20;
        y += Math.sin(angle) * 20;
        this.ctx.lineTo(x, y);
    }

    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // кружок на конце
    this.ctx.strokeStyle = '#FFB74D';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 14, 0, Math.PI * 2);
    this.ctx.stroke();
}

    drawFrog() {
        const frog = this.frog;
        
        // Лист кувшинки под лягушкой
        this.drawLilyPad(frog.x, frog.y + 15);
        
        // Сохраняем контекст для вращения
        this.ctx.save();
        this.ctx.translate(frog.x, frog.y);
        this.ctx.rotate(frog.angle * Math.PI / 180);
        
        // Улучшенное тело лягушки
        this.drawDetailedFrog();
        
        this.ctx.restore();
    }
    
    drawLilyPad(x, y) {
    // 🌑 Тень под кувшинкой
    this.ctx.fillStyle = ART.shadowColor;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 12, 65, 18, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 🍃 Основной лист
    this.ctx.fillStyle = ART.colors.lily;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 70, 35, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 🍃 Светлая часть
    this.ctx.fillStyle = this.lightenColor(ART.colors.lily, 12);
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - 3, 60, 28, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 🌿 Прожилки
    this.ctx.strokeStyle = this.darkenColor(ART.colors.lily, 18);
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x + Math.cos(a) * 60,
            y + Math.sin(a) * 28
        );
        this.ctx.stroke();
    } // <- ЗАКРЫТ ЦИКЛ ДЛЯ ПРОЖИЛОК

    // 🌸 ЛОТОС
    this.ctx.fillStyle = ART.colors.lotus;
    for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + Math.cos(a) * 18,
            y + Math.sin(a) * 8 - 8,
            8, 16, a, 0, Math.PI * 2
        );
        this.ctx.fill();
    }
} // <- ЗАКРЫТ МЕТОД drawLilyPad
    
    drawDetailedFrog() {
        // Тело (большое и круглое)
        const bodyGradient = this.ctx.createLinearGradient(-40, -30, 40, 30);
        bodyGradient.addColorStop(0, '#66BB6A');
        bodyGradient.addColorStop(1, '#388E3C');
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 40, 30, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Голова
        this.ctx.beginPath();
        this.ctx.arc(45, 0, 35, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Щеки (розовые кружочки)
        this.ctx.fillStyle = '#FFCDD2';
        this.ctx.beginPath();
        this.ctx.arc(30, -10, 12, 0, Math.PI * 2);
        this.ctx.arc(30, 10, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Глаза (большие и выразительные)
        if (this.frog.state === 'blinking') {
            // Закрытые глаза
            this.ctx.fillStyle = '#388E3C';
            this.ctx.fillRect(50, -15, 20, 5);
            this.ctx.fillRect(50, 10, 20, 5);
        } else {
            // Открытые глаза
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(60, -12, 15, 0, Math.PI * 2);
            this.ctx.arc(60, 12, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Зрачки (следуют за целью)
            this.ctx.fillStyle = '#222';
            const eyeOffset = this.frog.state === 'aiming' ? 3 : 0;
            this.ctx.beginPath();
            this.ctx.arc(60 + eyeOffset, -12, 7, 0, Math.PI * 2);
            this.ctx.arc(60 + eyeOffset, 12, 7, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Блики в глазах
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(55, -15, 3, 0, Math.PI * 2);
            this.ctx.arc(55, 9, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Рот (анимированная улыбка)
        this.ctx.strokeStyle = '#1B5E20';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        if (this.frog.mouthOpen) {
            // Открытый рот для выстрела
            this.ctx.beginPath();
            this.ctx.arc(50, 0, 15, 0, Math.PI, false);
            this.ctx.stroke();
        } else {
            // Улыбка
            const smileY = 8 + this.frog.smile * 3;
            this.ctx.beginPath();
            this.ctx.arc(50, smileY, 18, 0.2, Math.PI - 0.2);
            this.ctx.stroke();
        }
        
        // Ноздри
        this.ctx.fillStyle = '#1B5E20';
        this.ctx.beginPath();
        this.ctx.arc(40, -5, 3, 0, Math.PI * 2);
        this.ctx.arc(40, 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Бантик на шее (для милоты)
        this.ctx.fillStyle = '#FF9800';
        this.ctx.beginPath();
        this.ctx.ellipse(15, 0, 8, 15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Точка на бантике
        this.ctx.fillStyle = '#FF5722';
        this.ctx.beginPath();
        this.ctx.arc(15, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 🎯 СЛЕДУЮЩИЙ ШАР ВО РТУ
if (this.frog.nextBall != null) {
    const mouthX = 58;
    const mouthY = 0;

    // тень
    this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this.ctx.beginPath();
    this.ctx.arc(mouthX + 3, mouthY + 3, 11, 0, Math.PI * 2);
    this.ctx.fill();

    // шар
    this.drawBallSprite(
        mouthX,
        mouthY,
        11,
        this.frog.nextBall
    );
}


    }
    
    drawPath() {
        if (this.chain.path.length < 2) return;
        
        // Толстый ручеек с градиентом
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, ART.colors.water);
        gradient.addColorStop(1, ART.colors.waterDark);

        // Тень
        this.ctx.strokeStyle = ART.shadowColor;
        this.ctx.lineWidth = 32;
        this.ctx.stroke();


        // Основной путь (толстый ручеек)
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 25; // Толстый путь
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();

        const losePoint = this.getPathPoint(LOSE_POSITION);

        this.ctx.strokeStyle = 'rgba(255,80,80,0.8)';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(losePoint.x, losePoint.y, 26, 0, Math.PI * 2);
        this.ctx.stroke();

        
        // Берега ручейка
        this.ctx.strokeStyle = '#558B2F';
        this.ctx.lineWidth = 8;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Блестки в ручейке
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < this.chain.path.length; i += 10) {
            const point = this.chain.path[i];
            const size = 2 + Math.sin(Date.now() * 0.001 + i * 0.1) * 1;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    drawWhirlpool() {
    if (!ASSETS.ready) return;

    const { x, y, radius } = this.whirlpool;

    const frameSize = 256;
    const frames = 4;

    if (!this.whirlpool.frame) this.whirlpool.frame = 0;
    this.whirlpool.frame += 0.12;

    const frame = Math.floor(this.whirlpool.frame) % frames;

    const size = radius * 2.4;

    this.ctx.drawImage(
        ASSETS.whirlpool,
        frame * frameSize, 0, frameSize, frameSize,
        x - size / 2,
        y - size / 2,
        size,
        size
    );
}



    drawGameOverScreen() {
        // Фон
        this.ctx.fillStyle = 'rgba(26, 35, 47, 0.95)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Рамка
        this.ctx.fillStyle = 'rgba(255, 87, 34, 0.2)';
        this.ctx.fillRect(this.width/2 - 200, this.height/2 - 150, 400, 300);
        
        this.ctx.strokeStyle = '#FF5722';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(this.width/2 - 200, this.height/2 - 150, 400, 300);
        
        // Заголовок - ПРОСТОЙ шрифт без каллиграфии
        this.ctx.fillStyle = '#FF5722';
        this.ctx.font = 'bold 48px Nunito, Arial, sans-serif'; // Простой шрифт
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('ИГРА ОКОНЧЕНА', this.width / 2, this.height / 2 - 80);
        
        // Результаты
        this.ctx.fillStyle = '#FFE0B2';
        this.ctx.font = '36px Nunito, Arial, sans-serif';
        this.ctx.fillText(`Счет: ${this.score}`, this.width / 2, this.height / 2 - 20);
        this.ctx.fillText(`Уровень: ${this.level}`, this.width / 2, this.height / 2 + 30);
        
        // Кнопка рестарта
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(this.width/2 - 120, this.height/2 + 80, 240, 60);
        
        this.ctx.strokeStyle = '#388E3C';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.width/2 - 120, this.height/2 + 80, 240, 60);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 28px Nunito, Arial, sans-serif';
        this.ctx.fillText('🔄 НАЧАТЬ ЗАНОВО', this.width / 2, this.height / 2 + 115);
        
        // Инструкция
        this.ctx.fillStyle = '#81D4FA';
        this.ctx.font = '20px Nunito, Arial, sans-serif';
        this.ctx.fillText('Нажмите кнопку или клавишу R', this.width / 2, this.height / 2 + 160);

        // Сохраняем координаты кнопки рестарта для клика
    this.gameOverRestartButton = {
        x: this.width/2 - 120,
        y: this.height/2 + 80,
        width: 240,
        height: 60
    };
    }
    
    // Остальные методы (shoot, restartGame, draw и т.д.) остаются такими же
    // как в предыдущей версии, но используют новую графику
    
    shoot() {
    // ❗ 0 — валидный цвет
    if (!Number.isInteger(this.frog.nextBall)) return;

    const angleRad = this.frog.angle * Math.PI / 180;
    const speed = 14;

    const colorIndex = this.frog.nextBall;

    this.projectiles.push({
        x: this.frog.x,
        y: this.frog.y,

        vx: Math.cos(angleRad) * speed,
        vy: Math.sin(angleRad) * speed,

        radius: BALL_RADIUS,
        colorIndex,

        trail: [],
        life: 120
    });

    // следующий шар
    this.frog.nextBall = this.randomColorIndex();
    console.log('🎨 nextBall =', this.frog.nextBall);

}
    randomColorIndex() {
    return Math.floor(Math.random() * BALL_COLORS_COUNT);
}



    
    restartGame() {
    console.log('Restarting game...');

    const savedLives = this.lives; // ← сохраняем жизни

    this.resetGame();

    this.lives = savedLives; // ← возвращаем уменьшенные жизни

    this.gameOver = false;
    this.isPaused = false;
    this.lastTime = 0;

    this.state = GAME_STATE.PLAY;
}

    clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

    
    drawGame() {
    // Фон (уже есть — этого достаточно)
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#E0F7FA');
    gradient.addColorStop(1, '#81D4FA');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Облака
    this.drawClouds();

    // Ручей
    this.drawPath();

    // Цепочка
    this.drawChain();

    // Водоворот
    this.drawWhirlpool();

    // Снаряды
    this.drawProjectiles();

    // Лягушка
    this.drawFrog();

    // Эффекты
    this.drawEffects();


    // Прицел
    this.drawAim();
        
    if (this.isTutorial) {
        this.drawTutorialHint();
    }

}
    drawTutorialHint() {
    const step = this.tutorialSteps[this.currentTutorialStep];
    if (!step) return;

    if (step.condition()) {
        step.shown = true;
        this.currentTutorialStep++;
        return;
    }

    const ctx = this.ctx;
    ctx.save();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(
        this.width / 2 - 220,
        this.height - 150,
        440,
        90,
        20
    );
    ctx.fill();

    ctx.fillStyle = '#2E7D32';
    ctx.font = 'bold 22px Nunito, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = step.text.split('\n');
    lines.forEach((l, i) => {
        ctx.fillText(
            l,
            this.width / 2,
            this.height - 120 + i * 26
        );
    });

    ctx.restore();
}



    drawWinScreen() {
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    if (this.isTutorial) {
    this.ctx.fillText(
        'Отлично! Ты готов 🐸✨',
        this.width / 2,
        this.height / 2 + 70
    );
}


    this.ctx.fillStyle = '#388E3C';
    this.ctx.font = 'bold 52px Nunito, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ПОБЕДА 🌸', this.width / 2, this.height / 2 - 40);
    this.isTutorial = false;


    this.ctx.font = '26px Nunito, Arial';
    this.ctx.fillText('Нажмите для следующего уровня', this.width / 2, this.height / 2 + 30);
}
    drawLoseScreen() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#FF7043';
    this.ctx.font = 'bold 52px Nunito, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ИГРА ОКОНЧЕНА', this.width / 2, this.height / 2 - 40);

    this.ctx.font = '26px Nunito, Arial';
    this.ctx.fillStyle = '#FFF';
    this.ctx.fillText('Нажмите для рестарта', this.width / 2, this.height / 2 + 30);
}

    handleClick() {

    if (this.state === GAME_STATE.WIN) {
        this.levelUp();
        this.state = GAME_STATE.PLAY;
        return;
    }

    if (this.state === GAME_STATE.LOSE) {
        this.restartGame();
        this.state = GAME_STATE.PLAY;
        return;
    }


    this.shoot();
}
    draw() {
    this.clear();

    switch (this.state) {
        case GAME_STATE.PLAY:
            this.drawGame();
            this.drawLivesUI();
            break;

        case GAME_STATE.WIN:
            this.drawGame(); // фон уровня
            this.drawWinScreen();
            break;

        case GAME_STATE.LOSE:
            this.drawGame();
            this.drawLoseScreen();
            break;
    }
}
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Облако 1
        this.ctx.beginPath();
        this.ctx.arc(100, 80, 30, 0, Math.PI * 2);
        this.ctx.arc(130, 70, 35, 0, Math.PI * 2);
        this.ctx.arc(160, 80, 30, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Облако 2
        this.ctx.beginPath();
        this.ctx.arc(this.width - 100, 120, 25, 0, Math.PI * 2);
        this.ctx.arc(this.width - 130, 110, 30, 0, Math.PI * 2);
        this.ctx.arc(this.width - 160, 120, 25, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    // ... остальные методы drawChain, drawProjectiles, drawEffects и т.д.
    // такие же как в предыдущей версии, но могут использовать улучшенную графику
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return '#' + (
            0x1000000 +
            (R > 0 ? R : 0) * 0x10000 +
            (G > 0 ? G : 0) * 0x100 +
            (B > 0 ? B : 0)
        ).toString(16).slice(1);
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.ZumaGame = ZumaGame;
}

console.log('Zuma Frog Game Engine loaded successfully!');

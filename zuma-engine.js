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

const GAME_STATE = {
    MENU: 'MENU',
    MAP: 'MAP',
    PLAY: 'PLAY',
    WIN: 'WIN',
    LOSE: 'LOSE'
};

class ZumaGame {
    constructor(canvasId) {
        console.log('Creating game instance...');
        
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error('Canvas not found!');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.state = GAME_STATE.MENU
        
        
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
        
        // Лягушка - теперь в ЦЕНТРЕ!
        this.frog = {
            x: this.width / 2,
            y: this.height / 2, // Центр экрана!
            angle: -90,
            nextBall: this.getRandomColor(),
            state: 'idle',
            blinkTimer: 0,
            mouthOpen: false,
            smile: 0 // Для анимации улыбки
        };
        
        // Цепочка шаров - большая круглая спираль
        this.chain = {
            balls: [],
            path: this.generateRoundSpiralPath(), // Новая круглая спираль
            speed: 0.25 + (this.level * 0.015), // Еще медленнее
            headPosition: 0
        };
        
        // Проектили
        this.projectiles = [];
        
        // Эффекты
        this.explosions = [];
        this.particles = [];
        this.comboTexts = [];
        
        // Создаем цепочку
        this.createChain();
        
        console.log('Game reset');
    }
    
    // Генерация КРУГЛОЙ спирали в виде ручейка
    generateRoundSpiralPath() {
        const path = [];
        const segments = 400; // Больше сегментов для плавности
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Большая круглая спираль (3 оборота)
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 6; // 3 оборота
            const spiralFactor = 1 - (i / segments) * 0.2; // Плавное сужение
            const radius = Math.min(this.width, this.height) * 0.4 * spiralFactor;
            
            // Круговая спираль
            const x = centerX + Math.cos(t) * radius;
            const y = centerY + Math.sin(t) * radius;
            
            path.push({x, y});
        }
        
        return path;
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
    const x = 20;
    const y = 20;
    const heartSize = 18;
    const spacing = 26;

    ctx.save();

    // Фон-плашка
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.strokeStyle = 'rgba(120, 180, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 10, 200, 60, 16);
    ctx.fill();
    ctx.stroke();

    // Сердца
    for (let i = 0; i < this.maxLives; i++) {
        const hx = x + i * spacing;
        const hy = y + 20;

        if (i < this.lives) {
            ctx.fillStyle = '#E57373'; // тёплый красный
        } else {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
        }

        ctx.font = `${heartSize}px serif`;
        ctx.fillText('❤️', hx, hy);
    }

    // Таймер восстановления
if (this.lives < this.maxLives) {
    const now = Date.now();
    const timeLeft = Math.max(0, 600000 - (now - this.lastLifeRestore));
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    ctx.fillStyle = '#4E6E5D';
    ctx.font = '14px Nunito, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillText(
        `${minutes}:${seconds.toString().padStart(2, '0')}`,
        x,
        y + 38
    );
}

ctx.restore();}
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
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }
    
    init() {
        console.log('Starting game...');
        this.startGameLoop();
    }
    
    createChain() {
        this.chain.balls = [];
        const ballCount = 18 + this.level * 2;
        const spacing = 0.022; // Расстояние между шарами
        
        for (let i = 0; i < ballCount; i++) {
            const position = i * spacing;
            const point = this.getPathPoint(position);
            
            this.chain.balls.push({
                position: position,
                color: this.getRandomColor(),
                radius: 20, // Чуть больше шары
                index: i,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.02
            });
        }
        
        this.chain.balls.sort((a, b) => a.position - b.position);
        if (this.chain.balls.length > 0) {
    this.chain.balls[this.chain.balls.length - 1].type = 'bug';
}
        this.chain.headPosition = this.chain.balls[0]?.position || 0;
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
    
    update(delta) {
    if (this.state !== GAME_STATE.PLAY) return;

    this.updateFrog(delta);
    this.updateChain(delta);
    this.updateProjectiles(delta);
    this.updateEffects(delta);

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
        // Движение цепочки
        const speedMultiplier = 0.25;
        this.chain.headPosition += (this.chain.speed / 200) * delta * speedMultiplier;
        
        // Обновляем каждый шар
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            
            if (i === 0) {
                ball.position = this.chain.headPosition;
            } else {
                const targetPos = this.chain.balls[i-1].position - 0.02;
                const diff = targetPos - ball.position;
                
                if (Math.abs(diff) > 0.001) {
                    ball.position += diff * 0.05 * delta * speedMultiplier;
                }
            }
            
            // Колебание
            ball.wobble += ball.wobbleSpeed * delta;
            
            // Проверка конца пути
            if (ball.position >= 0.85) {
                this.loseLife();
                this.chain.balls.splice(i, 1);
                i--;
            }
        }
    }
    
    loseLife() {
        // ФИКС: не позволяем жизням уходить в минус
        if (this.lives > 0) {
            this.lives--;
        }
        
        const endPoint = this.getPathPoint(0.85);
        this.createExplosion(endPoint.x, endPoint.y, '#FF6B6B', 25);
        
        if (this.lives <= 0) {
            this.gameOver = true;
            this.state = GAME_STATE.LOSE;
        }
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
    // Ищем ближайший шар в цепочке
    let closestBall = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < this.chain.balls.length; i++) {
        const ball = this.chain.balls[i];
        const point = this.getPathPoint(ball.position);
        const dx = proj.x - point.x;
        const dy = proj.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (proj.radius + ball.radius) && distance < minDistance) {
            minDistance = distance;
            closestBall = { ball, index: i, point };
        }
    }
    
    return closestBall ? { ball: closestBall.ball, index: closestBall.index, point: closestBall.point } : null;
}

handleProjectileCollision(projIndex, proj, collision) {
    // Создаем эффект взрыва
    this.createExplosion(proj.x, proj.y, proj.color, 15);
    
    // Вставляем шар в цепочку
    const newBall = {
        position: collision.ball.position,
        color: proj.color,
        radius: 20,
        index: collision.index,
        wobble: 0,
        wobbleSpeed: 0.02 + Math.random() * 0.02
    };
    
    // Вставляем шар перед тем, в который попали
    this.chain.balls.splice(collision.index, 0, newBall);
    
    // Удаляем снаряд
    this.projectiles.splice(projIndex, 1);
    
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
    
    const color = this.chain.balls[startIndex].color;
    let matches = [startIndex];
    
    // Проверяем влево
    for (let i = startIndex - 1; i >= 0; i--) {
        if (this.chain.balls[i].color === color) {
            matches.unshift(i);
        } else break;
    }
    
    // Проверяем вправо
    for (let i = startIndex + 1; i < this.chain.balls.length; i++) {
        if (this.chain.balls[i].color === color) {
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
        this.createExplosion(point.x, point.y, ball.color, 25);
        
        // Удаляем шар
        this.chain.balls.splice(index, 1);
    }
    
    // Обновляем индексы
    for (let i = 0; i < this.chain.balls.length; i++) {
        this.chain.balls[i].index = i;
    }
    
    // Проверяем конец уровня
    if (this.chain.balls.length === 0) {
        this.state = GAME_STATE.WIN;
        this.levelUp();
    }
}

levelUp() {
    this.level++;
    this.lives = Math.min(this.lives + 1, 10); // Добавляем жизнь, но не больше 10
    
    // Увеличиваем скорость
    this.chain.speed = 0.25 + (this.level * 0.015);
    
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
        const point = this.getPathPoint(ball.position);

        const wobbleX = Math.sin(ball.wobble) * 2;
        const wobbleY = Math.cos(ball.wobble) * 2;

        const x = point.x + wobbleX;
        const y = point.y + wobbleY;

        // 🐞 ЕСЛИ ЭТО ЖУЧОК — РИСУЕМ ЕГО
        if (ball.type === 'bug') {
            this.drawBug(x, y, ball.radius);
        } 
        // ⚪ ОБЫЧНЫЙ ШАР
        else {
            this.drawShinyBall(x, y, ball.radius, ball.color);
        }
    }
}

drawBug(x, y, r) {
    // Тело
    this.ctx.fillStyle = ART.colors.bugRed;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Линия
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.stroke();

    // Точки
    this.ctx.beginPath();
    this.ctx.arc(x - 6, y - 4, 3, 0, Math.PI * 2);
    this.ctx.arc(x + 6, y + 4, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#000';
    this.ctx.fill();
}    
drawShinyBall(x, y, radius, color) {
    // Основной цвет
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Блик
    const gradient = this.ctx.createRadialGradient(
        x - radius/3, y - radius/3, 1,
        x - radius/3, y - radius/3, radius/2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x - radius/3, y - radius/3, radius/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Контур
    this.ctx.strokeStyle = this.darkenColor(color, 30);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
}

drawProjectiles() {
    for (const proj of this.projectiles) {
        // След
        for (let i = 0; i < proj.trail.length; i++) {
            const point = proj.trail[i];
            const alpha = i / proj.trail.length * 0.3;
            
            // ФИКС: правильное создание цвета с альфа-каналом
            const color = proj.color;
            let rgbaColor;
            
            if (color.startsWith('#')) {
                // HEX в RGBA
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                rgbaColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else if (color.startsWith('rgb')) {
                // RGB в RGBA
                rgbaColor = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            } else {
                rgbaColor = `rgba(255, 255, 255, ${alpha})`; // fallback
            }
            
            this.ctx.fillStyle = rgbaColor;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, proj.radius * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Основной шар
        this.drawShinyBall(proj.x, proj.y, proj.radius, proj.color);
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
    if (!this.frog.nextBall) return;

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
    if (this.gameOver || this.isPaused) return;
    
    const angle = this.frog.angle * Math.PI / 180;
    let x = this.frog.x;
    let y = this.frog.y;
    
    // Линия прицела
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    
    for (let i = 1; i <= 20; i++) {
        x += Math.cos(angle) * 20;
        y += Math.sin(angle) * 20;
        this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Круг прицела на конце
    this.ctx.strokeStyle = '#FF9800';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 15, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Точка в центре
    this.ctx.fillStyle = '#FF9800';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();
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
    const end = this.getPathPoint(0.85);
    const time = Date.now() * 0.002;

    this.ctx.save();
    this.ctx.translate(end.x, end.y);
    this.ctx.rotate(time);

    const r = 45;
    const grad = this.ctx.createRadialGradient(0, 0, 5, 0, 0, r);
    grad.addColorStop(0, ART.colors.whirlpoolCenter);
    grad.addColorStop(1, ART.colors.whirlpoolEdge);

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
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
        if (!this.frog.nextBall || this.gameOver || this.isPaused) return;
        
        const angle = this.frog.angle * Math.PI / 180;
        const speed = 10;
        
        this.projectiles.push({
            x: this.frog.x + Math.cos(angle) * 50,
            y: this.frog.y + Math.sin(angle) * 50,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: this.frog.nextBall,
            radius: 20,
            life: 150,
            trail: []
        });
        
        // Анимация стрельбы
        this.frog.state = 'shooting';
        this.frog.mouthOpen = true;
        this.frog.nextBall = this.getRandomColor();
        
        setTimeout(() => {
            this.frog.mouthOpen = false;
            this.frog.state = 'aiming';
        }, 100);
    }
    
    restartGame() {
        console.log('Restarting game...');
        this.resetGame();
        this.gameOver = false;
        this.shouldShowGameOver = false;
        this.isPaused = false;
        this.lastTime = 0;
    }
    startGame() {
    this.resetGame();
    this.state = GAME_STATE.PLAY;
}
    clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

    
    drawGame() {
    // Фон
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#E0F7FA');
    gradient.addColorStop(1, '#81D4FA');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawClouds();
    this.drawPath();
    this.drawChain();
    this.drawProjectiles();
    this.drawFrog();
    this.drawEffects();
    this.drawNextBall();
    this.drawAim();
}
    drawMenu() {
    this.ctx.fillStyle = '#E3F2FD';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#2E7D32';
    this.ctx.font = 'bold 56px Nunito, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🐸 ZUMA FROG', this.width / 2, this.height / 2 - 60);

    this.ctx.font = '28px Nunito, Arial';
    this.ctx.fillText('Нажмите, чтобы начать', this.width / 2, this.height / 2 + 20);
}
    drawWinScreen() {
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#388E3C';
    this.ctx.font = 'bold 52px Nunito, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ПОБЕДА 🌸', this.width / 2, this.height / 2 - 40);

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
    drawLivesUI() {
    for (let i = 0; i < this.lives; i++) {
        this.ctx.fillStyle = '#E53935';
        this.ctx.beginPath();
        this.ctx.arc(30 + i * 28, 30, 10, 0, Math.PI * 2);
        this.ctx.fill();
    }
}
    handleClick() {
    if (this.state === GAME_STATE.MENU) {
        this.state = GAME_STATE.PLAY;
        return;
    }

    if (this.state === GAME_STATE.WIN) {
        this.levelUp();
        this.state = GAME_STATE.PLAY;
        return;
    }

    if (this.state === GAME_STATE.LOSE) {
        this.restartGame();
        this.state = GAME_STATE.MENU;
        return;
    }

    this.shoot();
}
    draw() {
    this.clear();

    switch (this.state) {
        case GAME_STATE.MENU:
            this.drawMenu();
            break;

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

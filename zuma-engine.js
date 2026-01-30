// zuma-engine.js - Исправленная версия с настройкой скорости и рестартом
console.log('Zuma Game Engine loading...');

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
        this.lives = 5;
        this.isPaused = false;
        this.gameOver = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameLoopId = null;
        
        // Лягушка
        this.frog = {
            x: this.width / 2,
            y: this.height - 120,
            angle: -90,
            nextBall: this.getRandomColor(),
            state: 'idle',
            blinkTimer: 0,
            mouthOpen: false
        };
        
        // Цепочка шаров - УМЕНЬШЕННАЯ СКОРОСТЬ
        this.chain = {
            balls: [],
            path: this.generateSpiralPath(),
            speed: 0.3 + (this.level * 0.02), // Уменьшено с 0.5 до 0.3
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
    
    // Генерация красивой спирали
    generateSpiralPath() {
        const path = [];
        const segments = 300;
        const centerX = this.width / 2;
        const centerY = this.height / 2 - 50;
        
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 3; // 1.5 оборота (уменьшено с 4)
            const spiralFactor = 1 - (i / segments) * 0.4; // Более плавная спираль
            const radius = 160 * spiralFactor + Math.sin(t * 2) * 15; // Уменьшена амплитуда
            
            // Плавная спираль
            const x = centerX + Math.cos(t) * radius;
            const y = centerY + Math.sin(t) * radius * 0.7 + t * 6; // Уменьшен подъем
            
            path.push({x, y});
        }
        
        return path;
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
        this.setupControls();
        this.updateUI();
    }
    
    createChain() {
        this.chain.balls = [];
        const ballCount = 15 + this.level * 2; // Уменьшено с 20
        const spacing = 0.028; // Увеличено расстояние между шарами
        
        for (let i = 0; i < ballCount; i++) {
            const position = i * spacing;
            const point = this.getPathPoint(position);
            
            this.chain.balls.push({
                position: position,
                color: this.getRandomColor(),
                radius: 18,
                index: i,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.03 + Math.random() * 0.03 // Уменьшена скорость колебаний
            });
        }
        
        this.chain.balls.sort((a, b) => a.position - b.position);
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
            }
            
            this.gameLoopId = requestAnimationFrame(gameLoop);
        };
        
        this.gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    update(delta) {
        // Обновляем состояние лягушки
        this.updateFrog(delta);
        
        // Движение цепочки - УМЕНЬШЕННАЯ СКОРОСТЬ
        this.updateChain(delta);
        
        // Обновление снарядов
        this.updateProjectiles(delta);
        
        // Обновление эффектов
        this.updateEffects(delta);
    }
    
    updateFrog(delta) {
        // Моргание
        this.frog.blinkTimer += delta;
        if (this.frog.blinkTimer > 500) { // Каждые 8 секунд в игровом времени
            this.frog.blinkTimer = 0;
            this.frog.state = 'blinking';
            setTimeout(() => {
                if (this.frog.state === 'blinking') this.frog.state = 'idle';
            }, 150);
        }
        
        // Автоматический переход от aiming к idle
        if (this.frog.state === 'aiming') {
            this.frog.aimTimer = (this.frog.aimTimer || 0) + delta;
            if (this.frog.aimTimer > 2000) { // 2 секунды бездействия
                this.frog.state = 'idle';
                this.frog.aimTimer = 0;
            }
        } else {
            this.frog.aimTimer = 0;
        }
    }
    
    updateChain(delta) {
        // УМЕНЬШЕННАЯ СКОРОСТЬ ДВИЖЕНИЯ
        const speedMultiplier = 0.3; // Коэффициент замедления
        this.chain.headPosition += (this.chain.speed / 150) * delta * speedMultiplier;
        
        // Обновляем каждый шар с учетом плавности
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            
            // Плавное движение за предыдущим шаром
            if (i === 0) {
                ball.position = this.chain.headPosition;
            } else {
                const targetPos = this.chain.balls[i-1].position - 0.025; // Увеличено расстояние
                const diff = targetPos - ball.position;
                
                // Плавное приближение с физикой
                if (Math.abs(diff) > 0.001) {
                    ball.position += diff * 0.08 * delta * speedMultiplier; // Замедлено
                }
            }
            
            // Колебание для живого эффекта
            ball.wobble += ball.wobbleSpeed * delta;
            
            // Проверка конца пути (увеличен порог)
            if (ball.position >= 0.88) { // Было 0.92
                this.loseLife();
                this.chain.balls.splice(i, 1);
                i--;
            }
        }
    }
    
    updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // Плавное движение с замедлением
            p.vx *= 0.998;
            p.vy *= 0.998;
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            
            // Проверка столкновений
            const collision = this.checkCollision(p);
            if (collision) {
                this.handleCollision(p, collision);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Удаление старых снарядов
            p.life -= delta;
            if (p.life <= 0 || 
                p.x < -50 || p.x > this.width + 50 || 
                p.y < -50 || p.y > this.height + 50) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateEffects(delta) {
        // Взрывы
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.radius += exp.growth * delta * 0.5; // Замедлено
            exp.alpha -= 0.015 * delta; // Замедлено
            
            if (exp.alpha <= 0) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            p.vy += 0.05; // Уменьшена гравитация
            p.life -= delta;
            p.alpha = p.life / p.maxLife;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Текст комбо
        for (let i = this.comboTexts.length - 1; i >= 0; i--) {
            const text = this.comboTexts[i];
            text.y -= 0.8 * delta; // Замедлено
            text.life -= delta;
            text.alpha = text.life / text.maxLife;
            
            if (text.life <= 0) {
                this.comboTexts.splice(i, 1);
            }
        }
    }
    
    loseLife() {
        this.lives--;
        this.updateUI();
        
        const endPoint = this.getPathPoint(0.88);
        this.createExplosion(endPoint.x, endPoint.y, '#FF6B6B', 25);
        
        if (this.lives <= 0) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    
    checkCollision(projectile) {
        // Проверка с учетом радиуса
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            const point = this.getPathPoint(ball.position);
            
            // Добавляем колебание к позиции
            const wobbleX = Math.cos(ball.wobble) * 1.5; // Уменьшена амплитуда
            const wobbleY = Math.sin(ball.wobble) * 1.5;
            
            const dx = (point.x + wobbleX) - projectile.x;
            const dy = (point.y + wobbleY) - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + projectile.radius) {
                return { ball, index: i, point: {x: point.x + wobbleX, y: point.y + wobbleY} };
            }
        }
        return null;
    }
    
    handleCollision(projectile, collision) {
        // Находим точку для вставки
        let insertPosition;
        if (collision.index === 0) {
            insertPosition = collision.ball.position + 0.015;
        } else {
            const prevBall = this.chain.balls[collision.index - 1];
            insertPosition = (prevBall.position + collision.ball.position) / 2;
        }
        
        // Вставляем новый шар
        const newBall = {
            position: insertPosition,
            color: projectile.color,
            radius: 18,
            index: collision.index,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.03 + Math.random() * 0.03
        };
        
        this.chain.balls.splice(collision.index, 0, newBall);
        
        // Переиндексация
        this.chain.balls.forEach((ball, idx) => ball.index = idx);
        
        // Проверка совпадений
        const matches = this.checkMatches(collision.index);
        
        // Эффект попадания
        this.createExplosion(projectile.x, projectile.y, projectile.color, 15);
        this.createParticles(projectile.x, projectile.y, projectile.color, 8);
    }
    
    checkMatches(insertedIndex) {
        const color = this.chain.balls[insertedIndex].color;
        const matches = [insertedIndex];
        
        // Проверяем соседей
        for (let i = insertedIndex - 1; i >= 0; i--) {
            if (this.chain.balls[i].color === color) matches.push(i);
            else break;
        }
        for (let i = insertedIndex + 1; i < this.chain.balls.length; i++) {
            if (this.chain.balls[i].color === color) matches.push(i);
            else break;
        }
        
        // Если 3+ совпадения
        if (matches.length >= 3) {
            matches.sort((a, b) => b - a);
            
            // Создаем эффекты для каждого удаляемого шара
            matches.forEach(index => {
                const ball = this.chain.balls[index];
                const point = this.getPathPoint(ball.position);
                this.createExplosion(point.x, point.y, ball.color, 20);
                this.createParticles(point.x, point.y, ball.color, 12);
            });
            
            // Удаляем шары
            matches.forEach(index => this.chain.balls.splice(index, 1));
            
            // Начисляем очки с комбо
            const comboScore = matches.length * 100 * this.level;
            this.score += comboScore;
            
            // Текст комбо
            if (matches.length > 3) {
                const point = this.getPathPoint(this.chain.balls[Math.max(0, insertedIndex-1)]?.position || 0.5);
                this.createComboText(point.x, point.y, `${matches.length} COMBO!`, comboScore);
            }
            
            this.updateUI();
            
            // Проверка цепной реакции
            this.checkChainReactions();
            
            // Проверка победы
            if (this.chain.balls.length === 0) {
                this.levelComplete();
            }
            
            return matches;
        }
        
        return [];
    }
    
    checkChainReactions() {
        let hadReaction = false;
        do {
            hadReaction = false;
            for (let i = 0; i < this.chain.balls.length; i++) {
                const color = this.chain.balls[i].color;
                const matches = this.findConnected(i, color);
                
                if (matches.length >= 3) {
                    matches.sort((a, b) => b - a);
                    
                    matches.forEach(index => {
                        const ball = this.chain.balls[index];
                        const point = this.getPathPoint(ball.position);
                        this.createExplosion(point.x, point.y, ball.color, 25);
                    });
                    
                    matches.forEach(index => this.chain.balls.splice(index, 1));
                    this.score += matches.length * 150 * this.level;
                    hadReaction = true;
                    break;
                }
            }
        } while (hadReaction);
        
        this.updateUI();
    }
    
    findConnected(startIndex, color) {
        const matches = [startIndex];
        const visited = new Set([startIndex]);
        const stack = [startIndex];
        
        while (stack.length > 0) {
            const current = stack.pop();
            
            // Проверяем соседей
            const neighbors = [current - 1, current + 1].filter(idx => 
                idx >= 0 && 
                idx < this.chain.balls.length && 
                !visited.has(idx) && 
                this.chain.balls[idx].color === color
            );
            
            neighbors.forEach(idx => {
                matches.push(idx);
                visited.add(idx);
                stack.push(idx);
            });
        }
        
        return matches;
    }
    
    createExplosion(x, y, color, size = 20) {
        this.explosions.push({
            x, y,
            radius: 3, // Уменьшен начальный размер
            color: color,
            alpha: 1,
            growth: size / 15 // Замедлен рост
        });
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2; // Уменьшена скорость
            
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 2 + Math.random() * 3,
                life: 40 + Math.random() * 20, // Уменьшено время жизни
                maxLife: 40 + Math.random() * 20
            });
        }
    }
    
    createComboText(x, y, text, score) {
        this.comboTexts.push({
            x, y,
            text: text,
            score: `+${score}`,
            life: 100, // Уменьшено
            maxLife: 100,
            alpha: 1
        });
    }
    
    levelComplete() {
        this.score += 1500 * this.level;
        this.level++;
        this.chain.speed = 0.3 + (this.level * 0.02); // Сохраняем медленную скорость
        
        // Эффект победы
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.createExplosion(
                    Math.random() * this.width,
                    Math.random() * this.height,
                    this.colors[Math.floor(Math.random() * this.colors.length)],
                    25
                );
            }, i * 70); // Увеличен интервал
        }
        
        // Анимация лягушки
        this.frog.state = 'celebrating';
        setTimeout(() => this.frog.state = 'idle', 800);
        
        this.updateUI();
        
        // Новый уровень через 1.5 секунды
        setTimeout(() => {
            this.createChain();
            this.frog.nextBall = this.getRandomColor();
        }, 1500);
    }
    
    showGameOver() {
        // Сохраняем контекст для отрисовки
        this.shouldShowGameOver = true;
    }
    
    drawGameOverScreen() {
        if (!this.shouldShowGameOver) return;
        
        // Полупрозрачный фон
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Рамка
        this.ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';
        this.ctx.fillRect(this.width/2 - 180, this.height/2 - 140, 360, 280);
        
        this.ctx.strokeStyle = '#FF6B6B';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(this.width/2 - 180, this.height/2 - 140, 360, 280);
        
        // Заголовок
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.font = 'bold 44px "Comic Sans MS", cursive';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('ИГРА ОКОНЧЕНА', this.width / 2, this.height / 2 - 80);
        
        // Результаты
        this.ctx.fillStyle = '#FFEAA7';
        this.ctx.font = '36px Arial';
        this.ctx.fillText(`🍯 Счет: ${this.score}`, this.width / 2, this.height / 2 - 20);
        this.ctx.fillText(`🚀 Уровень: ${this.level}`, this.width / 2, this.height / 2 + 30);
        
        // Кнопка рестарта
        this.ctx.fillStyle = '#81C784';
        this.ctx.fillRect(this.width/2 - 100, this.height/2 + 80, 200, 60);
        
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.width/2 - 100, this.height/2 + 80, 200, 60);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillText('🔄 РЕСТАРТ', this.width / 2, this.height / 2 + 115);
        
        // Инструкция
        this.ctx.fillStyle = '#B3E0FF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Нажмите кнопку или клавишу R', this.width / 2, this.height / 2 + 160);
    }
    
    shoot() {
        if (!this.frog.nextBall || this.gameOver || this.isPaused) return;
        
        const angle = this.frog.angle * Math.PI / 180;
        const speed = 12; // Уменьшена скорость снарядов
        
        this.projectiles.push({
            x: this.frog.x + Math.cos(angle) * 40,
            y: this.frog.y + Math.sin(angle) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: this.frog.nextBall,
            radius: 18,
            life: 150, // Уменьшено время жизни
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
        
        this.updateUI();
    }
    
    restartGame() {
        console.log('Restarting game...');
        
        // Сброс состояния
        this.resetGame();
        
        // Очистка экрана
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Сброс флагов
        this.gameOver = false;
        this.shouldShowGameOver = false;
        this.isPaused = false;
        
        // Перезапуск игрового цикла
        this.lastTime = 0;
        this.startGameLoop();
        
        // Обновление UI
        this.updateUI();
        
        console.log('Game restarted');
    }
    
    draw() {
        // Градиентный фон
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#F8F3D6');
        gradient.addColorStop(0.5, '#E9F5DB');
        gradient.addColorStop(1, '#D4EDDA');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Декоративные облака
        this.drawClouds();
        
        // Рисуем путь
        this.drawPath();
        
        // Конец пути (цветок)
        this.drawFlower();
        
        // Цепочка шаров
        this.drawChain();
        
        // Снаряды с трейлами
        this.drawProjectiles();
        
        // Лягушка на листе
        this.drawFrog();
        
        // Эффекты
        this.drawEffects();
        
        // Следующий шар
        this.drawNextBall();
        
        // Прицел
        this.drawAim();
        
        // UI поверх всего
        this.drawUI();
        
        // Экран Game Over (если нужно)
        if (this.gameOver) {
            this.drawGameOverScreen();
        }
    }
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        
        // Облако 1
        this.ctx.beginPath();
        this.ctx.arc(100, 80, 25, 0, Math.PI * 2);
        this.ctx.arc(130, 70, 30, 0, Math.PI * 2);
        this.ctx.arc(160, 80, 25, 0, Math.PI * 2);
        this.ctx.arc(130, 90, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Облако 2
        this.ctx.beginPath();
        this.ctx.arc(this.width - 100, 120, 20, 0, Math.PI * 2);
        this.ctx.arc(this.width - 130, 110, 25, 0, Math.PI * 2);
        this.ctx.arc(this.width - 160, 120, 20, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawPath() {
        if (this.chain.path.length < 2) return;
        
        // Тень пути
        this.ctx.strokeStyle = 'rgba(139, 195, 74, 0.5)';
        this.ctx.lineWidth = 8;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();
        
        // Основной путь
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.lineWidth = 5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();
    }
    
    drawFlower() {
        const endPoint = this.getPathPoint(0.88);
        
        // Стебель
        this.ctx.strokeStyle = '#81C784';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(endPoint.x, endPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y + 50);
        this.ctx.stroke();
        
        // Листья
        this.ctx.fillStyle = '#A5D6A7';
        this.ctx.beginPath();
        this.ctx.ellipse(endPoint.x - 15, endPoint.y + 25, 20, 8, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(endPoint.x + 15, endPoint.y + 30, 20, 8, -0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Цветок
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFF59D';
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 14, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Лепестки
        this.ctx.fillStyle = 'rgba(255, 152, 0, 0.6)';
        const petals = 6;
        for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2;
            const px = endPoint.x + Math.cos(angle) * 28;
            const py = endPoint.y + Math.sin(angle) * 28;
            
            this.ctx.beginPath();
            this.ctx.ellipse(px, py, 8, 4, angle, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Опасная зона
        this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 30, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawChain() {
        for (const ball of this.chain.balls) {
            const point = this.getPathPoint(ball.position);
            const wobbleX = Math.cos(ball.wobble) * 1.5;
            const wobbleY = Math.sin(ball.wobble) * 1.5;
            
            this.drawBall(point.x + wobbleX, point.y + wobbleY, ball.radius, ball.color);
        }
    }
    
    drawBall(x, y, radius, color) {
        // Тень
        this.ctx.beginPath();
        this.ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        this.ctx.fill();
        
        // Основной шар с градиентом
        const gradient = this.ctx.createRadialGradient(
            x - radius/3, y - radius/3, 1,
            x, y, radius
        );
        
        // Яркий центр
        const brightColor = this.lightenColor(color, 30);
        gradient.addColorStop(0, brightColor);
        gradient.addColorStop(0.6, color);
        gradient.addColorStop(1, this.darkenColor(color, 15));
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Яркий блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/3, y - radius/3, radius/3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.fill();
        
        // Маленький блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/4, y - radius/4, radius/6, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fill();
        
        // Контур
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
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
            (G > 0 ? G : 

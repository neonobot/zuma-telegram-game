// zuma-engine.js - Улучшенная версия с лягушкой и плавной графикой
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
        
        // Игровые переменные
        this.score = 0;
        this.level = 1;
        this.lives = 5;
        this.isPaused = false;
        this.gameOver = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Лягушка
        this.frog = {
            x: this.width / 2,
            y: this.height - 120,
            angle: -90,
            nextBall: this.getRandomColor(),
            state: 'idle', // idle, aiming, shooting
            blinkTimer: 0,
            mouthOpen: false
        };
        
        // Цепочка шаров
        this.chain = {
            balls: [],
            path: this.generateSpiralPath(),
            speed: 0.5 + (this.level * 0.05),
            headPosition: 0
        };
        
        // Проектили
        this.projectiles = [];
        
        // Эффекты
        this.explosions = [];
        this.particles = [];
        this.comboTexts = [];
        
        // Изображения (загружаем асинхронно)
        this.images = {};
        this.loadImages();
        
        console.log('Game initialized');
    }
    
    // Загрузка изображений
    async loadImages() {
        // Можно добавить загрузку реальных изображений если будут
        console.log('Images loaded');
    }
    
    // Генерация красивой спирали
    generateSpiralPath() {
        const path = [];
        const segments = 300;
        const centerX = this.width / 2;
        const centerY = this.height / 2 - 50;
        
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 4; // 2 оборота
            const spiralFactor = 1 - (i / segments) * 0.3; // Сужаем спираль
            const radius = 180 * spiralFactor + Math.sin(t * 3) * 20;
            
            // Плавная спираль
            const x = centerX + Math.cos(t) * radius;
            const y = centerY + Math.sin(t) * radius * 0.8 + t * 8;
            
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
        this.createChain();
        this.startGameLoop();
        this.setupControls();
        this.updateUI();
    }
    
    createChain() {
        this.chain.balls = [];
        const ballCount = 20 + this.level * 3;
        const spacing = 0.025; // Расстояние между шарами
        
        for (let i = 0; i < ballCount; i++) {
            const position = i * spacing;
            const point = this.getPathPoint(position);
            
            this.chain.balls.push({
                position: position,
                color: this.getRandomColor(),
                radius: 18,
                index: i,
                wobble: Math.random() * Math.PI * 2, // Для плавного движения
                wobbleSpeed: 0.05 + Math.random() * 0.05
            });
        }
        
        this.chain.balls.sort((a, b) => a.position - b.position);
        this.chain.headPosition = this.chain.balls[0]?.position || 0;
    }
    
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.isPaused && !this.gameOver) {
                this.deltaTime = timestamp - this.lastTime;
                this.lastTime = timestamp;
                
                // Фиксированный шаг времени для плавности
                const fixedDelta = Math.min(this.deltaTime, 32) / 16.67;
                
                this.update(fixedDelta);
                this.draw();
            }
            requestAnimationFrame(gameLoop.bind(this));
        };
        requestAnimationFrame(gameLoop);
    }
    
    update(delta) {
        // Обновляем состояние лягушки
        this.updateFrog(delta);
        
        // Движение цепочки
        this.updateChain(delta);
        
        // Обновление снарядов
        this.updateProjectiles(delta);
        
        // Обновление эффектов
        this.updateEffects(delta);
    }
    
    updateFrog(delta) {
        // Моргание
        this.frog.blinkTimer += delta;
        if (this.frog.blinkTimer > 300) { // Каждые 5 секунд в игровом времени
            this.frog.blinkTimer = 0;
            this.frog.state = 'blinking';
            setTimeout(() => {
                if (this.frog.state === 'blinking') this.frog.state = 'idle';
            }, 100);
        }
        
        // Открытие/закрытие рта при стрельбе
        if (this.frog.state === 'shooting') {
            this.frog.mouthOpen = true;
            setTimeout(() => {
                this.frog.mouthOpen = false;
                this.frog.state = 'aiming';
            }, 100);
        }
    }
    
    updateChain(delta) {
        // Плавное движение цепочки
        this.chain.headPosition += (this.chain.speed / 100) * delta;
        
        // Обновляем каждый шар с учетом плавности
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            
            // Плавное движение за предыдущим шаром
            if (i === 0) {
                ball.position = this.chain.headPosition;
            } else {
                const targetPos = this.chain.balls[i-1].position - 0.018;
                const diff = targetPos - ball.position;
                
                // Плавное приближение с физикой
                if (Math.abs(diff) > 0.001) {
                    ball.position += diff * 0.1 * delta;
                }
            }
            
            // Колебание для живого эффекта
            ball.wobble += ball.wobbleSpeed * delta;
            
            // Проверка конца пути
            if (ball.position >= 0.92) {
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
            p.vx *= 0.995;
            p.vy *= 0.995;
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
            exp.radius += exp.growth * delta;
            exp.alpha -= 0.02 * delta;
            
            if (exp.alpha <= 0) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            p.vy += 0.1; // Гравитация
            p.life -= delta;
            p.alpha = p.life / p.maxLife;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Текст комбо
        for (let i = this.comboTexts.length - 1; i >= 0; i--) {
            const text = this.comboTexts[i];
            text.y -= 1 * delta;
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
        
        const endPoint = this.getPathPoint(0.92);
        this.createExplosion(endPoint.x, endPoint.y, '#FF6B6B', 30);
        
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
            const wobbleX = Math.cos(ball.wobble) * 2;
            const wobbleY = Math.sin(ball.wobble) * 2;
            
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
            insertPosition = collision.ball.position + 0.01;
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
            wobbleSpeed: 0.05 + Math.random() * 0.05
        };
        
        this.chain.balls.splice(collision.index, 0, newBall);
        
        // Переиндексация
        this.chain.balls.forEach((ball, idx) => ball.index = idx);
        
        // Проверка совпадений
        const matches = this.checkMatches(collision.index);
        
        // Эффект попадания
        this.createExplosion(projectile.x, projectile.y, projectile.color, 20);
        this.createParticles(projectile.x, projectile.y, projectile.color, 10);
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
                this.createExplosion(point.x, point.y, ball.color, 25);
                this.createParticles(point.x, point.y, ball.color, 15);
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
                        this.createExplosion(point.x, point.y, ball.color, 30);
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
            radius: 5,
            color: color,
            alpha: 1,
            growth: size / 10
        });
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 3 + Math.random() * 4,
                life: 60 + Math.random() * 30,
                maxLife: 60 + Math.random() * 30
            });
        }
    }
    
    createComboText(x, y, text, score) {
        this.comboTexts.push({
            x, y,
            text: text,
            score: `+${score}`,
            life: 120,
            maxLife: 120,
            alpha: 1
        });
    }
    
    levelComplete() {
        this.score += 2000 * this.level;
        this.level++;
        this.chain.speed = 0.5 + (this.level * 0.05);
        
        // Эффект победы
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createExplosion(
                    Math.random() * this.width,
                    Math.random() * this.height,
                    this.colors[Math.floor(Math.random() * this.colors.length)],
                    30
                );
            }, i * 50);
        }
        
        // Анимация лягушки
        this.frog.state = 'celebrating';
        setTimeout(() => this.frog.state = 'idle', 1000);
        
        this.updateUI();
        
        // Новый уровень через 2 секунды
        setTimeout(() => {
            this.createChain();
            this.frog.nextBall = this.getRandomColor();
        }, 2000);
    }
    
    showGameOver() {
        // Рисуем поверх
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Рамка
        this.ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        this.ctx.fillRect(this.width/2 - 150, this.height/2 - 120, 300, 240);
        
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.font = 'bold 42px "Comic Sans MS", cursive';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('ИГРА ОКОНЧЕНА', this.width / 2, this.height / 2 - 60);
        
        this.ctx.fillStyle = '#FFEAA7';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`Счет: ${this.score}`, this.width / 2, this.height / 2);
        this.ctx.fillText(`Уровень: ${this.level}`, this.width / 2, this.height / 2 + 50);
        
        this.ctx.fillStyle = '#81C784';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Нажмите R для рестарта', this.width / 2, this.height / 2 + 110);
    }
    
    shoot() {
        if (!this.frog.nextBall || this.gameOver || this.isPaused) return;
        
        const angle = this.frog.angle * Math.PI / 180;
        const speed = 14;
        
        this.projectiles.push({
            x: this.frog.x + Math.cos(angle) * 40,
            y: this.frog.y + Math.sin(angle) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: this.frog.nextBall,
            radius: 18,
            life: 180,
            trail: []
        });
        
        // Анимация стрельбы
        this.frog.state = 'shooting';
        this.frog.nextBall = this.getRandomColor();
        this.updateUI();
    }
    
    draw() {
        // Градиентный фон
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#F8F3D6'); // Кремовый
        gradient.addColorStop(0.5, '#E9F5DB'); // Светло-зеленый
        gradient.addColorStop(1, '#D4EDDA'); // Мятный
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
    }
    
    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        // Облако 1
        this.ctx.beginPath();
        this.ctx.arc(100, 80, 30, 0, Math.PI * 2);
        this.ctx.arc(130, 70, 35, 0, Math.PI * 2);
        this.ctx.arc(160, 80, 30, 0, Math.PI * 2);
        this.ctx.arc(130, 90, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Облако 2
        this.ctx.beginPath();
        this.ctx.arc(this.width - 100, 120, 25, 0, Math.PI * 2);
        this.ctx.arc(this.width - 130, 110, 30, 0, Math.PI * 2);
        this.ctx.arc(this.width - 160, 120, 25, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawPath() {
        if (this.chain.path.length < 2) return;
        
        // Тень пути
        this.ctx.strokeStyle = 'rgba(139, 195, 74, 0.6)';
        this.ctx.lineWidth = 10;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();
        
        // Основной путь
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.lineWidth = 6;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();
        
        // Текстура пути (точки)
        this.ctx.fillStyle = 'rgba(189, 224, 254, 0.3)';
        for (let i = 0; i < this.chain.path.length; i += 5) {
            this.ctx.beginPath();
            this.ctx.arc(this.chain.path[i].x, this.chain.path[i].y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawFlower() {
        const endPoint = this.getPathPoint(0.92);
        
        // Стебель
        this.ctx.strokeStyle = '#81C784';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(endPoint.x, endPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y + 60);
        this.ctx.stroke();
        
        // Листья
        this.ctx.fillStyle = '#A5D6A7';
        this.ctx.beginPath();
        this.ctx.ellipse(endPoint.x - 20, endPoint.y + 30, 25, 10, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(endPoint.x + 20, endPoint.y + 40, 25, 10, -0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Цветок
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFF59D';
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 18, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Лепестки
        this.ctx.fillStyle = 'rgba(255, 152, 0, 0.7)';
        const petals = 8;
        for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2;
            const px = endPoint.x + Math.cos(angle) * 35;
            const py = endPoint.y + Math.sin(angle) * 35;
            
            this.ctx.beginPath();
            this.ctx.ellipse(px, py, 10, 5, angle, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Опасная зона
        this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 35, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawChain() {
        for (const ball of this.chain.balls) {
            const point = this.getPathPoint(ball.position);
            const wobbleX = Math.cos(ball.wobble) * 2;
            const wobbleY = Math.sin(ball.wobble) * 2;
            
            this.drawBall(point.x + wobbleX, point.y + wobbleY, ball.radius, ball.color);
        }
    }
    
    drawBall(x, y, radius, color) {
        // Тень
        this.ctx.beginPath();
        this.ctx.arc(x, y + 4, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fill();
        
        // Основной шар с градиентом
        const gradient = this.ctx.createRadialGradient(
            x - radius/3, y - radius/3, 1,
            x, y, radius
        );
        
        // Яркий центр
        const brightColor = this.lightenColor(color, 40);
        gradient.addColorStop(0, brightColor);
        gradient.addColorStop(0.6, color);
        gradient.addColorStop(1, this.darkenColor(color, 20));
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Яркий блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/3, y - radius/3, radius/3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fill();
        
        // Маленький блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/4, y - radius/4, radius/6, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
        
        // Контур
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1.5;
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
            (G > 0 ? G : 0) * 0x100 +
            (B > 0 ? B : 0)
        ).toString(16).slice(1);
    }
    
    drawProjectiles() {
        for (const p of this.projectiles) {
            // Трейл
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > 10) p.trail.shift();
            
            // Рисуем трейл
            for (let i = 0; i < p.trail.length; i++) {
                const point = p.trail[i];
                const alpha = i / p.trail.length * 0.5;
                
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, p.radius * (i / p.trail.length), 0, Math.PI * 2);
                this.ctx.fillStyle = this.hexToRgbA(p.color, alpha);
                this.ctx.fill();
            }
            
            // Сам шар
            this.drawBall(p.x, p.y, p.radius, p.color);
        }
    }
    
    hexToRgbA(hex, alpha) {
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return `rgba(${[(c>>16)&255, (c>>8)&255, c&255].join(',')},${alpha})`;
        }
        return `rgba(255,255,255,${alpha})`;
    }
    
    drawFrog() {
        // Лист кувшинки
        this.ctx.fillStyle = '#81C784';
        this.ctx.beginPath();
        this.ctx.ellipse(this.frog.x, this.frog.y + 20, 60, 30, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#A5D6A7';
        this.ctx.beginPath();
        this.ctx.ellipse(this.frog.x, this.frog.y + 20, 50, 25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Тело лягушки
        this.ctx.save();
        this.ctx.translate(this.frog.x, this.frog.y);
        this.ctx.rotate(this.frog.angle * Math.PI / 180);
        
        // Тело
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Голова
        this.ctx.beginPath();
        this.ctx.arc(25, 0, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Глаза
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(35, -10, 8, 0, Math.PI * 2);
        this.ctx.arc(35, 10, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Зрачки
        this.ctx.fillStyle = '#222';
        const eyeOffset = this.frog.state === 'aiming' ? 3 : 0;
        this.ctx.beginPath();
        this.ctx.arc(35 + eyeOffset, -10, 4, 0, Math.PI * 2);
        this.ctx.arc(35 + eyeOffset, 10, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Рот
        this.ctx.strokeStyle = '#388E3C';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        if (this.frog.mouthOpen) {
            // Открытый рот для выстрела
            this.ctx.arc(30, 0, 12, 0, Math.PI, false);
        } else {
            // Улыбка
            this.ctx.arc(30, 5, 10, 0, Math.PI, false);
        }
        this.ctx.stroke();
        
        // Ноздри
        this.ctx.fillStyle = '#388E3C';
        this.ctx.beginPath();
        this.ctx.arc(28, -3, 2, 0, Math.PI * 2);
        this.ctx.arc(28, 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
        
        // Лапки
        this.ctx.fillStyle = '#388E3C';
        this.ctx.beginPath();
        this.ctx.ellipse(this.frog.x - 25, this.frog.y + 10, 10, 5, 0.5, 0, Math.PI * 2);
        this.ctx.ellipse(this.frog.x + 25, this.frog.y + 10, 10, 5, -0.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawEffects() {
        // Взрывы
        for (const exp of this.explosions) {
            this.ctx.globalAlpha = exp.alpha;
            
            const gradient = this.ctx.createRadialGradient(
                exp.x, exp.y, 0,
                exp.x, exp.y, exp.radius
            );
            gradient.addColorStop(0, exp.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.beginPath();
            this.ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Конфетти
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 * i) / 5;
                const px = exp.x + Math.cos(angle) * exp.radius * 0.7;
                const py = exp.y + Math.sin(angle) * exp.radius * 0.7;
                
                this.ctx.fillStyle = exp.color;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;
        
        // Частицы
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
        
        // Текст комбо
        for (const text of this.comboTexts) {
            this.ctx.globalAlpha = text.alpha;
            
            // Фон текста
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(text.x - 70, text.y - 30, 140, 60);
            
            // Тень текста
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(text.text, text.x + 1, text.y - 6 + 1);
            
            // Основной текст
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(text.text, text.x, text.y - 6);
            
            // Счет
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(text.score, text.x, text.y + 20);
            
            this.ctx.globalAlpha = 1;
        }
    }
    
    drawNextBall() {
        if (!this.frog.nextBall) return;
        
        const angle = this.frog.angle * Math.PI / 180;
        const offset = 65;
        
        const x = this.frog.x + Math.cos(angle) * offset;
        const y = this.frog.y + Math.sin(angle) * offset;
        
        this.drawBall(x, y, 22, this.frog.nextBall);
        
        // Пульсирующая обводка
        const pulse = Math.sin(Date.now() / 200) * 2 + 3;
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = pulse;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawAim() {
        const angle = this.frog.angle * Math.PI / 180;
        const length = 180;
        
        // Линия прицела
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.frog.x, this.frog.y);
        this.ctx.lineTo(
            this.frog.x + Math.cos(angle) * length,
            this.frog.y + Math.sin(angle) * length
        );
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Конечная точка прицела
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(
            this.frog.x + Math.cos(angle) * length,
            this.frog.y + Math.sin(angle) * length,
            8, 0, Math.PI * 2
        );
        this.ctx.fill();
    }
    
    drawUI() {
        // Фон UI
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(20, 20, 250, 100);
        
        // Скругленные углы
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(20, 20, 250, 100);
        
        // Счет
        this.ctx.fillStyle = '#2D3436';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`🍯 ${this.score}`, 40, 60);
        
        // Уровень
        this.ctx.fillStyle = '#6C5CE7';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`🚀 Уровень ${this.level}`, 40, 95);
        
        // Жизни (цветочки)
        const startX = this.width - 200;
        for (let i = 0; i < this.lives; i++) {
            const x = startX + i * 35;
            
            // Цветочек жизни
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.beginPath();
            this.ctx.arc(x, 50, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Лепестки
            this.ctx.fillStyle = '#FFD166';
            for (let j = 0; j < 5; j++) {
                const angle = (j / 5) * Math.PI * 2;
                const px = x + Math.cos(angle) * 8;
                const py = 50 + Math.sin(angle) * 8;
                
                this.ctx.beginPath();
                this.ctx.arc(px, py, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Индикатор паузы
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⏸ ПАУЗА', this.width / 2, this.height / 2);
        }
    }
    
    setupControls() {
        // Мышь
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const dx = x - this.frog.x;
            const dy = y - this.frog.y;
            this.frog.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.frog.state = 'aiming';
            
            if (this.frog.angle > -30) this.frog.angle = -30;
            if (this.frog.angle < -150) this.frog.angle = -150;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            if (this.frog.state === 'aiming') this.frog.state = 'idle';
        });
        
        this.canvas.addEventListener('click', () => this.shoot());
        
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'KeyF') this.shoot();
            if (e.code === 'ArrowLeft') {
                this.frog.angle += 6;
                this.frog.state = 'aiming';
            }
            if (e.code === 'ArrowRight') {
                this.frog.angle -= 6;
                this.frog.state = 'aiming';
            }
            if (e.code === 'KeyP') {
                this.isPaused = !this.isPaused;
            }
            if (e.code === 'KeyR' && this.gameOver) {
                window.location.reload();
            }
            
            if (this.frog.angle > -30) this.frog.angle = -30;
            if (this.frog.angle < -150) this.frog.angle = -150;
        });
        
        // Сенсорное управление
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const dx = x - this.frog.x;
            const dy = y - this.frog.y;
            this.frog.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.frog.state = 'aiming';
            
            if (this.frog.angle > -30) this.frog.angle = -30;
            if (this.frog.angle < -150) this.frog.angle = -150;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
        
        this.canvas.addEventListener('touchend', () => {
            setTimeout(() => {
                if (this.frog.state === 'aiming') this.frog.state = 'idle';
            }, 100);
        });
        
        // Мобильные кнопки
        const rotateLeft = document.getElementById('rotateLeft');
        const rotateRight = document.getElementById('rotateRight');
        const shootBtn = document.getElementById('shootBtn');
        
        if (rotateLeft) {
            rotateLeft.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.frog.angle += 10;
                this.frog.state = 'aiming';
                if (this.frog.angle > -30) this.frog.angle = -30;
            });
        }
        
        if (rotateRight) {
            rotateRight.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.frog.angle -= 10;
                this.frog.state = 'aiming';
                if (this.frog.angle < -150) this.frog.angle = -150;
            });
        }
        
        if (shootBtn) {
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.shoot();
            });
        }
    }
    
    updateUI() {
        // UI рисуется в drawUI(), но можно обновить DOM если нужно
        if (window.sendScoreToTelegram) {
            window.sendScoreToTelegram(this.score);
        }
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.ZumaGame = ZumaGame;
}

console.log('Zuma Game Engine loaded successfully!');

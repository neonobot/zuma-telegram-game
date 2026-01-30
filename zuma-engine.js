class ZumaGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Основные параметры игры
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.isPaused = false;
        this.gameOver = false;
        
        // Пушка
        this.cannon = {
            x: this.width / 2,
            y: this.height - 100,
            angle: -90, // Направление в градусах (0 = вправо, 90 = вниз)
            rotationSpeed: 3,
            nextBall: null,
            power: 10
        };
        
        // Цепочка шаров
        this.chain = {
            path: [], // Точки пути
            balls: [], // Шары на пути
            speed: 1.5,
            progress: 0, // Прогресс движения по пути
            headIndex: 0 // Индекс головы цепочки
        };
        
        // Летящие шары
        this.projectiles = [];
        
        // Цвета шаров
        this.colors = [
            '#FF416C', // Красный
            '#4A90E2', // Синий
            '#44D62C', // Зеленый
            '#FFD700', // Желтый
            '#9B30FF', // Фиолетовый
            '#FF6B35'  // Оранжевый
        ];
        
        // Взрывы
        this.explosions = [];
        
        // Анимация
        this.lastTime = 0;
        this.animationId = null;
        
        // Привязка методов
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        
        // Инициализация элементов управления
        this.initControls();
    }
    
    init() {
        this.generatePath();
        this.initChain();
        this.generateNextBall();
        this.startGameLoop();
        this.setupEventListeners();
        this.updateUI();
    }
    
    // Генерация пути для цепочки
    generatePath() {
        this.chain.path = [];
        const points = 100;
        
        // Создаем спиралевидный путь
        for (let i = 0; i <= points; i++) {
            const t = i / points * Math.PI * 3;
            const radius = 200 + Math.sin(t * 2) * 100;
            const x = this.width / 2 + Math.cos(t) * radius;
            const y = 200 + Math.sin(t) * 100 + t * 30;
            this.chain.path.push({x, y});
        }
    }
    
    // Инициализация цепочки шаров
    initChain() {
        this.chain.balls = [];
        const initialBalls = 15 + this.level * 2;
        
        for (let i = 0; i < initialBalls; i++) {
            const color = this.getRandomColor();
            this.chain.balls.push({
                color,
                position: i * 0.02, // Позиция на пути (0-1)
                radius: 15,
                index: i
            });
        }
        
        this.chain.headIndex = 0;
        this.chain.progress = 0;
        this.chain.speed = 1.5 + this.level * 0.1;
    }
    
    // Генерация следующего шара для пушки
    generateNextBall() {
        this.cannon.nextBall = this.getRandomColor();
    }
    
    // Получение случайного цвета
    getRandomColor() {
        return this.colors[Math.floor(Math.random() * 
this.colors.length)];
    }
    
    // Запуск игрового цикла
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.isPaused && !this.gameOver) {
                const deltaTime = timestamp - this.lastTime;
                this.lastTime = timestamp;
                
                this.update(deltaTime);
                this.draw();
            }
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }
    
    // Обновление игрового состояния
    update(deltaTime) {
        if (!deltaTime) deltaTime = 16.67; // ~60 FPS
        
        // Движение цепочки
        this.updateChain(deltaTime);
        
        // Движение снарядов
        this.updateProjectiles(deltaTime);
        
        // Обновление взрывов
        this.updateExplosions(deltaTime);
        
        // Проверка на проигрыш
        this.checkGameOver();
    }
    
    updateChain(deltaTime) {
        // Увеличиваем прогресс движения
        this.chain.progress += (this.chain.speed / 1000) * deltaTime;
        
        // Обновляем позиции шаров
        for (const ball of this.chain.balls) {
            ball.position += (this.chain.speed / 50000) * deltaTime;
            
            // Если шар достиг конца пути
            if (ball.position >= 1) {
                this.lives--;
                this.updateUI();
                this.chain.balls = this.chain.balls.filter(b => b !== 
ball);
                
                // Эффект потери жизни
                this.createExplosion(this.getPathPoint(1).x, 
this.getPathPoint(1).y, '#FF0000');
                
                if (this.lives <= 0) {
                    this.gameOver = true;
                    this.showGameOver();
                }
            }
        }
        
        // Сортировка шаров по позиции
        this.chain.balls.sort((a, b) => a.position - b.position);
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Движение снаряда
            projectile.x += Math.cos(projectile.angle) * projectile.speed 
* deltaTime / 16.67;
            projectile.y += Math.sin(projectile.angle) * projectile.speed 
* deltaTime / 16.67;
            
            // Проверка столкновения с цепочкой
            const collision = this.checkProjectileCollision(projectile);
            if (collision) {
                this.handleProjectileCollision(projectile, collision);
                this.projectiles.splice(i, 1);
            }
            
            // Проверка выхода за границы
            else if (projectile.x < 0 || projectile.x > this.width || 
                     projectile.y < 0 || projectile.y > this.height) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.radius += explosion.growth * deltaTime / 16.67;
            explosion.alpha -= 0.02 * deltaTime / 16.67;
            
            if (explosion.alpha <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    // Проверка столкновения снаряда с цепочкой
    checkProjectileCollision(projectile) {
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            const point = this.getPathPoint(ball.position);
            
            const dx = point.x - projectile.x;
            const dy = point.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + projectile.radius) {
                return { ball, index: i, point };
            }
        }
        return null;
    }
    
    // Обработка столкновения снаряда с цепочкой
    handleProjectileCollision(projectile, collision) {
        // Вставляем шар в цепочку
        const newBall = {
            color: projectile.color,
            position: collision.ball.position,
            radius: 15,
            index: collision.index
        };
        
        this.chain.balls.splice(collision.index, 0, newBall);
        
        // Проверяем совпадения
        this.checkMatches(collision.index);
        
        // Создаем эффект взрыва
        this.createExplosion(projectile.x, projectile.y, 
projectile.color);
    }
    
    // Проверка совпадений 3+ одинаковых шаров
    checkMatches(insertedIndex) {
        const matches = this.findMatches(insertedIndex);
        
        if (matches.length >= 3) {
            // Удаляем совпавшие шары
            for (const index of matches) {
                const ball = this.chain.balls[index];
                this.createExplosion(
                    this.getPathPoint(ball.position).x,
                    this.getPathPoint(ball.position).y,
                    ball.color
                );
            }
            
            // Удаляем шары из цепочки (в обратном порядке)
            matches.sort((a, b) => b - a).forEach(index => {
                this.chain.balls.splice(index, 1);
            });
            
            // Начисляем очки
            this.score += matches.length * 100 * this.level;
            this.updateUI();
            
            // Проверяем цепные реакции
            if (matches.length > 3) {
                this.checkChainReactions();
            }
            
            // Проверяем завершение уровня
            if (this.chain.balls.length === 0) {
                this.levelComplete();
            }
        }
    }
    
    // Поиск совпадающих шаров
    findMatches(startIndex) {
        const matches = [startIndex];
        const color = this.chain.balls[startIndex].color;
        
        // Проверка влево
        for (let i = startIndex - 1; i >= 0; i--) {
            if (this.chain.balls[i].color === color) {
                matches.push(i);
            } else {
                break;
            }
        }
        
        // Проверка вправо
        for (let i = startIndex + 1; i < this.chain.balls.length; i++) {
            if (this.chain.balls[i].color === color) {
                matches.push(i);
            } else {
                break;
            }
        }
        
        return matches;
    }
    
    // Проверка цепных реакций
    checkChainReactions() {
        let hadReaction = false;
        
        do {
            hadReaction = false;
            for (let i = 0; i < this.chain.balls.length; i++) {
                const matches = this.findMatches(i);
                if (matches.length >= 3) {
                    matches.sort((a, b) => b - a).forEach(index => {
                        this.chain.balls.splice(index, 1);
                    });
                    this.score += matches.length * 150 * this.level;
                    hadReaction = true;
                    break;
                }
            }
        } while (hadReaction);
        
        this.updateUI();
    }
    
    // Завершение уровня
    levelComplete() {
        this.score += 1000 * this.level;
        this.level++;
        this.updateUI();
        
        // Создаем эффект завершения уровня
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createExplosion(
                    Math.random() * this.width,
                    Math.random() * this.height,
                    this.colors[Math.floor(Math.random() * 
this.colors.length)]
                );
            }, i * 50);
        }
        
        // Переход к следующему уровню
        setTimeout(() => {
            this.initChain();
            this.generateNextBall();
        }, 2000);
    }
    
    // Создание эффекта взрыва
    createExplosion(x, y, color) {
        this.explosions.push({
            x, y,
            radius: 10,
            color,
            alpha: 1,
            growth: 2
        });
    }
    
    // Получение точки на пути
    getPathPoint(t) {
        t = Math.max(0, Math.min(1, t));
        const path = this.chain.path;
        const index = t * (path.length - 1);
        const i1 = Math.floor(index);
        const i2 = Math.min(i1 + 1, path.length - 1);
        const frac = index - i1;
        
        return {
            x: path[i1].x + (path[i2].x - path[i1].x) * frac,
            y: path[i1].y + (path[i2].y - path[i1].y) * frac
        };
    }
    
    // Выстрел из пушки
    shoot() {
        if (!this.cannon.nextBall || this.gameOver || this.isPaused) 
return;
        
        const angle = this.cannon.angle * Math.PI / 180;
        const projectile = {
            x: this.cannon.x,
            y: this.cannon.y,
            angle: angle,
            color: this.cannon.nextBall,
            radius: 15,
            speed: 10
        };
        
        this.projectiles.push(projectile);
        this.generateNextBall();
        
        // Звуковой эффект (если есть)
        this.playSound('shoot');
    }
    
    // Вращение пушки
    rotateCannon(direction) {
        if (this.gameOver || this.isPaused) return;
        
        this.cannon.angle += this.cannon.rotationSpeed * direction;
        
        // Ограничиваем угол вращения
        if (this.cannon.angle > -30) this.cannon.angle = -30;
        if (this.cannon.angle < -150) this.cannon.angle = -150;
    }
    
    // Проверка на проигрыш
    checkGameOver() {
        if (this.lives <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    
    // Отрисовка игры
    draw() {
        // Очистка холста
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Отрисовка фона
        this.drawBackground();
        
        // Отрисовка пути
        this.drawPath();
        
        // Отрисовка цепочки шаров
        this.drawChain();
        
        // Отрисовка снарядов
        this.drawProjectiles();
        
        // Отрисовка пушки
        this.drawCannon();
        
        // Отрисовка следующего шара
        this.drawNextBall();
        
        // Отрисовка взрывов
        this.drawExplosions();
        
        // Отрисовка прицела
        this.drawAim();
        
        // Отрисовка UI поверх всего
        if (this.gameOver) {
            this.drawGameOver();
        }
        
        if (this.isPaused) {
            this.drawPauseScreen();
        }
    }
    
    drawBackground() {
        // Градиентный фон
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, 
this.height);
        gradient.addColorStop(0, '#0f3460');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Декоративные элементы
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const radius = Math.random() * 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawPath() {
        if (this.chain.path.length < 2) return;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        
        this.ctx.stroke();
        
        // Тень под путем
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y + 2);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y + 
2);
        }
        this.ctx.stroke();
    }
    
    drawChain() {
        for (const ball of this.chain.balls) {
            const point = this.getPathPoint(ball.position);
            this.drawBall(point.x, point.y, ball.radius, ball.color);
        }
    }
    
    drawProjectiles() {
        for (const projectile of this.projectiles) {
            this.drawBall(projectile.x, projectile.y, projectile.radius, 
projectile.color);
        }
    }
    
    drawCannon() {
        const angle = this.cannon.angle * Math.PI / 180;
        const barrelLength = 60;
        
        // Основание пушки
        this.ctx.fillStyle = '#666';
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x, this.cannon.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Ствол пушки
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        this.ctx.rotate(angle);
        
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, -10, barrelLength, 20);
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barrelLength - 5, -8, 10, 16);
        
        this.ctx.restore();
        
        // Детали пушки
        this.ctx.fillStyle = '#555';
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x, this.cannon.y, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawNextBall() {
        if (!this.cannon.nextBall) return;
        
        // Показываем следующий шар рядом с пушкой
        const angle = this.cannon.angle * Math.PI / 180;
        const offsetX = Math.cos(angle) * 80;
        const offsetY = Math.sin(angle) * 80;
        
        this.drawBall(
            this.cannon.x + offsetX,
            this.cannon.y + offsetY,
            20,
            this.cannon.nextBall
        );
        
        // Обводка для выделения
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(
            this.cannon.x + offsetX,
            this.cannon.y + offsetY,
            22, 0, Math.PI * 2
        );
        this.ctx.stroke();
    }
    
    drawBall(x, y, radius, color) {
        // Тень
        this.ctx.beginPath();
        this.ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();
        
        // Основной шар
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Градиент для объема
        const gradient = this.ctx.createRadialGradient(
            x - radius/3, y - radius/3, 1,
            x, y, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/3, y - radius/3, radius/3, 0, Math.PI * 
2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fill();
    }
    
    drawExplosions() {
        for (const explosion of this.explosions) {
            this.ctx.globalAlpha = explosion.alpha;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, 
Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, explosion.radius
            );
            gradient.addColorStop(0, explosion.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawAim() {
        const angle = this.cannon.angle * Math.PI / 180;
        const length = 200;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.cannon.x, this.cannon.y);
        this.ctx.lineTo(
            this.cannon.x + Math.cos(angle) * length,
            this.cannon.y + Math.sin(angle) * length
        );
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    drawPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ПАУЗА', this.width / 2, this.height / 2);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Нажмите P для продолжения', this.width / 2, 
this.height / 2 + 50);
    }
    
    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#FF416C';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ИГРА ОКОНЧЕНА', this.width / 2, this.height / 2 
- 50);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '36px Arial';
        this.ctx.fillText(`Счет: ${this.score}`, this.width / 2, 
this.height / 2 + 30);
        this.ctx.fillText(`Уровень: ${this.level}`, this.width / 2, 
this.height / 2 + 80);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Нажмите R для рестарта', this.width / 2, 
this.height / 2 + 140);
    }
    
    // Инициализация элементов управления
    initControls() {
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'arrowleft':
                case 'a':
                    this.rotateCannon(1);
                    break;
                case 'arrowright':
                case 'd':
                    this.rotateCannon(-1);
                    break;
                case ' ':
                case 'enter':
                    this.shoot();
                    break;
                case 'p':
                    this.togglePause();
                    break;
                case 'r':
                    this.restart();
                    break;
            }
        });
        
        // Кнопки паузы и рестарта
        document.getElementById('pauseBtn').addEventListener('click', () 
=> this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () 
=> this.restart());
        
        // Мобильные кнопки
        document.getElementById('rotateLeft').addEventListener('click', () 
=> this.rotateCannon(1));
        document.getElementById('rotateRight').addEventListener('click', 
() => this.rotateCannon(-1));
        document.getElementById('shootBtn').addEventListener('click', () 
=> this.shoot());
    }
    
    setupEventListeners() {
        // Мышь
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.handleClick);
        
        // Сенсорное управление
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.aimAt(x, y);
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.aimAt(x, y);
    }
    
    handleClick(e) {
        if (this.isPaused || this.gameOver) return;
        this.shoot();
    }
    
    aimAt(x, y) {
        if (this.gameOver || this.isPaused) return;
        
        const dx = x - this.cannon.x;
        const dy = y - this.cannon.y;
        this.cannon.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Ограничиваем угол
        if (this.cannon.angle > -30) this.cannon.angle = -30;
        if (this.cannon.angle < -150) this.cannon.angle = -150;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById('pauseBtn').textContent = 
'Продолжить';
        } else {
            document.getElementById('pauseBtn').textContent = 'Пауза';
        }
    }
    
    restart() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameOver = false;
        this.isPaused = false;
        
        this.projectiles = [];
        this.explosions = [];
        
        this.initChain();
        this.generateNextBall();
        this.updateUI();
        
        document.getElementById('pauseBtn').textContent = 'Пауза';
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        
        // Отправка данных в Telegram (если подключено)
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.score);
        }
    }
    
    showGameOver() {
        // Можно добавить дополнительные эффекты
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createExplosion(
                    this.width / 2 + Math.random() * 200 - 100,
                    this.height / 2 + Math.random() * 200 - 100,
                    '#FF0000'
                );
            }, i * 100);
        }
    }
    
    playSound(type) {
        // Простая реализация звуков через Web Audio API
        try {
            const audioContext = new (window.AudioContext || 
window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch(type) {
                case 'shoot':
                    oscillator.frequency.setValueAtTime(800, 
audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, 
audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, 
audioContext.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                    
                case 'explosion':
                    oscillator.frequency.setValueAtTime(200, 
audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, 
audioContext.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.2, 
audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, 
audioContext.currentTime + 0.3);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
            }
        } catch (e) {
            console.log('Audio not supported');
        }
    }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZumaGame;
}

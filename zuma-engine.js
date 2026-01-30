// zuma-engine.js - Исправленная версия с правильной механикой
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
        
        // Цвета
        this.colors = ['#FF416C', '#4A90E2', '#44D62C', '#FFD700', '#9B30FF'];
        
        // Игровые переменные
        this.score = 0;
        this.level = 1;
        this.lives = 5; // Увеличим жизни для тестирования
        this.isPaused = false;
        this.gameOver = false;
        
        // Пушка
        this.cannon = {
            x: this.width / 2,
            y: this.height - 100,
            angle: -90,
            nextBall: this.getRandomColor()
        };
        
        // Цепочка шаров - теперь с ПУТЕМ
        this.chain = {
            balls: [],
            path: this.generatePath(), // Генерируем путь
            speed: 1.0 + (this.level * 0.1),
            headPosition: 0 // Позиция головы на пути
        };
        
        // Летящие шары
        this.projectiles = [];
        
        // Взрывы
        this.explosions = [];
        
        console.log('Game initialized');
    }
    
    // Генерация спиралевидного пути (как в настоящей Zuma)
    generatePath() {
        const path = [];
        const segments = 200;
        const centerX = this.width / 2;
        const centerY = this.height / 2 - 100;
        
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 3; // 1.5 оборота
            const radius = 150 + Math.sin(t * 1.5) * 50;
            
            const x = centerX + Math.cos(t) * radius;
            const y = centerY + Math.sin(t) * radius + t * 20;
            
            path.push({x, y});
        }
        
        return path;
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
        const ballCount = 15 + this.level * 2;
        
        // Создаем шары равномерно распределенными по пути
        for (let i = 0; i < ballCount; i++) {
            const position = i * 0.03; // Начинаем с позиции 0
            const point = this.getPathPoint(position);
            
            this.chain.balls.push({
                position: position, // Позиция на пути (0-1)
                color: this.getRandomColor(),
                radius: 15,
                index: i
            });
        }
        
        // Сортируем по позиции
        this.chain.balls.sort((a, b) => a.position - b.position);
        this.chain.headPosition = this.chain.balls[0]?.position || 0;
    }
    
    startGameLoop() {
        const gameLoop = () => {
            if (!this.isPaused && !this.gameOver) {
                this.update();
                this.draw();
            }
            requestAnimationFrame(gameLoop.bind(this));
        };
        gameLoop();
    }
    
    update() {
        // Движение цепочки ВПЕРЕД
        this.chain.headPosition += this.chain.speed / 1000;
        
        // Обновляем позиции всех шаров
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            
            // Если это первый шар, он двигается с головой
            if (i === 0) {
                ball.position = this.chain.headPosition;
            } else {
                // Остальные шары стремятся занять позицию через фиксированное расстояние
                const targetPos = this.chain.balls[i-1].position - 0.02;
                if (ball.position < targetPos) {
                    ball.position += this.chain.speed / 2000;
                }
            }
            
            // Проверка на достижение конца пути
            if (ball.position >= 0.95) { // 95% пути
                this.loseLife();
                // Удаляем этот шар
                this.chain.balls.splice(i, 1);
                i--;
            }
        }
        
        // Движение снарядов
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            
            // Проверка столкновений
            const collision = this.checkCollision(p);
            if (collision) {
                this.handleCollision(p, collision);
                this.projectiles.splice(i, 1);
            }
            
            // Удаление за пределами
            if (p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Обновление взрывов
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.radius += exp.growth;
            exp.alpha -= 0.02;
            
            if (exp.alpha <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    loseLife() {
        this.lives--;
        this.updateUI();
        
        // Эффект потери жизни
        const endPoint = this.getPathPoint(0.95);
        this.createExplosion(endPoint.x, endPoint.y, '#FF0000');
        
        if (this.lives <= 0) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    
    checkCollision(projectile) {
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
    
    handleCollision(projectile, collision) {
        // Находим точку вставки - между шарами
        let insertPosition;
        
        if (collision.index === 0) {
            // Если столкнулись с первым шаром
            insertPosition = collision.ball.position + 0.01;
        } else {
            // Вставляем между текущим и предыдущим
            const prevBall = this.chain.balls[collision.index - 1];
            insertPosition = (prevBall.position + collision.ball.position) / 2;
        }
        
        // Вставляем новый шар
        const newBall = {
            position: insertPosition,
            color: projectile.color,
            radius: 15,
            index: collision.index
        };
        
        this.chain.balls.splice(collision.index, 0, newBall);
        
        // Переиндексируем
        this.chain.balls.forEach((ball, idx) => {
            ball.index = idx;
        });
        
        // Проверка совпадений
        this.checkMatches(collision.index);
        
        // Эффект попадания
        this.createExplosion(projectile.x, projectile.y, projectile.color);
    }
    
    checkMatches(insertedIndex) {
        const color = this.chain.balls[insertedIndex].color;
        const matches = [insertedIndex];
        
        // Проверка влево
        for (let i = insertedIndex - 1; i >= 0; i--) {
            if (this.chain.balls[i].color === color) {
                matches.push(i);
            } else {
                break;
            }
        }
        
        // Проверка вправо
        for (let i = insertedIndex + 1; i < this.chain.balls.length; i++) {
            if (this.chain.balls[i].color === color) {
                matches.push(i);
            } else {
                break;
            }
        }
        
        // Если 3+ совпадений
        if (matches.length >= 3) {
            // Сортируем по убыванию для правильного удаления
            matches.sort((a, b) => b - a);
            
            // Удаляем совпавшие шары
            for (const index of matches) {
                const ball = this.chain.balls[index];
                const point = this.getPathPoint(ball.position);
                this.createExplosion(point.x, point.y, ball.color);
                this.chain.balls.splice(index, 1);
            }
            
            // Очки
            this.score += matches.length * 100 * this.level;
            this.updateUI();
            
            // Проверка цепной реакции
            this.checkChainReactions();
            
            // Проверка победы на уровне
            if (this.chain.balls.length === 0) {
                this.levelComplete();
            }
        }
    }
    
    checkChainReactions() {
        let hadReaction = false;
        
        do {
            hadReaction = false;
            for (let i = 0; i < this.chain.balls.length; i++) {
                const color = this.chain.balls[i].color;
                let matches = [i];
                
                // Проверяем соседей
                for (let j = i - 1; j >= 0 && this.chain.balls[j].color === color; j--) {
                    matches.push(j);
                }
                for (let j = i + 1; j < this.chain.balls.length && this.chain.balls[j].color === color; j++) {
                    matches.push(j);
                }
                
                if (matches.length >= 3) {
                    matches.sort((a, b) => b - a);
                    for (const index of matches) {
                        const ball = this.chain.balls[index];
                        const point = this.getPathPoint(ball.position);
                        this.createExplosion(point.x, point.y, ball.color);
                    }
                    
                    matches.forEach(index => this.chain.balls.splice(index, 1));
                    this.score += matches.length * 150 * this.level;
                    hadReaction = true;
                    break;
                }
            }
        } while (hadReaction);
        
        this.updateUI();
    }
    
    createExplosion(x, y, color) {
        this.explosions.push({
            x, y,
            radius: 5,
            color: color,
            alpha: 1,
            growth: 2
        });
    }
    
    levelComplete() {
        this.score += 1000 * this.level;
        this.level++;
        this.chain.speed = 1.0 + (this.level * 0.1);
        this.updateUI();
        
        // Эффект победы
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createExplosion(
                    Math.random() * this.width,
                    Math.random() * this.height,
                    this.colors[Math.floor(Math.random() * this.colors.length)]
                );
            }, i * 100);
        }
        
        // Перезапуск уровня
        setTimeout(() => {
            this.createChain();
            this.cannon.nextBall = this.getRandomColor();
        }, 1500);
    }
    
    showGameOver() {
        // Рисуем поверх всего
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#FF416C';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ИГРА ОКОНЧЕНА', this.width / 2, this.height / 2 - 50);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '36px Arial';
        this.ctx.fillText(`Счет: ${this.score}`, this.width / 2, this.height / 2 + 20);
        this.ctx.fillText(`Уровень: ${this.level}`, this.width / 2, this.height / 2 + 70);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Обновите страницу для рестарта', this.width / 2, this.height / 2 + 120);
    }
    
    shoot() {
        if (!this.cannon.nextBall || this.gameOver || this.isPaused) return;
        
        const angle = this.cannon.angle * Math.PI / 180;
        const speed = 12;
        
        this.projectiles.push({
            x: this.cannon.x,
            y: this.cannon.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: this.cannon.nextBall,
            radius: 15
        });
        
        this.cannon.nextBall = this.getRandomColor();
        this.updateUI();
    }
    
    draw() {
        // Фон
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#0f3460');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Рисуем путь
        this.drawPath();
        
        // Цепочка шаров
        for (const ball of this.chain.balls) {
            const point = this.getPathPoint(ball.position);
            this.drawBall(point.x, point.y, ball.radius, ball.color);
        }
        
        // Снаряды
        for (const p of this.projectiles) {
            this.drawBall(p.x, p.y, p.radius, p.color);
        }
        
        // Взрывы
        for (const exp of this.explosions) {
            this.ctx.globalAlpha = exp.alpha;
            this.ctx.beginPath();
            this.ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            
            const gradient = this.ctx.createRadialGradient(
                exp.x, exp.y, 0,
                exp.x, exp.y, exp.radius
            );
            gradient.addColorStop(0, exp.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
        
        // Пушка
        this.drawCannon();
        
        // Следующий шар
        this.drawNextBall();
        
        // Прицел
        this.drawAim();
    }
    
    drawPath() {
        if (this.chain.path.length < 2) return;
        
        // Тень пути
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 8;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y + 2);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y + 2);
        }
        this.ctx.stroke();
        
        // Сам путь
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 4;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.chain.path[0].x, this.chain.path[0].y);
        for (let i = 1; i < this.chain.path.length; i++) {
            this.ctx.lineTo(this.chain.path[i].x, this.chain.path[i].y);
        }
        this.ctx.stroke();
        
        // Конец пути (опасная зона)
        const endPoint = this.getPathPoint(0.95);
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(endPoint.x, endPoint.y, 20, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawBall(x, y, radius, color) {
        // Тень
        this.ctx.beginPath();
        this.ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fill();
        
        // Основной шар
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        // Градиент для объема
        const gradient = this.ctx.createRadialGradient(
            x - radius/3, y - radius/3, 1,
            x, y, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/3, y - radius/3, radius/3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fill();
        
        // Контур
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawCannon() {
        const angle = this.cannon.angle * Math.PI / 180;
        const barrelLength = 60;
        
        // Основание
        this.ctx.fillStyle = '#666';
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x, this.cannon.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Ствол
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        this.ctx.rotate(angle);
        
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(0, -10, barrelLength, 20);
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barrelLength - 5, -8, 10, 16);
        
        this.ctx.restore();
        
        // Детали
        this.ctx.fillStyle = '#555';
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x, this.cannon.y, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawNextBall() {
        if (!this.cannon.nextBall) return;
        
        const angle = this.cannon.angle * Math.PI / 180;
        const offset = 80;
        
        this.drawBall(
            this.cannon.x + Math.cos(angle) * offset,
            this.cannon.y + Math.sin(angle) * offset,
            20,
            this.cannon.nextBall
        );
        
        // Выделение
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(
            this.cannon.x + Math.cos(angle) * offset,
            this.cannon.y + Math.sin(angle) * offset,
            22, 0, Math.PI * 2
        );
        this.ctx.stroke();
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
    
    setupControls() {
        // Мышь
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const dx = x - this.cannon.x;
            const dy = y - this.cannon.y;
            this.cannon.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Ограничиваем угол
            if (this.cannon.angle > -30) this.cannon.angle = -30;
            if (this.cannon.angle < -150) this.cannon.angle = -150;
        });
        
        this.canvas.addEventListener('click', () => this.shoot());
        
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.shoot();
            if (e.code === 'ArrowLeft') this.cannon.angle += 5;
            if (e.code === 'ArrowRight') this.cannon.angle -= 5;
            if (e.code === 'KeyP') {
                this.isPaused = !this.isPaused;
                document.getElementById('ui').innerHTML = 
                    this.isPaused ? '⏸ ПАУЗА' : `🎯 Очки: ${this.score} | 🚀 Уровень: ${this.level} | ❤️ Жизни: ${this.lives}`;
            }
            if (e.code === 'KeyR' && this.gameOver) {
                window.location.reload();
            }
            
            // Ограничиваем угол
            if (this.cannon.angle > -30) this.cannon.angle = -30;
            if (this.cannon.angle < -150) this.cannon.angle = -150;
        });
        
        // Сенсорное управление
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const dx = x - this.cannon.x;
            const dy = y - this.cannon.y;
            this.cannon.angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Ограничиваем угол
            if (this.cannon.angle > -30) this.cannon.angle = -30;
            if (this.cannon.angle < -150) this.cannon.angle = -150;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
        
        // Мобильные кнопки
        const rotateLeft = document.getElementById('rotateLeft');
        const rotateRight = document.getElementById('rotateRight');
        const shootBtn = document.getElementById('shootBtn');
        
        if (rotateLeft) {
            rotateLeft.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.cannon.angle += 10;
                if (this.cannon.angle > -30) this.cannon.angle = -30;
            });
        }
        
        if (rotateRight) {
            rotateRight.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.cannon.angle -= 10;
                if (this.cannon.angle < -150) this.cannon.angle = -150;
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
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        
        // Отправка в Telegram
        if (window.sendScoreToTelegram) {
            window.sendScoreToTelegram(this.score);
        }
    }
}

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.ZumaGame = ZumaGame;
}

console.log('Zuma Game Engine loaded successfully!');

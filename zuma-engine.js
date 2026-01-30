// game.js - Полноценный движок Zuma
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
        this.lives = 3;
        this.isPaused = false;
        this.gameOver = false;
        
        // Пушка
        this.cannon = {
            x: this.width / 2,
            y: this.height - 100,
            angle: -90,
            nextBall: this.getRandomColor()
        };
        
        // Цепочка шаров
        this.chain = {
            balls: [],
            speed: 1.5
        };
        
        // Летящие шары
        this.projectiles = [];
        
        
        console.log('Game initialized');
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
        const ballCount = 10 + this.level * 2;
        
        for (let i = 0; i < ballCount; i++) {
            this.chain.balls.push({
                x: 100 + i * 40,
                y: 100,
                color: this.getRandomColor(),
                radius: 15
            });
        }
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
        // Движение цепочки
        for (const ball of this.chain.balls) {
            ball.x += this.chain.speed;
            if (ball.x > this.width - 100) {
                ball.x = 100;
                ball.y += 40;
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
    }
    
    checkCollision(projectile) {
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            const dx = ball.x - projectile.x;
            const dy = ball.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ball.radius + projectile.radius) {
                return { ball, index: i };
            }
        }
        return null;
    }
    
    handleCollision(projectile, collision) {
        // Вставка шара в цепочку
        const newBall = {
            x: collision.ball.x,
            y: collision.ball.y,
            color: projectile.color,
            radius: 15
        };
        
        this.chain.balls.splice(collision.index, 0, newBall);
        
        // Проверка совпадений
        this.checkMatches(collision.index);
    }
    
    checkMatches(index) {
        const color = this.chain.balls[index].color;
        const matches = [index];
        
        // Проверка влево
        for (let i = index - 1; i >= 0; i--) {
            if (this.chain.balls[i].color === color) {
                matches.push(i);
            } else break;
        }
        
        // Проверка вправо
        for (let i = index + 1; i < this.chain.balls.length; i++) {
            if (this.chain.balls[i].color === color) {
                matches.push(i);
            } else break;
        }
        
        // Если 3+ совпадений
        if (matches.length >= 3) {
            // Удаление
            matches.sort((a, b) => b - a).forEach(i => {
                this.chain.balls.splice(i, 1);
            });
            
            // Очки
            this.score += matches.length * 100;
            this.updateUI();
            
            // Проверка победы
            if (this.chain.balls.length === 0) {
                this.levelComplete();
            }
        }
    }
    
    levelComplete() {
        this.score += 1000;
        this.level++;
        this.updateUI();
        this.createChain();
        this.cannon.nextBall = this.getRandomColor();
    }
    
    shoot() {
        if (!this.cannon.nextBall || this.gameOver) return;
        
        const angle = this.cannon.angle * Math.PI / 180;
        const speed = 10;
        
        this.projectiles.push({
            x: this.cannon.x,
            y: this.cannon.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: this.cannon.nextBall,
            radius: 15
        });
        
        this.cannon.nextBall = this.getRandomColor();
    }
    
    draw() {
        // Фон
        this.ctx.fillStyle = '#0f3460';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Цепочка
        for (const ball of this.chain.balls) {
            this.drawBall(ball.x, ball.y, ball.radius, ball.color);
        }
        
        // Снаряды
        for (const p of this.projectiles) {
            this.drawBall(p.x, p.y, p.radius, p.color);
        }
        
        // Пушка
        this.drawCannon();
        
        // Следующий шар
        this.drawNextBall();
    }
    
    drawBall(x, y, radius, color) {
        // Тень
        this.ctx.beginPath();
        this.ctx.arc(x, y + 2, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fill();
        
        // Шар
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Блик
        this.ctx.beginPath();
        this.ctx.arc(x - radius/3, y - radius/3, radius/3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fill();
    }
    
    drawCannon() {
        const angle = this.cannon.angle * Math.PI / 180;
        const length = 60;
        
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
        this.ctx.fillRect(0, -10, length, 20);
        
        this.ctx.restore();
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
        });
        
        this.canvas.addEventListener('click', () => this.shoot());
        
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.shoot();
            if (e.code === 'ArrowLeft') this.cannon.angle += 5;
            if (e.code === 'ArrowRight') this.cannon.angle -= 5;
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
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
    }
}

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.ZumaGame = ZumaGame;
}

console.log('Zuma Game Engine loaded successfully!');

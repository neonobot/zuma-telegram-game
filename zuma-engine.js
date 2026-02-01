// =========================
// zuma-engine.js
// =========================

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
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error('Canvas not found!');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.state = GAME_STATE.MENU;
        this.colors = ['#FFD1DC', '#B5EAD7', '#E6E6FA', '#FFDAB9', '#FFF8E1', '#B3E0FF'];
        this.resetGame();
        window.addEventListener('resize', () => this.resize());
        console.log('Game initialized');
    }

    resetGame() {
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

        this.frog = {
            x: this.width / 2,
            y: this.height / 2,
            angle: -90,
            nextBall: this.getRandomColor(),
            state: 'idle',
            blinkTimer: 0,
            mouthOpen: false,
            smile: 0
        };

        this.whirlpool = {
            x: this.width / 2,
            y: this.height / 2,
            radius: 42,
            angle: 0
        };

        this.chain = {
            balls: [],
            path: this.generateRoundSpiralPath(),
            speed: 0.25 + (this.level * 0.015),
            headPosition: 0,
            freeze: 0
        };

        this.projectiles = [];
        this.explosions = [];
        this.particles = [];
        this.comboTexts = [];

        this.createChain();
        console.log('Game reset');
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }

    generateRoundSpiralPath() {
        const path = [];
        const cx = this.width / 2;
        const cy = this.height / 2;
        const turns = 3;
        const pointsPerTurn = 160;
        const total = Math.floor(turns * pointsPerTurn);
        const startR = Math.min(this.width, this.height) * 0.46;
        const endR = Math.min(this.width, this.height) * 0.22;

        for (let i = 0; i < total; i++) {
            const t = i / (total - 1);
            const angle = t * turns * Math.PI * 2;
            const radius = startR - t * (startR - endR);
            path.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
        }
        return path;
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    createChain() {
        const chainLength = 30 + this.level * 5;
        this.chain.balls = [];
        for (let i = 0; i < chainLength; i++) {
            this.chain.balls.push({
                color: this.getRandomColor(),
                offset: -i * 20
            });
        }
    }

    init() {
        console.log('Starting game...');
        this.state = GAME_STATE.PLAY;
        this.startGameLoop();
    }

    startGameLoop() {
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        const loop = (timestamp) => {
            if (!this.isPaused && !this.gameOver) {
                if (this.lastTime === 0) this.lastTime = timestamp;
                this.deltaTime = timestamp - this.lastTime;
                this.lastTime = timestamp;

                const fixedDelta = Math.min(this.deltaTime, 32) / 16.67;

                this.update(fixedDelta);
                this.draw();
            } else if (this.gameOver) {
                this.drawGameOverScreen();
            }
            this.gameLoopId = requestAnimationFrame(loop);
        };
        this.gameLoopId = requestAnimationFrame(loop);
    }

    update(dt) {
        this.updateChain(dt);
        this.updateProjectiles(dt);
        this.updateFrog(dt);
        this.updateExplosions(dt);
        this.updateParticles(dt);
        this.updateComboTexts(dt);
    }

    updateFrog(dt) {
        this.frog.blinkTimer += dt;
        if (this.frog.blinkTimer > 2000) {
            this.frog.blinkTimer = 0;
            this.frog.mouthOpen = !this.frog.mouthOpen;
        }
    }

    updateChain(dt) {
        if (this.chain.freeze > 0) {
            this.chain.freeze -= dt;
            return;
        }
        this.chain.headPosition += this.chain.speed * dt;
        for (let i = 0; i < this.chain.balls.length; i++) {
            const ball = this.chain.balls[i];
            ball.pathIndex = Math.floor(this.chain.headPosition + ball.offset);
            if (ball.pathIndex >= this.chain.path.length) {
                this.loseLife();
                return;
            }
            const pos = this.chain.path[Math.max(0, ball.pathIndex)];
            ball.x = pos.x;
            ball.y = pos.y;
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += Math.cos(p.angle) * p.speed * dt;
            p.y += Math.sin(p.angle) * p.speed * dt;

            // проверка столкновения с цепочкой
            for (let j = 0; j < this.chain.balls.length; j++) {
                const b = this.chain.balls[j];
                const dx = p.x - b.x;
                const dy = p.y - b.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    this.chain.balls.splice(j, 0, { color: p.color, offset: b.offset - 1 });
                    this.projectiles.splice(i, 1);
                    this.chain.freeze = 200; // заморозка движения на короткое время
                    this.checkForMatches(j);
                    break;
                }
            }
        }
    }

    checkForMatches(idx) {
        const targetColor = this.chain.balls[idx].color;
        let start = idx, end = idx;
        while (start > 0 && this.chain.balls[start - 1].color === targetColor) start--;
        while (end < this.chain.balls.length - 1 && this.chain.balls[end + 1].color === targetColor) end++;
        if (end - start + 1 >= 3) {
            this.chain.balls.splice(start, end - start + 1);
            this.score += (end - start + 1) * 10;
            this.comboTexts.push({ x: this.chain.balls[start]?.x || 0, y: this.chain.balls[start]?.y || 0, text: `+${(end - start + 1) * 10}`, timer: 1000 });
            if (this.chain.balls.length === 0) this.levelUp();
        }
    }

    updateExplosions(dt) {
        // простая логика — уменьшение таймера и удаление
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].timer -= dt;
            if (this.explosions[i].timer <= 0) this.explosions.splice(i, 1);
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt * 0.05;
            p.y += p.vy * dt * 0.05;
            p.timer -= dt;
            if (p.timer <= 0) this.particles.splice(i, 1);
        }
    }

    updateComboTexts(dt) {
        for (let i = this.comboTexts.length - 1; i >= 0; i--) {
            this.comboTexts[i].timer -= dt;
            this.comboTexts[i].y -= dt * 0.05;
            if (this.comboTexts[i].timer <= 0) this.comboTexts.splice(i, 1);
        }
    }

    shoot() {
        const angleRad = this.frog.angle * Math.PI / 180;
        this.projectiles.push({
            x: this.frog.x,
            y: this.frog.y,
            angle: angleRad,
            speed: 8,
            color: this.frog.nextBall
        });
        this.frog.nextBall = this.getRandomColor();
    }

    loseLife() {
        this.lives--;
        if (this.lives <= 0) {
            this.state = GAME_STATE.LOSE;
            this.gameOver = true;
        } else {
            this.createChain();
        }
    }

    levelUp() {
        this.level++;
        this.chain.speed += 0.05;
        this.createChain();
    }

    handleClick() {
        if (this.state === GAME_STATE.PLAY) this.shoot();
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // вода
        ctx.fillStyle = ART.colors.water;
        ctx.fillRect(0, 0, this.width, this.height);

        this.drawWhirlpool();
        this.drawChain();
        this.drawFrog();
        this.drawProjectiles();
        this.drawComboTexts();
    }

    drawFrog() {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.frog.x, this.frog.y);
        ctx.rotate(this.frog.angle * Math.PI / 180);
        ctx.fillStyle = ART.colors.frog;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawChain() {
        const ctx = this.ctx;
        for (let ball of this.chain.balls) {
            ctx.fillStyle = ball.color;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawProjectiles() {
        const ctx = this.ctx;
        for (let p of this.projectiles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawComboTexts() {
        const ctx = this.ctx;
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 20px Arial';
        for (let t of this.comboTexts) {
            ctx.fillText(t.text, t.x, t.y);
        }
    }

    drawWhirlpool() {
        const ctx = this.ctx;
        const wp = this.whirlpool;
        const gradient = ctx.createRadialGradient(wp.x, wp.y, 5, wp.x, wp.y, wp.radius);
        gradient.addColorStop(0, ART.colors.whirlpoolCenter);
        gradient.addColorStop(1, ART.colors.whirlpoolEdge);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGameOverScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Game Over', this.width / 2 - 120, this.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${this.score}`, this.width / 2 - 50, this.height / 2 + 40);
    }
}

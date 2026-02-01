console.log('Zuma Frog Game Engine loading...');

const ART = {
    colors: {
        water: '#6FB7B1', waterDark: '#4FA19B', streamEdge: '#5A9F99',
        frog: '#5FA77A', frogShadow: '#3E6F58', lily: '#6EA96E', lotus: '#F3B6C4',
        whirlpoolCenter: '#3E6F73', whirlpoolEdge: '#7FC6C2', bugRed: '#E55A5A'
    },
    shadowColor: 'rgba(0, 40, 30, 0.25)'
};

const GAME_STATE = { MENU: 'MENU', PLAY: 'PLAY', WIN: 'WIN', LOSE: 'LOSE' };

class ZumaGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error('Canvas not found!');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.state = GAME_STATE.MENU;
        this.colors = ['#FFD1DC','#B5EAD7','#E6E6FA','#FFDAB9','#FFF8E1','#B3E0FF'];
        this.resetGame();
        window.addEventListener('resize', () => this.resize());
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.lives = MAX_LIVES;
        this.isPaused = false;
        this.gameOver = false;
        this.lastLifeRestore = Date.now();
        this.projectiles = [];
        this.particles = [];
        this.comboTexts = [];
        this.frog = {
            x: this.width/2, y: this.height/2,
            angle: -90, state:'idle', blinkTimer:0, mouthOpen:false, smile:0,
            nextBall: this.getRandomColor()
        };
        this.whirlpool = { x: this.width/2, y: this.height/2, radius:42, angle:0 };
        this.chain = { balls: [], path:this.generateRoundSpiralPath(), speed:0.25, headPosition:0, freeze:40 };
        this.createChain();
    }

    generateRoundSpiralPath() {
        const path=[],cx=this.width/2,cy=this.height/2,turns=3.0,pointsPerTurn=160,total=Math.floor(turns*pointsPerTurn),startR=Math.min(this.width,this.height)*0.46,endR=Math.min(this.width,this.height)*0.22;
        for(let i=0;i<total;i++){
            const t=i/(total-1),angle=t*turns*2*Math.PI,radius=startR-t*(startR-endR);
            path.push({x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius});
        }
        return path;
    }

    getRandomColor(){ return this.colors[Math.floor(Math.random()*this.colors.length)]; }

    init(){ this.startGameLoop(); }

    createChain() {
        this.chain.balls = [];
        const ballCount = 18 + this.level*2, spacing=0.028;
        for(let i=0;i<ballCount;i++){
            const position=i*spacing;
            const point=this.getPathPoint(position);
            this.chain.balls.push({
                position, color:this.getRandomColor(), radius:20, index:i,
                wobble:Math.random()*Math.PI*2, wobbleSpeed:0.02+Math.random()*0.02
            });
        }
        if(this.chain.balls.length>0) this.chain.balls[this.chain.balls.length-1].type='bug';
        this.chain.headPosition=this.chain.balls[0]?.position||0;
    }

    getPathPoint(t){
        t=Math.max(0,Math.min(1,t));
        const path=this.chain.path;
        const index=t*(path.length-1);
        const i1=Math.floor(index), i0=Math.max(i1-1,0), i2=Math.min(i1+1,path.length-1), i3=Math.min(i1+2,path.length-1), frac=index-i1;
        const cubic=(p0,p1,p2,p3,t)=>{ const t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); };
        return { x:cubic(path[i0].x,path[i1].x,path[i2].x,path[i3].x,frac), y:cubic(path[i0].y,path[i1].y,path[i2].y,path[i3].y,frac) };
    }

    startGameLoop() {
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        const loop=(timestamp)=>{
            if(!this.isPaused && !this.gameOver){
                if(this.lastTime===0) this.lastTime=timestamp;
                const delta=timestamp-this.lastTime;
                this.lastTime=timestamp;
                this.update(Math.min(delta,32)/16.67);
                this.draw();
            } else if(this.gameOver) this.drawGameOverScreen();
            this.gameLoopId=requestAnimationFrame(loop);
        };
        this.gameLoopId=requestAnimationFrame(loop);
    }

    update(delta){
        if(this.state!==GAME_STATE.PLAY) return;
        this.updateFrog(delta);
        this.updateChain(delta);
        this.updateProjectiles(delta);
        this.updateEffects(delta);
        if(this.lives<MAX_LIVES && Date.now()-this.lastLifeRestore>LIFE_RESTORE_TIME){
            this.lives++;
            this.lastLifeRestore=Date.now();
        }
    }

    updateFrog(delta){
        this.frog.smile=Math.sin(Date.now()*0.002)*0.3;
        this.frog.blinkTimer+=delta;
        if(this.frog.blinkTimer>300){
            this.frog.blinkTimer=0;
            this.frog.state='blinking';
            setTimeout(()=>{ if(this.frog.state==='blinking') this.frog.state='idle';},150);
        }
    }

    updateChain(delta){
        if(this.chain.freeze>0){ this.chain.freeze--; return; }
        const speedMultiplier=0.25;
        this.chain.headPosition+=(this.chain.speed/200)*delta*speedMultiplier;
        for(let i=0;i<this.chain.balls.length;i++){
            const ball=this.chain.balls[i];
            if(i===0){ ball.position=this.chain.headPosition; } 
            else { const targetPos=this.chain.balls[i-1].position-0.03,diff=targetPos-ball.position; if(Math.abs(diff)>0.001) ball.position+=diff*0.05*delta*speedMultiplier; }
            ball.wobble+=ball.wobbleSpeed*delta;
            if(ball.position>=0.85){ this.loseLife(); this.chain.balls.splice(i,1); i--; }
        }
        const head=this.chain.balls[0];
        if(head){ const p=this.getPathPoint(head.position),dx=p.x-this.whirlpool.x,dy=p.y-this.whirlpool.y,dist=Math.sqrt(dx*dx+dy*dy); if(dist<this.whirlpool.radius*0.75){ this.loseLife(); this.chain.balls=[]; } }
    }

    loseLife(){
        if(this.lives<=0) return;
        this.lives--; this.lastLifeRestore=Date.now();
        localStorage.setItem('zumaLives',JSON.stringify({lives:this.lives,lastLost:Date.now()}));
        if(this.lives<=0){ this.state=GAME_STATE.LOSE; this.gameOver=true; } 
        else setTimeout(()=>{ this.createChain(); },600);
    }

    shoot(){ if(!this.frog.nextBall) return; const angle=this.frog.angle*Math.PI/180; const speed=12; this.projectiles.push({ x:this.frog.x, y:this.frog.y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed, radius:11, color:this.frog.nextBall, life:60, trail:[] }); this.frog.nextBall=this.getRandomColor(); }

    updateProjectiles(delta){
        for(let i=this.projectiles.length-1;i>=0;i--){
            const proj=this.projectiles[i];
            proj.x+=proj.vx*delta; proj.y+=proj.vy*delta;
            proj.trail.push({x:proj.x,y:proj.y}); if(proj.trail.length>5) proj.trail.shift();
            proj.life-=delta;
            if(proj.x<-proj.radius||proj.x>this.width+proj.radius||proj.y<-proj.radius||proj.y>this.height+proj.radius||proj.life<=0){ this.projectiles.splice(i,1); continue; }
            const collision=this.checkProjectileCollision(proj);
            if(collision) this.handleProjectileCollision(i,proj,collision);
        }
    }

    checkProjectileCollision(proj){
        let closest=null,minDistance=Infinity;
        for(let i=0;i<this.chain.balls.length;i++){
            const ball=this.chain.balls[i],point=this.getPathPoint(ball.position),dx=proj.x-point.x,dy=proj.y-point.y,distance=Math.sqrt(dx*dx+dy*dy);
            if(distance<proj.radius+ball.radius && distance<minDistance){ minDistance=distance; closest={ball,index:i,point}; }
        }
        return closest?{ball:closest.ball,index:closest.index,point:closest.point}:null;
    }

    handleProjectileCollision(projIndex,proj,collision){
        this.createExplosion(proj.x,proj.y,proj.color,15);
        const newBall={position:collision.ball.position,color:proj.color,radius:20,index:collision.index,wobble:0,wobbleSpeed:0.02+Math.random()*0.02};
        this.chain.balls.splice(collision.index,0,newBall);
        this.projectiles.splice(projIndex,1);
        this.checkForMatches(collision.index);
    }

    checkForMatches(startIndex){
        if(startIndex<0||startIndex>=this.chain.balls.length) return;
        const color=this.chain.balls[startIndex].color;
        let matches=[startIndex];
        for(let i=startIndex-1;i>=0;i--){ if(this.chain.balls[i].color===color) matches.unshift(i); else break; }
        for(let i=startIndex+1;i<this.chain.balls.length;i++){ if(this.chain.balls[i].color===color) matches.push(i); else break; }
        if(matches.length>=3) this.removeMatches(matches);
    }

    removeMatches(matches){
        matches.sort((a,b)=>b-a);
        const baseScore=100,multiplier=Math.min(matches.length-2,5),scoreGained=baseScore*multiplier;
        this.score+=scoreGained;
        const firstBall=this.chain.balls[matches[matches.length-1]],point=this.getPathPoint(firstBall.position);
        this.comboTexts.push({x:point.x,y:point.y,text:`+${scoreGained}`,life:60,color:'#FFD700'});
        for(const index of matches){ this.chain.balls.splice(index,1); }
        for(let i=0;i<this.chain.balls.length;i++) this.chain.balls[i].index=i;
        if(this.chain.balls.length===0){ this.state=GAME_STATE.WIN; this.levelUp(); }
    }

    levelUp(){ this.level++; this.lives=Math.min(this.lives+1,10); this.chain.speed=0.25+(this.level*0.015); this.createChain(); }

    updateEffects(delta){
        for(let i=this.particles.length-1;i>=0;i--){ const p=this.particles[i]; p.x+=p.vx*delta; p.y+=p.vy*delta; p.vy+=p.gravity; p.life--; if(p.life<=0) this.particles.splice(i,1); }
        for(let i=this.comboTexts.length-1;i>=0;i--){ const t=this.comboTexts[i]; t.y-=1*delta; t.life--; if(t.life<=0) this.comboTexts.splice(i,1); }
    }

    /* =========================
       DRAW
    ========================= */
    draw(){
        const ctx=this.ctx;
        ctx.clearRect(0,0,this.width,this.height);

        // water background
        ctx.fillStyle=ART.colors.water;
        ctx.fillRect(0,0,this.width,this.height);

        this.drawPath();
        this.drawChain();
        this.drawProjectiles();
        this.drawEffects();
        this.drawFrog();
        this.drawNextBall();
        this.drawLivesUI();
    }

    drawPath(){
        const ctx=this.ctx;
        ctx.beginPath();
        ctx.moveTo(this.chain.path[0].x,this.chain.path[0].y);
        for(const p of this.chain.path) ctx.lineTo(p.x,p.y);
        ctx.strokeStyle=ART.colors.streamEdge; ctx.lineWidth=12; ctx.stroke();
    }

    drawChain(){
        const ctx=this.ctx;
        for(const ball of this.chain.balls){
            const p=this.getPathPoint(ball.position);
            ctx.beginPath();
            ctx.arc(p.x,p.y,ball.radius,0,Math.PI*2);
            ctx.fillStyle=ball.color; ctx.fill();
            ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.stroke();
        }
    }

    drawProjectiles(){
        const ctx=this.ctx;
        for(const proj of this.projectiles){
            ctx.beginPath(); ctx.arc(proj.x,proj.y,proj.radius,0,Math.PI*2);
            ctx.fillStyle=proj.color; ctx.fill();
        }
    }

    drawEffects(){
        const ctx=this.ctx;
        for(const p of this.particles){
            ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
            ctx.fillStyle=p.color; ctx.fill();
        }
        for(const t of this.comboTexts){
            ctx.font=`bold 20px sans-serif`; ctx.fillStyle=t.color;
            ctx.fillText(t.text,t.x,t.y);
        }
    }

    drawFrog(){
        const ctx=this.ctx;
        ctx.save();
        ctx.translate(this.frog.x,this.frog.y);
        ctx.rotate(this.frog.angle*Math.PI/180);
        ctx.fillStyle=ART.colors.frog;
        ctx.beginPath();
        ctx.arc(0,0,30,0,Math.PI*2);
        ctx.fill();
        // eye
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(10,-10,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(10,-10,3,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }

    drawNextBall(){
        const ctx=this.ctx;
        ctx.beginPath(); ctx.arc(this.width-50,50,15,0,Math.PI*2);
        ctx.fillStyle=this.frog.nextBall; ctx.fill();
        ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.stroke();
    }

    drawLivesUI(){
        const ctx=this.ctx;
        for(let i=0;i<this.lives;i++){
            ctx.beginPath(); ctx.arc(30+i*35,30,12,0,Math.PI*2);
            ctx.fillStyle='#FF6B6B'; ctx.fill();
            ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.stroke();
        }
    }

    drawGameOverScreen(){
        const ctx=this.ctx;
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,this.width,this.height);
        ctx.fillStyle='#fff'; ctx.font='bold 40px sans-serif'; ctx.textAlign='center'; ctx.fillText(this.state==='WIN'?'ПОБЕДА!':'ИГРА ОКОНЧЕНА',this.width/2,this.height/2);
    }
}

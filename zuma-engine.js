const GAME_STATE = { MENU:'MENU', PLAY:'PLAY', WIN:'WIN', LOSE:'LOSE' };

class ZumaGame {
    constructor(canvasId){
        this.canvas=document.getElementById(canvasId);
        this.ctx=this.canvas.getContext('2d');
        this.width=this.canvas.width; this.height=this.canvas.height;
        this.state=GAME_STATE.MENU;
        this.level=1;
        this.lives=3;
        this.maxLives=3;
        this.projectiles=[]; this.particles=[]; this.comboTexts=[];
        this.chain={balls:[], path:[], speed:0.3, headPosition:0, freeze:0};
        this.frog={x:this.width/2,y:this.height/2,angle:-90,nextBall:null,mouthOpen:false,state:'idle',blinkTimer:0,smile:0};
        this.assets={frog:new Image()};
        this.ballImages=[];
        this.loadAssets();
    }

    loadAssets(){
        this.assets.frog.src='assets/frog.png';
        for(let i=1;i<=6;i++){
            let img=new Image();
            img.src=`assets/ball${i}.png`;
            this.ballImages.push(img);
        }
        this.assets.frog.onload=()=>{ console.log('Frog loaded'); }
    }

    init(){ this.resetGame(); this.startGameLoop(); }

    resetGame(){
        this.score=0; this.isPaused=false; this.gameOver=false; this.lastTime=0;
        this.chain.path=this.generateRoundSpiralPath();
        this.createChain();
        this.frog.nextBall=this.getRandomBall();
    }

    generateRoundSpiralPath(){
        const path=[]; const cx=this.width/2,cy=this.height/2;
        const turns=3,pointsPerTurn=160,total=Math.floor(turns*pointsPerTurn);
        const startR=Math.min(this.width,this.height)*0.46,endR=Math.min(this.width,this.height)*0.22;
        for(let i=0;i<total;i++){
            const t=i/(total-1);
            const angle=t*turns*Math.PI*2;
            const radius=startR-t*(startR-endR);
            path.push({x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius});
        } return path;
    }

    getRandomBall(){ return this.ballImages[Math.floor(Math.random()*6)]; }

    createChain(){
        this.chain.balls=[]; const spacing=0.028;
        for(let i=0;i<18+this.level*2;i++){
            const pos=i*spacing;
            this.chain.balls.push({position:pos,image:this.getRandomBall(),radius:20,wobble:Math.random()*Math.PI*2,wobbleSpeed:0.02+Math.random()*0.02});
        }
        this.chain.headPosition=0;
    }

    startGameLoop(){
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        const loop=ts=>{ if(!this.isPaused&&!this.gameOver){ if(!this.lastTime)this.lastTime=ts; const delta=ts-this.lastTime; this.lastTime=ts; this.update(delta/16.67); this.draw(); } this.gameLoopId=requestAnimationFrame(loop); };
        this.gameLoopId=requestAnimationFrame(loop);
    }

    update(delta){
        this.updateFrog(delta); this.updateProjectiles(delta);
        this.updateChain(delta); this.updateEffects(delta);
    }

    updateFrog(delta){
        this.frog.smile=Math.sin(Date.now()*0.002)*0.3;
        this.frog.blinkTimer+=delta;
        if(this.frog.blinkTimer>300){ this.frog.blinkTimer=0; this.frog.state='blinking'; setTimeout(()=>{ if(this.frog.state==='blinking') this.frog.state='idle'; },150); }
    }

    updateChain(delta){
        if(this.chain.freeze>0){ this.chain.freeze--; return; }
        const speedMult=0.25; this.chain.headPosition+=this.chain.speed*delta*speedMult;
        for(let i=0;i<this.chain.balls.length;i++){
            const b=this.chain.balls[i];
            if(i===0) b.position=this.chain.headPosition;
            else{ const target=this.chain.balls[i-1].position-0.03; b.position+= (target-b.position)*0.05*delta*speedMult; }
            b.wobble+=b.wobbleSpeed*delta;
        }
    }

    updateProjectiles(delta){
        for(let i=this.projectiles.length-1;i>=0;i--){
            const p=this.projectiles[i];
            p.x+=p.vx*delta; p.y+=p.vy*delta;
            p.life-=delta;
            if(p.life<=0){ this.projectiles.splice(i,1); continue; }
        }
    }

    updateEffects(delta){
        for(let i=this.particles.length-1;i>=0;i--){ const p=this.particles[i]; p.life--; if(p.life<=0) this.particles.splice(i,1); }
        for(let i=this.comboTexts.length-1;i>=0;i--){ const t=this.comboTexts[i]; t.life--; if(t.life<=0) this.comboTexts.splice(i,1); }
    }

    draw(){
        this.ctx.clearRect(0,0,this.width,this.height);
        this.drawChain(); this.drawFrog(); this.drawProjectiles(); this.drawEffects();
    }

    drawFrog(){
        const f=this.frog,ctx=this.ctx,img=this.assets.frog;
        ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.angle*Math.PI/180);
        ctx.drawImage(img,-img.width/2,-img.height/2,img.width,img.height);
        ctx.restore();
    }

    drawChain(){
        const ctx=this.ctx;
        for(const b of this.chain.balls){
            const p=this.getPathPoint(b.position);
            const wobX=Math.sin(b.wobble)*2, wobY=Math.cos(b.wobble)*2;
            ctx.drawImage(b.image,p.x-b.radius+wobX,p.y-b.radius+wobY,b.radius*2,b.radius*2);
        }
    }

    drawProjectiles(){
        for(const p of this.projectiles) this.ctx.drawImage(p.image,p.x-p.radius,p.y-p.radius,p.radius*2,p.radius*2);
    }

    getPathPoint(t){ t=Math.max(0,Math.min(1,t)); const path=this.chain.path; const idx=t*(path.length-1)|0; return path[idx]; }

    shoot(){
        if(!this.frog.nextBall) return;
        const angle=this.frog.angle*Math.PI/180,speed=10;
        const p={x:this.frog.x+Math.cos(angle)*50,y:this.frog.y+Math.sin(angle)*50,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,image:this.frog.nextBall,radius:20,life:150};
        this.projectiles.push(p);
        this.frog.mouthOpen=true;
        this.frog.nextBall=this.getRandomBall();
        setTimeout(()=>{ this.frog.mouthOpen=false; },100);
    }

}

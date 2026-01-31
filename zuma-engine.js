const GAME_STATE = { MENU:'MENU', PLAY:'PLAY', WIN:'WIN', LOSE:'LOSE' };

class ZumaGame {
    constructor(canvasId){
        this.canvas=document.getElementById(canvasId);
        this.ctx=this.canvas.getContext('2d');
        this.width=this.canvas.width;
        this.height=this.canvas.height;
        this.state=GAME_STATE.PLAY;
        this.level=1;
        this.colors=['#FFD1DC','#B5EAD7','#E6E6FA','#FFDAB9','#FFF8E1','#B3E0FF'];
        this.projectiles=[];
        this.chain={balls:[],path:[]};
        this.frog={x:this.width/2,y:this.height/2,angle:-90,nextBall:null};
        this.loadAssets();
    }

    loadAssets(){
        this.ballImgs = {};
        for(const color of this.colors){
            const img = new Image();
            img.src = this.getBallPNG(color);
            this.ballImgs[color] = img;
        }
        this.frogImg = new Image();
        this.frogImg.src = this.getFrogPNG();
    }

    getBallPNG(color){
        const c=document.createElement('canvas');c.width=64;c.height=64;
        const ctx=c.getContext('2d');
        const g=ctx.createRadialGradient(32,32,5,32,32,30);
        g.addColorStop(0,'#FFF'); g.addColorStop(0.3,color); g.addColorStop(1,color);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(32,32,30,0,Math.PI*2); ctx.fill();
        return c.toDataURL();
    }

    getFrogPNG(){
        const c=document.createElement('canvas');c.width=128;c.height=128;
        const ctx=c.getContext('2d');
        ctx.fillStyle='#66BB6A';ctx.beginPath();ctx.ellipse(64,64,50,35,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#FFCDD2';ctx.beginPath();ctx.arc(44,54,12,0,Math.PI*2);ctx.arc(44,74,12,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='white';ctx.beginPath();ctx.arc(78,54,15,0,Math.PI*2);ctx.arc(78,74,15,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#222';ctx.beginPath();ctx.arc(78,54,7,0,Math.PI*2);ctx.arc(78,74,7,0,Math.PI*2);ctx.fill();
        return c.toDataURL();
    }

    init(){
        this.createChain();
        this.frog.nextBall=this.colors[Math.floor(Math.random()*this.colors.length)];
        requestAnimationFrame(t=>this.loop(t));
    }

    createChain(){
        this.chain.path=this.generateSpiral();
        this.chain.balls=[];
        const count=18+this.level*2;
        for(let i=0;i<count;i++){
            const pos=i/60;
            this.chain.balls.push({position:pos,color:this.colors[Math.floor(Math.random()*this.colors.length)]});
        }
    }

    generateSpiral(){
        const path=[],cx=this.width/2,cy=this.height/2;
        const turns=3,points=160*turns;
        for(let i=0;i<points;i++){
            const t=i/(points-1);
            const angle=t*turns*Math.PI*2;
            const r=this.width*0.45-t*(this.width*0.23);
            path.push({x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r});
        }
        return path;
    }

    loop(){
        this.update();this.draw();
        if(this.chain.balls.length===0) { this.state=GAME_STATE.WIN; showEndScreen(true); return; }
        requestAnimationFrame(t=>this.loop());
    }

    update(){
        for(const ball of this.chain.balls){
            ball.position+=0.001;
            if(ball.position>1){ this.state=GAME_STATE.LOSE; showEndScreen(false); return; }
        }
        for(const p of this.projectiles){
            p.x+=p.vx; p.y+=p.vy;
            // Проверка попадания
            for(let i=0;i<this.chain.balls.length;i++){
                const ball = this.chain.balls[i];
                const idx=Math.floor(ball.position*(this.chain.path.length-1));
                const pos=this.chain.path[idx];
                const dx=pos.x-p.x; const dy=pos.y-p.y;
                if(Math.sqrt(dx*dx+dy*dy)<32){
                    this.chain.balls.splice(i,1);
                    p.hit=true; break;
                }
            }
        }
        this.projectiles = this.projectiles.filter(p=>!p.hit);
    }

    draw(){
        const ctx=this.ctx;
        ctx.clearRect(0,0,this.width,this.height);
        this.drawPath(); this.drawChain(); this.drawFrog();
        this.drawProjectiles();
    }

    drawPath(){
        const ctx=this.ctx;
        if(this.chain.path.length<2) return;
        ctx.strokeStyle='#6FB7B1';ctx.lineWidth=25;
        ctx.beginPath(); ctx.moveTo(this.chain.path[0].x,this.chain.path[0].y);
        for(const p of this.chain.path) ctx.lineTo(p.x,p.y);
        ctx.stroke();
    }

    drawChain(){
        const ctx=this.ctx;
        for(const ball of this.chain.balls){
            const idx=Math.floor(ball.position*(this.chain.path.length-1));
            const p=this.chain.path[idx];
            ctx.drawImage(this.ballImgs[ball.color],p.x-32,p.y-32,64,64);
        }
    }

    drawFrog(){
        const ctx=this.ctx;
        ctx.save(); ctx.translate(this.frog.x,this.frog.y); ctx.rotate(this.frog.angle*Math.PI/180);
        ctx.drawImage(this.frogImg,-64,-64,128,128); ctx.restore();
    }

    drawProjectiles(){
        const ctx=this.ctx;
        for(const p of this.projectiles){
            ctx.drawImage(this.ballImgs[p.color],p.x-16,p.y-16,32,32);
        }
    }

    shoot(){
        if(!this.frog.nextBall) return;
        this.projectiles.push({
            x:this.frog.x,y:this.frog.y,
            vx:Math.cos(this.frog.angle*Math.PI/180)*10,
            vy:Math.sin(this.frog.angle*Math.PI/180)*10,
            color:this.frog.nextBall
        });
        this.frog.nextBall=this.colors[Math.floor(Math.random()*this.colors.length)];
    }
}

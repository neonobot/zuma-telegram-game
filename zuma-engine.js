class ZumaGame{
constructor(canvas){
    this.ctx=canvas.getContext('2d');
    this.w=canvas.width;
    this.h=canvas.height;

    this.state='START'; // START | PLAY | WIN | LOSE
    this.level=1;
    this.score=0;

    this.frog={x:this.w/2,y:this.h/2,angle:0,next:'green'};
    this.chain=[];
    this.projectiles=[];
    this.lives=3;

    this.assets={
        frog:new Image(),
        ball:new Image(),
        start:new Image(),
        win:new Image(),
        lose:new Image()
    };

    // заглушки
    Object.values(this.assets).forEach(i=>{
        i.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGBgAAAABQABDQottAAAAABJRU5ErkJggg==';
    });
}

start(){
    requestAnimationFrame(()=>this.loop());
}

startGame(){
    this.chain=[];
    for(let i=0;i<20;i++){
        this.chain.push({pos:i*0.04,color:this.randomColor()});
    }
    this.state='PLAY';
}

shoot(){
    this.projectiles.push({
        x:this.frog.x,
        y:this.frog.y,
        a:this.frog.angle,
        color:this.randomColor()
    });
}

update(){
    if(this.state!=='PLAY')return;

    this.chain.forEach(b=>b.pos+=0.0008);

    const head=this.chain[0];
    if(head&&head.pos>1){
        this.lives--;
        if(this.lives<=0)this.state='LOSE';
        else this.startGame();
    }

    this.projectiles.forEach(p=>{
        p.x+=Math.cos(p.a)*10;
        p.y+=Math.sin(p.a)*10;
    });
}

drawStart(){
    this.ctx.fillStyle='#bfe8f2';
    this.ctx.fillRect(0,0,this.w,this.h);

    this.ctx.fillStyle='#2f7d5b';
    this.ctx.font='900 52px Nunito';
    this.ctx.textAlign='center';
    this.ctx.fillText('ZUMA FROG',this.w/2,200);

    this.ctx.font='700 26px Nunito';
    this.ctx.fillText(`Уровень ${this.level}`,this.w/2,250);

    this.drawButton(this.w/2,this.h/2,'Play',()=>{
        this.startGame();
    });
}

drawButton(x,y,text,cb){
    const w=200,h=60;
    this.ctx.fillStyle='#6fe3b0';
    this.ctx.beginPath();
    this.ctx.roundRect(x-w/2,y-h/2,w,h,30);
    this.ctx.fill();

    this.ctx.fillStyle='#fff';
    this.ctx.font='900 26px Nunito';
    this.ctx.textAlign='center';
    this.ctx.fillText(text,x,y+9);

    this.ctx.canvas.onclick=e=>{
        const r=this.ctx.canvas.getBoundingClientRect();
        const mx=(e.clientX-r.left)*(this.w/r.width);
        const my=(e.clientY-r.top)*(this.h/r.height);
        if(mx>x-w/2&&mx<x+w/2&&my>y-h/2&&my<y+h/2)cb();
    };
}

draw(){
    this.ctx.clearRect(0,0,this.w,this.h);

    if(this.state==='START')return this.drawStart();

    this.chain.forEach(b=>{
        const p=this.path(b.pos);
        this.drawBall(p.x,p.y,b.color);
    });

    this.projectiles.forEach(p=>{
        this.drawBall(p.x,p.y,p.color);
    });

    this.drawFrog();
    this.drawUI();

    if(this.state==='WIN'||this.state==='LOSE'){
        this.drawOverlay();
    }
}

drawUI(){
    this.ctx.fillStyle='#fff';
    this.ctx.font='700 18px Nunito';
    this.ctx.textAlign='left';
    this.ctx.fillText(`❤️ ${this.lives}`,20,30);
    this.ctx.fillText(`Уровень ${this.level}`,20,55);
}

drawOverlay(){
    this.ctx.fillStyle='rgba(0,0,0,.5)';
    this.ctx.fillRect(0,0,this.w,this.h);

    const txt=this.state==='WIN'?'Level Complete!':'Level Failed';
    this.ctx.fillStyle='#fff';
    this.ctx.font='900 42px Nunito';
    this.ctx.textAlign='center';
    this.ctx.fillText(txt,this.w/2,this.h/2-40);

    this.drawButton(this.w/2,this.h/2+40,'Retry',()=>{
        this.startGame();
    });
}

drawFrog(){
    this.ctx.save();
    this.ctx.translate(this.frog.x,this.frog.y);
    this.ctx.rotate(this.frog.angle);
    this.ctx.fillStyle='#4caf50';
    this.ctx.beginPath();
    this.ctx.arc(0,0,30,0,Math.PI*2);
    this.ctx.fill();
    this.ctx.restore();
}

drawBall(x,y,c){
    this.ctx.fillStyle=c;
    this.ctx.beginPath();
    this.ctx.arc(x,y,16,0,Math.PI*2);
    this.ctx.fill();
}

path(t){
    const r=220-120*t;
    const a=t*6*Math.PI;
    return {
        x:this.w/2+Math.cos(a)*r,
        y:this.h/2+Math.sin(a)*r
    };
}

randomColor(){
    return ['#9be7c4','#f7b7a3','#cbb7f7','#f7e3a3','#a3d7f7'][Math.floor(Math.random()*5)];
}

loop(){
    this.update();
    this.draw();
    requestAnimationFrame(()=>this.loop());
}
}

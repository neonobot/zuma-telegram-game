
class ZumaGame{
constructor(canvas){
    this.ctx=canvas.getContext('2d');
    this.w=canvas.width;
    this.h=canvas.height;

    this.state='START'; // START | PLAY | WIN | LOSE
    this.level=1;
    this.score=0;

    this.uiButtons = [];

    this.colors = {
    frogLight: '#bff2c8',
    frogDark: '#4fbf9c',
    water: '#9adfe5',
    waterDark: '#5fbac4',
    whirl: '#3a8fa3',
    shadow: 'rgba(0,0,0,0.25)'
};



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
    const ctx = this.ctx;

    ctx.fillStyle = '#bfe8f2';
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.fillStyle = '#2f7d5b';
    ctx.font = '900 52px Nunito';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZUMA FROG', this.w / 2, 160);

    ctx.font = '700 26px Nunito';
    ctx.fillText(`Уровень ${this.level}`, this.w / 2, 210);

    this.drawUIButton(
        this.w / 2,
        this.h / 2,
        220,
        64,
        'Play',
        () => this.startGame()
    );
}


drawUIButton(x, y, w, h, text, onClick) {
    const ctx = this.ctx;

    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.roundRect(x - w/2, y - h/2 + 4, w, h, h/2);
    ctx.fill();

    // тело кнопки
    const grad = ctx.createLinearGradient(0, y - h/2, 0, y + h/2);
    grad.addColorStop(0, '#8EE7C4');
    grad.addColorStop(1, '#4FBF9C');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x - w/2, y - h/2, w, h, h/2);
    ctx.fill();

    // блик
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.roundRect(x - w/2 + 6, y - h/2 + 6, w - 12, h/2 - 6, h/2);
    ctx.fill();

    // текст
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px Nunito';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, x, y);

    ctx.shadowBlur = 0;

    // кликабельность
    this.uiButtons.push({
        x, y, w, h, onClick
    });
}


draw(){
    this.ctx.clearRect(0,0,this.w,this.h);

    this.drawPath();
    this.drawWhirlpool();

    if(this.state==='START'){
        this.drawStart();
        return;
    }


    this.chain.forEach(b => {
        const p = this.path(b.pos);
        this.drawBall(p.x, p.y, b.color);
    });

    this.projectiles.forEach(p => {
        this.drawBall(p.x, p.y, p.color);
    });

    this.drawFrog();
    this.drawUI();

    if (this.state === 'WIN' || this.state === 'LOSE') {
        this.drawOverlay();
    }
}

drawUI(){
    const ctx=this.ctx;

    for(let i=0;i<this.lives;i++){
        const x=30+i*28;
        const y=30;

        ctx.fillStyle='#f28b82';
        ctx.beginPath();
        ctx.arc(x-5,y,6,0,Math.PI*2);
        ctx.arc(x+5,y,6,0,Math.PI*2);
        ctx.lineTo(x,y+12);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle='#fff';
    ctx.font='700 18px Nunito';
    ctx.fillText(`Уровень ${this.level}`,20,60);
}


drawOverlay(){
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.w, this.h);

    const text = this.state === 'WIN'
        ? 'Level Complete!'
        : 'Level Failed';

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px Nunito';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.w / 2, this.h / 2 - 60);

    this.drawUIButton(
        this.w / 2,
        this.h / 2 + 30,
        240,
        64,
        this.state === 'WIN' ? 'Next' : 'Retry',
        () => {
            if (this.state === 'WIN') this.level++;
            this.startGame();
        }
    );
}


drawFrog(){
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.frog.x, this.frog.y);
    ctx.rotate(this.frog.angle);

    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 38, 40, 12, 0, 0, Math.PI*2);
    ctx.fill();

    // тело
    const body = ctx.createRadialGradient(0,-20,10,0,0,50);
    body.addColorStop(0, this.colors.frogLight);
    body.addColorStop(1, this.colors.frogDark);

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0,0,36,0,Math.PI*2);
    ctx.fill();

    // глаза
    [-14,14].forEach(x=>{
        ctx.fillStyle='#fff';
        ctx.beginPath();
        ctx.arc(x,-18,9,0,Math.PI*2);
        ctx.fill();

        ctx.fillStyle='#2e3a3a';
        ctx.beginPath();
        ctx.arc(x,-18,4,0,Math.PI*2);
        ctx.fill();
    });

    // рот
    ctx.strokeStyle='#2e3a3a';
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(0,6,12,0,Math.PI);
    ctx.stroke();

    ctx.restore();
}


drawBall(x,y,c){
    const ctx=this.ctx;
    const r=16;

    // тень
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(x,y+5,r*0.9,0,Math.PI*2);
    ctx.fill();

    // тело
    const g=ctx.createRadialGradient(x-r/3,y-r/3,2,x,y,r);
    g.addColorStop(0,'#ffffffcc');
    g.addColorStop(0.35,c);
    g.addColorStop(1,'#00000044');

    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
}
drawWhirlpool(){
    const ctx=this.ctx;
    const cx=this.w/2;
    const cy=this.h/2;
    const maxR=60;

    ctx.save();
    ctx.translate(cx,cy);

    for(let i=0;i<20;i++){
        ctx.strokeStyle=`rgba(80,160,180,${0.04+i*0.02})`;
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(0,0,maxR-i*2,i*0.3,i*0.3+Math.PI);
        ctx.stroke();
    }

    ctx.restore();
}
drawPath(){
    const ctx=this.ctx;
    ctx.strokeStyle=this.colors.water;
    ctx.lineWidth=28;
    ctx.lineCap='round';

    ctx.beginPath();
    for(let t=0;t<=1;t+=0.01){
        const p=this.path(t);
        if(t===0)ctx.moveTo(p.x,p.y);
        else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
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

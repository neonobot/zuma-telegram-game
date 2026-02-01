// game-ui.js — UI + input + state bridge

const LIFE_RESTORE_TIME = 10 * 60 * 1000;
const MAX_LIVES = 3;

let game;
const canvas = document.getElementById('gameCanvas');

/* =========================
   LIVES STORAGE
========================= */

function loadLives(){
    let d = JSON.parse(localStorage.getItem('zumaLives'));
    if(!d) d = { lives:MAX_LIVES,lastLost:Date.now() };
    const now = Date.now();
    const restored = Math.floor((now-d.lastLost)/LIFE_RESTORE_TIME);
    if(restored>0){
        d.lives=Math.min(MAX_LIVES,d.lives+restored);
        d.lastLost=now;
    }
    localStorage.setItem('zumaLives',JSON.stringify(d));
    return d.lives;
}

function saveLives(lives){
    localStorage.setItem('zumaLives',JSON.stringify({
        lives,
        lastLost:Date.now()
    }));
}

/* =========================
   INPUT
========================= */

function aim(x,y){
    if(!game||game.state!=='PLAY')return;
    const r=canvas.getBoundingClientRect();
    const mx=(x-r.left)*(canvas.width/r.width);
    const my=(y-r.top)*(canvas.height/r.height);
    const dx=mx-game.frog.x;
    const dy=my-game.frog.y;
    game.frog.angle=Math.atan2(dy,dx);
}

canvas.addEventListener('mousedown',e=>aim(e.clientX,e.clientY));
canvas.addEventListener('mousemove',e=>aim(e.clientX,e.clientY));
canvas.addEventListener('mouseup',()=>{
    if(game&&game.state==='PLAY')game.shoot();
});

canvas.addEventListener('touchstart',e=>{
    const t=e.touches[0];
    aim(t.clientX,t.clientY);
},{passive:false});

canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    const t=e.touches[0];
    aim(t.clientX,t.clientY);
},{passive:false});

canvas.addEventListener('touchend',()=>{
    if(game&&game.state==='PLAY')game.shoot();
});
canvas.addEventListener('click', e => {
    if (!game) return;

    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);

    for (const b of game.uiButtons) {
        if (
            mx > b.x - b.w/2 &&
            mx < b.x + b.w/2 &&
            my > b.y - b.h/2 &&
            my < b.y + b.h/2
        ) {
            b.onClick();
            return;
        }
    }
});


/* =========================
   START
========================= */

game = new ZumaGame(canvas);
game.lives = loadLives();
game.start();

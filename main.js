var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = window.innerWidth - 100;
canvas.height = window.innerHeight - 100;

var imgDino = new Image();
imgDino.src = './img/dino_s.png';

var dino = {
    x : 10,
    y : 200,
    width : 50,
    height : 50,
    draw(){
        ctx.fillStyle = 'green';
        //ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.drawImage(imgDino, this.x, this.y);
    }
}
dino.draw();

var imgCactus = new Image();
imgCactus.src = './img/cactus_s.png';

class Cactus {
    constructor(){
        this.x = 500;
        this.y = 200;
        this.width = 50;
        this.height = 50;
    }
    draw(){
        ctx.fillStyle = 'red';
        //ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.drawImage(imgCactus, this.x, this.y);
    }
}

var timer = 0;
var cactusArr = [];
var jumpingCount = 0;
var animation;

function FrameAction(){
    animation = requestAnimationFrame(FrameAction);
    timer++;

    ctx.clearRect(0,0, canvas.width, canvas.height);

    if(timer % 150 == 0){
        var cactus = new Cactus();
        cactusArr.push(cactus);
    }

    cactusArr.forEach((a, i, o)=>{
        // x 좌표가 0미만이면 제거
        if(a.x < 0){
            o.splice(i, 1);
        }
        a.x-=2;

        checkCrash(dino, a);

        a.draw();
    })

    if(jumping == true){
        dino.y-=4;
        jumpingCount+=3;
    }
    if(jumping == false){
        if(dino.y < 200){
            dino.y+=4;
        }
    }
    if(jumpingCount>100){
        jumping = false;
        jumpingCount = 0;
    }

    dino.draw();
}

FrameAction();


// 충돌확인
function checkCrash(dino, cactus){
    var diffX = cactus.x - (dino.x + dino.width);
    var diffY = cactus.y - (dino.y + dino.height);
    
    if(diffX < 0 && diffY < 0){
        ctx.clearRect(0,0, canvas.width, canvas.height);
        cancelAnimationFrame(animation);
    }
}


var jumping = false;
document.addEventListener('keydown', function(e){
    if(e.code === 'Space'){
        jumping = true;
    }
})

btn.onclick = function (e) {
    jumping = true;
}
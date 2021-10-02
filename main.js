var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = 300;
canvas.height = window.innerHeight - 100;

//var imgShip = new Image();
//imgShip.src = './img/ship.png';

var Ship = {
    x : 135,
    y : canvas.height-50,
    width : 30,
    height : 30,
    draw(){
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        //ctx.drawImage(imgShip, this.x, this.y);
    }
}
Ship.draw();

//var imgBullet = new Image();
//imgBullet.src = './img/bullet.png';

class Bullet {
    constructor(){
        this.x = Ship.x+((Ship.width-10)/2);
        this.y = Ship.y;
        this.width = 10;
        this.height = 10;
    }
    draw(){
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        //ctx.drawImage(imgBullet, this.x, this.y);
    }
}


//var imgEnemy = new Image();
//imgEnemy.src = './img/enemy.png';

class Enemy {
    constructor(){
        this.x = Math.floor(Math.random()*10)*30;
        //this.x = 165;
        this.y = 0;
        this.width = 30;
        this.height = 30;
    }
    draw(){
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        //ctx.drawImage(imgEnemy, this.x, this.y);
    }
}

var timer = 0;
var enemyArr = [];
var bulletArr = [];
var animation;

function FrameAction(){
    animation = requestAnimationFrame(FrameAction);
    timer++;
    ($("#score")).html("점수: "+parseInt(timer/100));

    ctx.clearRect(0,0, canvas.width, canvas.height);

    if(timer % Math.floor(Math.random()*200) == 0){
        var enemy = new Enemy();
        enemyArr.push(enemy);
    }

    if(timer % 30 == 0){
        var bullet = new Bullet();
        bulletArr.push(bullet);
    }

    bulletArr.forEach((a, i, o)=>{
        if(a.y < 0){
            o.splice(i, 1);
        }
        a.y-=4;

        enemyArr.forEach((b, j, p)=>{
            if(checkCrash(a, b)){
                p.splice(j, 1);
            }
        })

        a.draw();
    })

    enemyArr.forEach((a, i, o)=>{
        if(a.y > canvas.height){
            o.splice(i, 1);
        }
        a.y+=2;
        a.x+=3*(2-Math.floor(Math.random()*5));

        if(checkCrash(Ship, a)){
            stopGame();
        }

        a.draw();
    })

    if(leftKey == true){
        Ship.x-=4;
    }
    if(rightKey == true){
        Ship.x+=4;
    }
    if(upKey == true){
        Ship.y-=4;
    }
    if(downKey == true){
        Ship.y+=4;
    }

    Ship.draw();
}

FrameAction();


// Check crash between ship and enemy
function checkCrash(ship, enemy){
    var diffX = (enemy.x + enemy.width) - ship.x;
    var diffY = (enemy.y + enemy.height) - ship.y;
    
    //console.log(diffX+", "+diffY);
    if(diffX < (enemy.width+ship.width) && diffX > 0 && diffY < (enemy.width+ship.width) && diffY > 0){
        return true;
    }else{
        return false;
    }
}

function stopGame(){
    ctx.clearRect(0,0, canvas.width, canvas.height);
    cancelAnimationFrame(animation);
}

// Input key from Keyboard
var leftKey = false;
var upKey = false;
var rightKey = false;
var downKey = false;

document.onkeydown = function(e){
    switch(e.keyCode){
        case 37:
            leftKey = true;
            break;
        case 38:
            upKey = true;
            break;
        case 39:
            rightKey = true;
            break;
        case 40:
            downKey = true;
            break;
    }
};

document.onkeyup = function(e){
    switch(e.keyCode){
        case 37:
            leftKey = false;
            break;
        case 38:
            upKey = false;
            break;
        case 39:
            rightKey = false;
            break;
        case 40:
            downKey = false;
            break;
    }
};
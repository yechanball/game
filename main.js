var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var scoreElement = document.getElementById('score');

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
var score = 0;
var enemyArr = [];
var enemyFreq = 200;
var enemySpeed = 2;
var bulletArr = [];
var bulletFreq = 25;
var bulletSpeed = 4;
var nextEnemySpawnAt = 0;

var animation;

function randomEnemyDelay(){
    return Math.floor(Math.random()*enemyFreq) + 20;
}

function triggerVibration(pattern){
    if(window.navigator && typeof window.navigator.vibrate === "function"){
        window.navigator.vibrate(pattern);
    }
}

function FrameAction(){
    animation = requestAnimationFrame(FrameAction);
    timer++;
    scoreElement.textContent = "점수: " + (score + Math.floor(timer/100));

    ctx.clearRect(0,0, canvas.width, canvas.height);

    if(timer >= nextEnemySpawnAt){
        var enemy = new Enemy();
        enemyArr.push(enemy);
        nextEnemySpawnAt = timer + randomEnemyDelay();
    }

    for(var i = enemyArr.length - 1; i >= 0; i--){
        var currentEnemy = enemyArr[i];
        currentEnemy.y += enemySpeed;
        currentEnemy.x += 3*(2-Math.floor(Math.random()*5));

        if(currentEnemy.y > canvas.height){
            enemyArr.splice(i, 1);
            continue;
        }

        if(checkCrash(Ship, currentEnemy)){
            triggerVibration([500,200,500,200,500]);
            stopGame();
            return;
        }

        currentEnemy.draw();
    }

    if(timer % bulletFreq == 0){
        var bullet = new Bullet();
        bulletArr.push(bullet);
    }

    for(var bulletIndex = bulletArr.length - 1; bulletIndex >= 0; bulletIndex--){
        var currentBullet = bulletArr[bulletIndex];
        currentBullet.y -= bulletSpeed;

        if(currentBullet.y < 0){
            bulletArr.splice(bulletIndex, 1);
            continue;
        }

        var hitEnemy = false;
        for(var enemyIndex = enemyArr.length - 1; enemyIndex >= 0; enemyIndex--){
            if(checkCrash(currentBullet, enemyArr[enemyIndex])){
                triggerVibration([100]);
                enemyArr.splice(enemyIndex, 1);
                bulletArr.splice(bulletIndex, 1);
                score++;
                hitEnemy = true;
                break;
            }
        }

        if(!hitEnemy){
            currentBullet.draw();
        }
    }

    // key control
    if(leftKey == true){
        if(Ship.x > 0){
            Ship.x-=3;
        }
    }
    if(rightKey == true){
        if(Ship.x < (canvas.width-Ship.width)){
            Ship.x+=3;
        }
    }
    if(upKey == true){
        if(Ship.y > 0){
            Ship.y-=3;
        }
    }
    if(downKey == true){
        if(Ship.y < (canvas.height-Ship.height)){
            Ship.y+=3;
        }
    }

    Ship.draw();
}

FrameAction();


// Check crash between ship and enemy
function checkCrash(ship, enemy){
    return ship.x < enemy.x + enemy.width &&
        ship.x + ship.width > enemy.x &&
        ship.y < enemy.y + enemy.height &&
        ship.y + ship.height > enemy.y;
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

if("GravitySensor" in window){
    try {
        let gravitySensor = new GravitySensor({frequency: 60});
        var sensorDeadzone = 0.5;

        gravitySensor.addEventListener("reading", () => {
            // X 양수 왼쪽 아래로, 음수 오른쪽 아래로
            if(gravitySensor.x > sensorDeadzone){
                leftKey = true;
                rightKey = false;
            }else if(gravitySensor.x < -sensorDeadzone){
                leftKey = false;
                rightKey = true;
            }else{
                leftKey = false;
                rightKey = false;
            }

            // Y 양수 아래쪽 아래로, 음수 위쪽 아래로
            if(gravitySensor.y > sensorDeadzone){
                upKey = false;
                downKey = true;
            }else if(gravitySensor.y < -sensorDeadzone){
                upKey = true;
                downKey = false;
            }else{
                upKey = false;
                downKey = false;
            }
        });

        gravitySensor.start();
    } catch (error) {
        console.warn("GravitySensor is unavailable:", error);
    }
}

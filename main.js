var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var currentScoreElement = document.getElementById('current-score');
var highScoreElement = document.getElementById('high-score');
var gameOverLayer = document.getElementById('game-over');
var finalScoreElement = document.getElementById('final-score');
var restartButton = document.getElementById('restart-button');
var settingsToggleButton = document.getElementById('settings-toggle');
var settingsPanel = document.getElementById('settings-panel');
var settingsResetButton = document.getElementById('settings-reset');
var playerSpeedInput = document.getElementById('player-speed-input');
var enemySpeedInput = document.getElementById('enemy-speed-input');
var bulletSpeedInput = document.getElementById('bullet-speed-input');
var enemySpawnInput = document.getElementById('enemy-spawn-input');
var bulletIntervalInput = document.getElementById('bullet-interval-input');
var sensorDeadzoneInput = document.getElementById('sensor-deadzone-input');
var playerSpeedValue = document.getElementById('player-speed-value');
var enemySpeedValue = document.getElementById('enemy-speed-value');
var bulletSpeedValue = document.getElementById('bullet-speed-value');
var enemySpawnValue = document.getElementById('enemy-spawn-value');
var bulletIntervalValue = document.getElementById('bullet-interval-value');
var sensorDeadzoneValue = document.getElementById('sensor-deadzone-value');

var SETTINGS_STORAGE_KEY = "galaga-game-settings-v1";
var HIGH_SCORE_STORAGE_KEY = "galaga-high-score-v1";
var defaultGameConfig = {
    playerSpeed: 3,
    enemySpeed: 2,
    bulletSpeed: 4,
    enemySpawnWindow: 200,
    bulletInterval: 25,
    sensorDeadzone: 0.5
};

var gameConfig = loadGameConfig();

canvas.width = 300;
canvas.height = window.innerHeight - 100;

var shipStartX = 135;
var shipStartY = canvas.height - 50;

//var imgShip = new Image();
//imgShip.src = './img/ship.png';

var Ship = {
    x : shipStartX,
    y : shipStartY,
    width : 30,
    height : 30,
    draw(){
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        //ctx.drawImage(imgShip, this.x, this.y);
    }
};

//var imgBullet = new Image();
//imgBullet.src = './img/bullet.png';

class Bullet {
    constructor(){
        this.x = Ship.x + ((Ship.width - 10) / 2);
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
        this.x = Math.floor(Math.random() * 10) * 30;
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
var highScore = loadHighScore();
var enemyArr = [];
var bulletArr = [];
var nextEnemySpawnAt = 0;
var nextBulletAt = 0;

var animation = null;
var gameStopped = false;
var gameOverRevealTimeout = null;

// Input key from keyboard or sensor
var leftKey = false;
var upKey = false;
var rightKey = false;
var downKey = false;

function clampNumber(value, min, max, fallback){
    if(typeof value !== "number" || Number.isNaN(value)){
        return fallback;
    }
    return Math.min(max, Math.max(min, value));
}

function normalizeGameConfig(rawConfig){
    var candidate = rawConfig || {};
    return {
        playerSpeed: Math.round(clampNumber(candidate.playerSpeed, 1, 8, defaultGameConfig.playerSpeed)),
        enemySpeed: clampNumber(candidate.enemySpeed, 1, 6, defaultGameConfig.enemySpeed),
        bulletSpeed: clampNumber(candidate.bulletSpeed, 2, 10, defaultGameConfig.bulletSpeed),
        enemySpawnWindow: Math.round(clampNumber(candidate.enemySpawnWindow, 40, 320, defaultGameConfig.enemySpawnWindow)),
        bulletInterval: Math.round(clampNumber(candidate.bulletInterval, 8, 50, defaultGameConfig.bulletInterval)),
        sensorDeadzone: clampNumber(candidate.sensorDeadzone, 0.1, 1.5, defaultGameConfig.sensorDeadzone)
    };
}

function loadGameConfig(){
    try {
        var storedConfig = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if(storedConfig){
            return normalizeGameConfig(JSON.parse(storedConfig));
        }
    } catch (error) {
        console.warn("Unable to load settings:", error);
    }
    return normalizeGameConfig(defaultGameConfig);
}

function saveGameConfig(){
    try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(gameConfig));
    } catch (error) {
        console.warn("Unable to save settings:", error);
    }
}

function randomEnemyDelay(){
    return Math.floor(Math.random() * gameConfig.enemySpawnWindow) + 20;
}

function triggerVibration(pattern){
    if(window.navigator && typeof window.navigator.vibrate === "function"){
        window.navigator.vibrate(pattern);
    }
}

function getDisplayScore(){
    return score + Math.floor(timer / 100);
}

function loadHighScore(){
    try {
        var storedHighScore = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
        if(storedHighScore !== null){
            var parsedHighScore = parseInt(storedHighScore, 10);
            if(!Number.isNaN(parsedHighScore) && parsedHighScore >= 0){
                return parsedHighScore;
            }
        }
    } catch (error) {
        console.warn("Unable to load high score:", error);
    }
    return 0;
}

function saveHighScore(value){
    try {
        window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value));
    } catch (error) {
        console.warn("Unable to save high score:", error);
    }
}

function updateHighScoreIfNeeded(displayScore){
    if(displayScore > highScore){
        highScore = displayScore;
        saveHighScore(highScore);
    }
}

function updateScoreText(){
    var displayScore = getDisplayScore();
    if(currentScoreElement){
        currentScoreElement.textContent = "현재 점수: " + displayScore;
    }
    if(highScoreElement){
        highScoreElement.textContent = "최고 점수: " + highScore;
    }
}

function resetInputState(){
    leftKey = false;
    upKey = false;
    rightKey = false;
    downKey = false;
}

function setGameOverVisible(isVisible){
    if(!gameOverLayer){
        return;
    }
    if(isVisible){
        gameOverLayer.classList.remove("hidden");
    }else{
        gameOverLayer.classList.add("hidden");
    }
}

function drawCrashEffect(){
    ctx.save();
    ctx.fillStyle = "rgba(255, 70, 70, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function updateSettingValueLabels(){
    if(playerSpeedValue){
        playerSpeedValue.textContent = gameConfig.playerSpeed + " px";
    }
    if(enemySpeedValue){
        enemySpeedValue.textContent = gameConfig.enemySpeed.toFixed(1) + " px";
    }
    if(bulletSpeedValue){
        bulletSpeedValue.textContent = gameConfig.bulletSpeed.toFixed(1) + " px";
    }
    if(enemySpawnValue){
        enemySpawnValue.textContent = gameConfig.enemySpawnWindow + " frame";
    }
    if(bulletIntervalValue){
        bulletIntervalValue.textContent = gameConfig.bulletInterval + " frame";
    }
    if(sensorDeadzoneValue){
        sensorDeadzoneValue.textContent = gameConfig.sensorDeadzone.toFixed(1) + " (낮을수록 민감)";
    }
}

function syncSettingInputs(){
    if(playerSpeedInput){
        playerSpeedInput.value = String(gameConfig.playerSpeed);
    }
    if(enemySpeedInput){
        enemySpeedInput.value = String(gameConfig.enemySpeed);
    }
    if(bulletSpeedInput){
        bulletSpeedInput.value = String(gameConfig.bulletSpeed);
    }
    if(enemySpawnInput){
        enemySpawnInput.value = String(gameConfig.enemySpawnWindow);
    }
    if(bulletIntervalInput){
        bulletIntervalInput.value = String(gameConfig.bulletInterval);
    }
    if(sensorDeadzoneInput){
        sensorDeadzoneInput.value = String(gameConfig.sensorDeadzone);
    }
    updateSettingValueLabels();
}

function applyLiveTimingChange(settingKey){
    if(gameStopped){
        return;
    }
    if(settingKey === "enemySpawnWindow"){
        nextEnemySpawnAt = timer + randomEnemyDelay();
    }
    if(settingKey === "bulletInterval"){
        nextBulletAt = timer + gameConfig.bulletInterval;
    }
}

function setSettingsPanelVisible(isVisible){
    if(!settingsPanel || !settingsToggleButton){
        return;
    }
    if(isVisible){
        settingsPanel.classList.remove("hidden");
        settingsToggleButton.textContent = "설정 닫기";
        resetInputState();
    }else{
        settingsPanel.classList.add("hidden");
        settingsToggleButton.textContent = "설정";
    }
}

function isSettingsInputFocused(){
    return Boolean(settingsPanel && settingsPanel.contains(document.activeElement));
}

function updateSingleSetting(settingKey, rawValue){
    var parsed = parseFloat(rawValue);
    if(Number.isNaN(parsed)){
        return;
    }
    var nextConfig = Object.assign({}, gameConfig);
    nextConfig[settingKey] = parsed;
    gameConfig = normalizeGameConfig(nextConfig);
    syncSettingInputs();
    saveGameConfig();
    applyLiveTimingChange(settingKey);
}

function bindSettingInput(inputElement, settingKey){
    if(!inputElement){
        return;
    }
    inputElement.addEventListener("input", function(){
        updateSingleSetting(settingKey, inputElement.value);
    });
}

function resetGameConfigToDefault(){
    gameConfig = normalizeGameConfig(defaultGameConfig);
    syncSettingInputs();
    saveGameConfig();
    nextEnemySpawnAt = timer + randomEnemyDelay();
    nextBulletAt = timer + gameConfig.bulletInterval;
}

function initializeSettingsUI(){
    syncSettingInputs();
    setSettingsPanelVisible(false);
    bindSettingInput(playerSpeedInput, "playerSpeed");
    bindSettingInput(enemySpeedInput, "enemySpeed");
    bindSettingInput(bulletSpeedInput, "bulletSpeed");
    bindSettingInput(enemySpawnInput, "enemySpawnWindow");
    bindSettingInput(bulletIntervalInput, "bulletInterval");
    bindSettingInput(sensorDeadzoneInput, "sensorDeadzone");

    if(settingsToggleButton){
        settingsToggleButton.addEventListener("click", function(){
            if(!settingsPanel){
                return;
            }
            var isCurrentlyHidden = settingsPanel.classList.contains("hidden");
            setSettingsPanelVisible(isCurrentlyHidden);
        });
    }

    if(settingsResetButton){
        settingsResetButton.addEventListener("click", resetGameConfigToDefault);
    }
}

function resetGameState(){
    timer = 0;
    score = 0;
    enemyArr = [];
    bulletArr = [];
    nextEnemySpawnAt = randomEnemyDelay();
    nextBulletAt = gameConfig.bulletInterval;
    Ship.x = shipStartX;
    Ship.y = shipStartY;
    gameStopped = false;
    resetInputState();
    updateScoreText();
    setGameOverVisible(false);
}

function FrameAction(){
    if(gameStopped){
        return;
    }

    animation = requestAnimationFrame(FrameAction);
    timer++;
    updateScoreText();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(timer >= nextEnemySpawnAt){
        var enemy = new Enemy();
        enemyArr.push(enemy);
        nextEnemySpawnAt = timer + randomEnemyDelay();
    }

    for(var i = enemyArr.length - 1; i >= 0; i--){
        var currentEnemy = enemyArr[i];
        currentEnemy.y += gameConfig.enemySpeed;
        currentEnemy.x += 3 * (2 - Math.floor(Math.random() * 5));

        if(currentEnemy.y > canvas.height){
            enemyArr.splice(i, 1);
            continue;
        }

        if(checkCrash(Ship, currentEnemy)){
            triggerVibration([500, 200, 500, 200, 500]);
            stopGame();
            return;
        }

        currentEnemy.draw();
    }

    if(timer >= nextBulletAt){
        var bullet = new Bullet();
        bulletArr.push(bullet);
        nextBulletAt = timer + gameConfig.bulletInterval;
    }

    for(var bulletIndex = bulletArr.length - 1; bulletIndex >= 0; bulletIndex--){
        var currentBullet = bulletArr[bulletIndex];
        currentBullet.y -= gameConfig.bulletSpeed;

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

    if(leftKey == true && Ship.x > 0){
        Ship.x -= gameConfig.playerSpeed;
    }
    if(rightKey == true && Ship.x < (canvas.width - Ship.width)){
        Ship.x += gameConfig.playerSpeed;
    }
    if(upKey == true && Ship.y > 0){
        Ship.y -= gameConfig.playerSpeed;
    }
    if(downKey == true && Ship.y < (canvas.height - Ship.height)){
        Ship.y += gameConfig.playerSpeed;
    }

    Ship.draw();
}

// Check crash between two rectangles
function checkCrash(ship, enemy){
    return ship.x < enemy.x + enemy.width &&
        ship.x + ship.width > enemy.x &&
        ship.y < enemy.y + enemy.height &&
        ship.y + ship.height > enemy.y;
}

function stopGame(){
    if(gameStopped){
        return;
    }

    gameStopped = true;
    cancelAnimationFrame(animation);
    animation = null;
    resetInputState();
    drawCrashEffect();

    if(gameOverRevealTimeout){
        window.clearTimeout(gameOverRevealTimeout);
    }
    gameOverRevealTimeout = window.setTimeout(function(){
        var finalScore = getDisplayScore();
        updateHighScoreIfNeeded(finalScore);
        updateScoreText();
        if(finalScoreElement){
            finalScoreElement.textContent = "최종 점수: " + finalScore;
        }
        setGameOverVisible(true);
    }, 160);
}

function startGame(){
    cancelAnimationFrame(animation);
    animation = null;
    if(gameOverRevealTimeout){
        window.clearTimeout(gameOverRevealTimeout);
        gameOverRevealTimeout = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resetGameState();
    Ship.draw();
    FrameAction();
}

function setKeyStateByKey(key, isPressed){
    switch(key){
        case "ArrowLeft":
            leftKey = isPressed;
            return true;
        case "ArrowUp":
            upKey = isPressed;
            return true;
        case "ArrowRight":
            rightKey = isPressed;
            return true;
        case "ArrowDown":
            downKey = isPressed;
            return true;
        default:
            return false;
    }
}

document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){
        setSettingsPanelVisible(false);
        return;
    }
    if(isSettingsInputFocused()){
        return;
    }
    if(setKeyStateByKey(e.key, true)){
        e.preventDefault();
    }
});

document.addEventListener("keyup", function(e){
    if(isSettingsInputFocused()){
        return;
    }
    if(setKeyStateByKey(e.key, false)){
        e.preventDefault();
    }
});

if(restartButton){
    restartButton.addEventListener("click", startGame);
}

function initializeGravitySensor(){
    if(!("GravitySensor" in window)){
        return;
    }
    try {
        let gravitySensor = new GravitySensor({frequency: 60});

        gravitySensor.addEventListener("reading", () => {
            if(gameStopped || isSettingsInputFocused()){
                return;
            }

            var sensorDeadzone = gameConfig.sensorDeadzone;
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

initializeSettingsUI();
initializeGravitySensor();
startGame();

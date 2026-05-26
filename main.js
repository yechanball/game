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

var stars = [];
var particles = [];
var gridScroll = 0;
var screenShake = 0;
var engineGlowPhase = 0;

function initVisualEffects(){
    stars = [];
    particles = [];
    gridScroll = 0;
    screenShake = 0;
    engineGlowPhase = 0;
    var starCount = Math.max(40, Math.floor((canvas.width * canvas.height) / 2200));
    for(var i = 0; i < starCount; i++){
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            depth: Math.random() * 0.85 + 0.15
        });
    }
}

function depthScale(y){
    return 0.72 + (y / canvas.height) * 0.45;
}

function drawArcadeBackground(){
    var w = canvas.width;
    var h = canvas.height;
    var horizonY = h * 0.32;
    var bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#050814");
    bgGrad.addColorStop(0.45, "#0a1230");
    bgGrad.addColorStop(1, "#17062f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    var nebula = ctx.createRadialGradient(w * 0.5, horizonY, 20, w * 0.5, horizonY * 0.6, w * 0.9);
    nebula.addColorStop(0, "rgba(120, 60, 255, 0.28)");
    nebula.addColorStop(1, "rgba(5, 8, 20, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);

    for(var s = 0; s < stars.length; s++){
        var star = stars[s];
        star.y += 0.35 + star.depth * 2.4;
        if(star.y > h){
            star.y = 0;
            star.x = Math.random() * w;
        }
        var size = star.depth * 2.2;
        var alpha = 0.25 + star.depth * 0.65;
        ctx.fillStyle = "rgba(210, 240, 255, " + alpha + ")";
        ctx.fillRect(star.x, star.y, size, size);
    }

    gridScroll = (gridScroll + 1.8) % 40;
    drawPerspectiveGrid(horizonY);
}

function drawPerspectiveGrid(horizonY){
    var w = canvas.width;
    var h = canvas.height;
    var vx = w * 0.5;
    var vy = horizonY;
    ctx.save();
    var rows = 12;
    for(var row = 0; row <= rows; row++){
        var t = row / rows;
        var eased = t * t;
        var y = vy + (h - vy) * eased;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 214, 0.2)";
        ctx.lineWidth = 1;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    var lanes = 7;
    for(var lane = 0; lane <= lanes; lane++){
        var lx = (lane / lanes) * w;
        ctx.beginPath();
        ctx.strokeStyle = lane % 2 === 0 ? "rgba(255, 45, 217, 0.22)" : "rgba(0, 255, 214, 0.18)";
        ctx.lineWidth = 1;
        ctx.moveTo(lx, h);
        ctx.lineTo(vx + (lx - vx) * 0.08, vy);
        ctx.stroke();
    }
    ctx.restore();
}

function spawnParticles(x, y, amount, palette){
    for(var i = 0; i < amount; i++){
        var angle = Math.random() * Math.PI * 2;
        var speed = 1 + Math.random() * 4.5;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20 + Math.floor(Math.random() * 22),
            size: 1 + Math.random() * 3.5,
            color: palette[Math.floor(Math.random() * palette.length)]
        });
    }
}

function updateAndDrawParticles(){
    for(var p = particles.length - 1; p >= 0; p--){
        var particle = particles[p];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.04;
        particle.life--;
        if(particle.life <= 0){
            particles.splice(p, 1);
            continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, particle.life / 18);
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function getShipTilt(){
    if(leftKey && !rightKey){
        return -1;
    }
    if(rightKey && !leftKey){
        return 1;
    }
    return 0;
}

function drawEngineTrail(ship){
    var cx = ship.x + ship.width / 2;
    var tailY = ship.y + ship.height - 2;
    engineGlowPhase += 0.35;
    var flicker = 0.6 + Math.sin(engineGlowPhase) * 0.25;
    var trail = ctx.createRadialGradient(cx, tailY + 8, 0, cx, tailY + 8, 18 * flicker);
    trail.addColorStop(0, "rgba(255, 130, 0, 0.85)");
    trail.addColorStop(0.5, "rgba(255, 50, 120, 0.35)");
    trail.addColorStop(1, "rgba(255, 50, 120, 0)");
    ctx.fillStyle = trail;
    ctx.fillRect(cx - 20, tailY - 4, 40, 28);
}

function drawPlayerShip(ship){
    var cx = ship.x + ship.width / 2;
    var cy = ship.y + ship.height / 2;
    var tilt = getShipTilt();
    drawEngineTrail(ship);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt * 0.22);
    ctx.shadowColor = "#00f6ff";
    ctx.shadowBlur = 14;
    var body = ctx.createLinearGradient(0, -ship.height / 2, 0, ship.height / 2);
    body.addColorStop(0, "#eaffff");
    body.addColorStop(0.35, "#44e8ff");
    body.addColorStop(1, "#0a4fb8");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -ship.height / 2);
    ctx.lineTo(-ship.width / 2, ship.height / 2);
    ctx.lineTo(-6, ship.height / 2 - 6);
    ctx.lineTo(0, ship.height / 2 - 2);
    ctx.lineTo(6, ship.height / 2 - 6);
    ctx.lineTo(ship.width / 2, ship.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(0, -2, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-ship.width / 2 + 2, ship.height / 2 - 1);
    ctx.lineTo(-ship.width / 2 - 5, ship.height / 2 + 6);
    ctx.moveTo(ship.width / 2 - 2, ship.height / 2 - 1);
    ctx.lineTo(ship.width / 2 + 5, ship.height / 2 + 6);
    ctx.stroke();
    ctx.restore();
}

function drawEnemyShip(enemy){
    var scale = depthScale(enemy.y);
    var w = enemy.width;
    var h = enemy.height;
    var cx = enemy.x + enemy.width / 2;
    var cy = enemy.y + enemy.height / 2;
    enemy.wobblePhase = (enemy.wobblePhase || 0) + 0.14;
    var wobble = Math.sin(enemy.wobblePhase) * 2.5;
    ctx.save();
    ctx.translate(cx + wobble, cy);
    ctx.scale(scale, scale);
    ctx.shadowColor = enemy.glowColor;
    ctx.shadowBlur = 12;
    var shell = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    shell.addColorStop(0, enemy.topColor);
    shell.addColorStop(1, enemy.bottomColor);
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, h / 4);
    ctx.lineTo(-w / 3, h / 2);
    ctx.lineTo(w / 3, h / 2);
    ctx.lineTo(w / 2, h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 200, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 6, h / 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPlasmaBullet(bullet){
    var cx = bullet.x + bullet.width / 2;
    var top = bullet.y - 6;
    var grad = ctx.createLinearGradient(cx, top, cx, bullet.y + bullet.height + 4);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.3, "#79f0ff");
    grad.addColorStop(1, "rgba(0, 210, 255, 0)");
    ctx.save();
    ctx.shadowColor = "#00e8ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 3, top, 6, bullet.height + 10);
    ctx.restore();
}

function spawnHitExplosion(enemy){
    var cx = enemy.x + enemy.width / 2;
    var cy = enemy.y + enemy.height / 2;
    spawnParticles(cx, cy, 14, ["#ff66cc", "#ffd166", "#ffffff"]);
}

function spawnCrashExplosion(ship){
    var cx = ship.x + ship.width / 2;
    var cy = ship.y + ship.height / 2;
    screenShake = 12;
    spawnParticles(cx, cy, 38, ["#ff3b3b", "#ff9f1c", "#ffe066", "#ffffff"]);
}

function getScreenShakeOffset(){
    if(screenShake <= 0.4){
        return {x: 0, y: 0};
    }
    return {
        x: (Math.random() - 0.5) * screenShake * 2,
        y: (Math.random() - 0.5) * screenShake * 2
    };
}

function decayScreenShake(){
    if(screenShake > 0){
        screenShake *= 0.82;
        if(screenShake < 0.4){
            screenShake = 0;
        }
    }
}

var Ship = {
    x : shipStartX,
    y : shipStartY,
    width : 30,
    height : 30,
    draw(){
        drawPlayerShip(this);
    }
};

class Bullet {
    constructor(){
        this.x = Ship.x + ((Ship.width - 6) / 2);
        this.y = Ship.y;
        this.width = 6;
        this.height = 14;
    }
    draw(){
        drawPlasmaBullet(this);
    }
}

class Enemy {
    constructor(){
        this.x = Math.floor(Math.random() * 10) * 30;
        this.y = 0;
        this.width = 30;
        this.height = 30;
        this.wobblePhase = Math.random() * Math.PI * 2;
        var palettes = [
            {top: "#ff7edb", bottom: "#b60068", glow: "#ff4fd8"},
            {top: "#ffc857", bottom: "#c45c00", glow: "#ffb347"},
            {top: "#9dff6a", bottom: "#239b2d", glow: "#7df95b"}
        ];
        var pick = palettes[Math.floor(Math.random() * palettes.length)];
        this.topColor = pick.top;
        this.bottomColor = pick.bottom;
        this.glowColor = pick.glow;
    }
    draw(){
        drawEnemyShip(this);
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
    spawnCrashExplosion(Ship);
    drawArcadeBackground();
    updateAndDrawParticles();
    ctx.save();
    ctx.fillStyle = "rgba(255, 70, 70, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var flash = ctx.createRadialGradient(
        Ship.x + Ship.width / 2,
        Ship.y + Ship.height / 2,
        0,
        Ship.x + Ship.width / 2,
        Ship.y + Ship.height / 2,
        90
    );
    flash.addColorStop(0, "rgba(255, 255, 255, 0.75)");
    flash.addColorStop(1, "rgba(255, 80, 80, 0)");
    ctx.fillStyle = flash;
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
    initVisualEffects();
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

    drawArcadeBackground();
    var shake = getScreenShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

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
            ctx.restore();
            updateAndDrawParticles();
            decayScreenShake();
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
                spawnHitExplosion(enemyArr[enemyIndex]);
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
    ctx.restore();
    updateAndDrawParticles();
    decayScreenShake();
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
    resetGameState();
    drawArcadeBackground();
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

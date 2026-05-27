var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var currentScoreElement = document.getElementById('current-score');
var highScoreElement = document.getElementById('high-score');
var scoreHud = document.getElementById('score-hud');
var titleScreen = document.getElementById('title-screen');
var scoresScreen = document.getElementById('scores-screen');
var scoresHighScoreElement = document.getElementById('scores-high-score');
var scoresDifficultyElement = document.getElementById('scores-difficulty');
var menuStartButton = document.getElementById('menu-start');
var menuSettingsButton = document.getElementById('menu-settings');
var menuScoresButton = document.getElementById('menu-scores');
var scoresBackButton = document.getElementById('scores-back');
var gameOverLayer = document.getElementById('game-over');
var finalScoreElement = document.getElementById('final-score');
var restartButton = document.getElementById('restart-button');
var gameOverMenuButton = document.getElementById('gameover-menu-button');
var settingsPanel = document.getElementById('settings-panel');
var settingsBackButton = document.getElementById('settings-back');
var settingsResetButton = document.getElementById('settings-reset');
var controlModeSelect = document.getElementById('control-mode-select');
var difficultySelect = document.getElementById('difficulty-select');
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

var SETTINGS_STORAGE_KEY = "galaga-game-settings-v3";
var HIGH_SCORE_STORAGE_KEY = "galaga-high-score-v1";
var DEFAULT_DIFFICULTY = "easy";
var DIFFICULTY_LABELS = {
    easy: "Easy",
    normal: "Normal",
    hard: "Hard",
    veryHard: "Very Hard",
    hell: "Hell"
};
var DIFFICULTY_PRESETS = {
    easy: {
        playerSpeed: 3,
        enemySpeed: 1.6,
        bulletSpeed: 4,
        enemySpawnWindow: 260,
        bulletInterval: 30
    },
    normal: {
        playerSpeed: 3,
        enemySpeed: 2.2,
        bulletSpeed: 4.2,
        enemySpawnWindow: 200,
        bulletInterval: 25
    },
    hard: {
        playerSpeed: 3,
        enemySpeed: 2.9,
        bulletSpeed: 4.8,
        enemySpawnWindow: 150,
        bulletInterval: 20
    },
    veryHard: {
        playerSpeed: 2.5,
        enemySpeed: 3.6,
        bulletSpeed: 5.2,
        enemySpawnWindow: 110,
        bulletInterval: 16
    },
    hell: {
        playerSpeed: 2,
        enemySpeed: 4.5,
        bulletSpeed: 5.8,
        enemySpawnWindow: 70,
        bulletInterval: 12
    }
};
var defaultGameConfig = Object.assign({
    difficulty: DEFAULT_DIFFICULTY,
    controlMode: "touch",
    sensorDeadzone: 0.5
}, DIFFICULTY_PRESETS[DEFAULT_DIFFICULTY]);

var gameConfig = loadGameConfig();

var shipStartX = 0;
var shipStartY = 0;

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
var gamePhase = "menu";
var menuAnimation = null;
var takeoffAnimation = null;
var takeoffProgress = 0;
var menuShipBob = 0;

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

function isValidDifficulty(difficultyId){
    return Boolean(difficultyId && DIFFICULTY_PRESETS[difficultyId]);
}

function normalizeGameConfig(rawConfig){
    var candidate = rawConfig || {};
    var difficultyId = isValidDifficulty(candidate.difficulty) ? candidate.difficulty : DEFAULT_DIFFICULTY;
    var preset = DIFFICULTY_PRESETS[difficultyId];
    return {
        difficulty: difficultyId,
        playerSpeed: Math.round(clampNumber(candidate.playerSpeed, 1, 8, preset.playerSpeed)),
        enemySpeed: clampNumber(candidate.enemySpeed, 1, 6, preset.enemySpeed),
        bulletSpeed: clampNumber(candidate.bulletSpeed, 2, 10, preset.bulletSpeed),
        enemySpawnWindow: Math.round(clampNumber(candidate.enemySpawnWindow, 40, 320, preset.enemySpawnWindow)),
        bulletInterval: Math.round(clampNumber(candidate.bulletInterval, 8, 50, preset.bulletInterval)),
        sensorDeadzone: clampNumber(candidate.sensorDeadzone, 0.1, 1.5, defaultGameConfig.sensorDeadzone),
        controlMode: candidate.controlMode === "sensor" ? "sensor" : "touch"
    };
}

function applyDifficultyPreset(difficultyId, shouldSave){
    if(!isValidDifficulty(difficultyId)){
        difficultyId = DEFAULT_DIFFICULTY;
    }
    var preset = DIFFICULTY_PRESETS[difficultyId];
    gameConfig = normalizeGameConfig(Object.assign({}, gameConfig, preset, {
        difficulty: difficultyId
    }));
    syncSettingInputs();
    if(shouldSave !== false){
        saveGameConfig();
    }
    if(gamePhase === "playing" && !gameStopped){
        nextEnemySpawnAt = timer + randomEnemyDelay();
        nextBulletAt = timer + gameConfig.bulletInterval;
    }
}

function getDifficultyLabel(difficultyId){
    return DIFFICULTY_LABELS[difficultyId] || DIFFICULTY_LABELS[DEFAULT_DIFFICULTY];
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
    if(window.Gameplay){
        Gameplay.clearTouch();
    }
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
    if(controlModeSelect){
        controlModeSelect.value = gameConfig.controlMode;
    }
    if(difficultySelect){
        difficultySelect.value = gameConfig.difficulty;
    }
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

function setElementVisible(element, isVisible){
    if(!element){
        return;
    }
    if(isVisible){
        element.classList.remove("hidden");
    }else{
        element.classList.add("hidden");
    }
}

function setScoreHudVisible(isVisible){
    setElementVisible(scoreHud, isVisible);
}

function setTitleScreenVisible(isVisible){
    setElementVisible(titleScreen, isVisible);
}

function setScoresScreenVisible(isVisible){
    setElementVisible(scoresScreen, isVisible);
}

function setSettingsPanelVisible(isVisible){
    if(!settingsPanel){
        return;
    }
    if(isVisible){
        settingsPanel.classList.remove("hidden");
        resetInputState();
    }else{
        settingsPanel.classList.add("hidden");
    }
}

function updateScoresScreenText(){
    if(scoresHighScoreElement){
        scoresHighScoreElement.textContent = "최고 점수: " + highScore;
    }
    if(scoresDifficultyElement){
        scoresDifficultyElement.textContent = "현재 난이도: " + getDifficultyLabel(gameConfig.difficulty);
    }
}

function openScoresScreen(){
    updateScoresScreenText();
    setTitleScreenVisible(false);
    setScoresScreenVisible(true);
    setSettingsPanelVisible(false);
}

function openSettingsScreen(){
    setTitleScreenVisible(false);
    setScoresScreenVisible(false);
    setSettingsPanelVisible(true);
}

function returnToTitleScreen(){
    cancelAnimationFrame(menuAnimation);
    cancelAnimationFrame(takeoffAnimation);
    cancelAnimationFrame(animation);
    menuAnimation = null;
    takeoffAnimation = null;
    animation = null;
    gamePhase = "menu";
    gameStopped = true;
    resetInputState();
    setGameOverVisible(false);
    setScoresScreenVisible(false);
    setSettingsPanelVisible(false);
    setScoreHudVisible(false);
    setTitleScreenVisible(true);
    initVisualEffects();
    startMenuLoop();
}

function easeOutCubic(value){
    var t = Math.min(1, Math.max(0, value));
    return 1 - Math.pow(1 - t, 3);
}

function drawMenuPreviewShip(){
    menuShipBob += 0.06;
    var previewX = canvas.width / 2 - Ship.width / 2;
    var previewY = canvas.height - 78 + Math.sin(menuShipBob) * 4;
    var previousX = Ship.x;
    var previousY = Ship.y;
    Ship.x = previewX;
    Ship.y = previewY;
    drawPlayerShip(Ship);
    Ship.x = previousX;
    Ship.y = previousY;
}

function menuFrame(){
    if(gamePhase !== "menu"){
        return;
    }
    menuAnimation = requestAnimationFrame(menuFrame);
    drawArcadeBackground();
    drawMenuPreviewShip();
}

function startMenuLoop(){
    cancelAnimationFrame(menuAnimation);
    menuAnimation = null;
    if(gamePhase !== "menu"){
        return;
    }
    initVisualEffects();
    menuFrame();
}

function startTakeoffSequence(){
    if(gamePhase === "takeoff" || gamePhase === "playing"){
        return;
    }
    cancelAnimationFrame(menuAnimation);
    menuAnimation = null;
    setTitleScreenVisible(false);
    setScoresScreenVisible(false);
    setSettingsPanelVisible(false);
    setGameOverVisible(false);
    setScoreHudVisible(false);
    gamePhase = "takeoff";
    gameStopped = true;
    takeoffProgress = 0;
    timer = 0;
    score = 0;
    enemyArr = [];
    bulletArr = [];
    if(window.Gameplay){
        Gameplay.resetCombatState();
    }
    resetInputState();
    initVisualEffects();
    shipStartX = canvas.width / 2 - Ship.width / 2;
    shipStartY = canvas.height - 56;
    Ship.x = shipStartX;
    Ship.y = canvas.height + 50;
    cancelAnimationFrame(takeoffAnimation);
    takeoffFrame();
}

function takeoffFrame(){
    if(gamePhase !== "takeoff"){
        return;
    }
    takeoffAnimation = requestAnimationFrame(takeoffFrame);
    gridScroll = (gridScroll + 3.4) % 40;
    drawArcadeBackground();
    takeoffProgress = Math.min(1, takeoffProgress + 0.018);
    var startY = canvas.height + 50;
    shipStartY = canvas.height - 56;
    Ship.y = startY - (startY - shipStartY) * easeOutCubic(takeoffProgress);
    drawPlayerShip(Ship);
    if(takeoffProgress >= 1){
        Ship.y = shipStartY;
        cancelAnimationFrame(takeoffAnimation);
        takeoffAnimation = null;
        beginGameplay();
    }
}

function beginGameplay(){
    resetGameState();
    gamePhase = "playing";
    setScoreHudVisible(true);
    FrameAction();
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
    applyDifficultyPreset(DEFAULT_DIFFICULTY, false);
    gameConfig.sensorDeadzone = defaultGameConfig.sensorDeadzone;
    gameConfig.controlMode = defaultGameConfig.controlMode;
    gameConfig = normalizeGameConfig(gameConfig);
    syncSettingInputs();
    saveGameConfig();
    if(gamePhase === "playing" && !gameStopped){
        nextEnemySpawnAt = timer + randomEnemyDelay();
        nextBulletAt = timer + gameConfig.bulletInterval;
    }
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

    if(controlModeSelect){
        controlModeSelect.addEventListener("change", function(){
            gameConfig.controlMode = controlModeSelect.value === "sensor" ? "sensor" : "touch";
            saveGameConfig();
            resetInputState();
        });
    }

    if(difficultySelect){
        difficultySelect.addEventListener("change", function(){
            applyDifficultyPreset(difficultySelect.value, true);
        });
    }

    if(menuStartButton){
        menuStartButton.addEventListener("click", startTakeoffSequence);
    }
    if(menuSettingsButton){
        menuSettingsButton.addEventListener("click", openSettingsScreen);
    }
    if(menuScoresButton){
        menuScoresButton.addEventListener("click", openScoresScreen);
    }
    if(scoresBackButton){
        scoresBackButton.addEventListener("click", function(){
            setScoresScreenVisible(false);
            setTitleScreenVisible(true);
        });
    }
    if(settingsBackButton){
        settingsBackButton.addEventListener("click", function(){
            setSettingsPanelVisible(false);
            setTitleScreenVisible(true);
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
    if(window.Gameplay){
        Gameplay.resetCombatState();
    }
    nextEnemySpawnAt = randomEnemyDelay();
    nextBulletAt = gameConfig.bulletInterval;
    shipStartX = canvas.width / 2 - Ship.width / 2;
    shipStartY = canvas.height - 56;
    Ship.x = shipStartX;
    Ship.y = shipStartY;
    gameStopped = false;
    resetInputState();
    initVisualEffects();
    updateScoreText();
    setGameOverVisible(false);
}

function FrameAction(){
    if(gamePhase !== "playing" || gameStopped){
        return;
    }

    animation = requestAnimationFrame(FrameAction);
    timer++;
    updateScoreText();
    if(window.Gameplay){
        Gameplay.updatePowerupTimers();
    }

    drawArcadeBackground();
    var shake = getScreenShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    if(timer >= nextEnemySpawnAt && window.Gameplay){
        var spawnType = Gameplay.pickSpawnType();
        enemyArr.push(Gameplay.createEnemy(spawnType));
        nextEnemySpawnAt = timer + randomEnemyDelay();
    }

    if(window.Gameplay){
        var enemyResult = Gameplay.updateEnemies();
        if(enemyResult === "crash"){
            triggerVibration([500, 200, 500, 200, 500]);
            ctx.restore();
            updateAndDrawParticles();
            decayScreenShake();
            stopGame();
            return;
        }
        var bulletResult = Gameplay.updateEnemyBullets();
        if(bulletResult === "crash"){
            triggerVibration([500, 200, 500, 200, 500]);
            ctx.restore();
            updateAndDrawParticles();
            decayScreenShake();
            stopGame();
            return;
        }
        Gameplay.updateItems();
    }

    if(timer >= nextBulletAt && window.Gameplay){
        Gameplay.spawnPlayerBullets();
        nextBulletAt = timer + Gameplay.getFireInterval();
    }

    if(window.Gameplay){
        Gameplay.updatePlayerBullets();
        Gameplay.applyMovementKeys();
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

    gamePhase = "gameover";
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

function restartFromGameOver(){
    if(gameOverRevealTimeout){
        window.clearTimeout(gameOverRevealTimeout);
        gameOverRevealTimeout = null;
    }
    setGameOverVisible(false);
    startTakeoffSequence();
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
        if(settingsPanel && !settingsPanel.classList.contains("hidden")){
            setSettingsPanelVisible(false);
            setTitleScreenVisible(true);
            return;
        }
        if(scoresScreen && !scoresScreen.classList.contains("hidden")){
            setScoresScreenVisible(false);
            setTitleScreenVisible(true);
            return;
        }
        return;
    }
    if(gamePhase !== "playing"){
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
    if(gamePhase !== "playing"){
        return;
    }
    if(isSettingsInputFocused()){
        return;
    }
    if(setKeyStateByKey(e.key, false)){
        e.preventDefault();
    }
});

if(restartButton){
    restartButton.addEventListener("click", restartFromGameOver);
}
if(gameOverMenuButton){
    gameOverMenuButton.addEventListener("click", returnToTitleScreen);
}

function initializeGravitySensor(){
    if(!("GravitySensor" in window)){
        return;
    }
    try {
        let gravitySensor = new GravitySensor({frequency: 60});

        gravitySensor.addEventListener("reading", () => {
            if(gamePhase !== "playing" || gameStopped || isSettingsInputFocused()){
                return;
            }
            if(gameConfig.controlMode !== "sensor"){
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

window.canvas = canvas;
window.ctx = ctx;
window.Ship = Ship;
window.shipStartX = shipStartX;
window.shipStartY = shipStartY;

if(window.Gameplay){
    Gameplay.resizeCanvas();
    shipStartX = canvas.width / 2 - Ship.width / 2;
    shipStartY = canvas.height - 56;
    Ship.x = shipStartX;
    Ship.y = shipStartY;
    Gameplay.initTouchControls();
}

initializeSettingsUI();
initializeGravitySensor();
updateScoreText();
returnToTitleScreen();

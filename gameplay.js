/* Gameplay systems: enemies, bosses, items, touch, resize */
(function(){
    if(typeof window === "undefined"){
        return;
    }

    window.Gameplay = {
        enemyBulletArr: [],
        itemArr: [],
        killCount: 0,
        bossActive: false,
        touchLeft: false,
        touchRight: false,
        activePointerId: null,
        playerPowerups: {
            bulletType: "normal",
            bulletCount: 1,
            fireIntervalMul: 1,
            speedMul: 1,
            enemySlowMul: 1,
            timers: {}
        },

        ITEM_TYPES: ["spread", "laser", "rapid", "speed", "slow"],
        ITEM_LABELS: {
            spread: "분산탄",
            laser: "레이저",
            rapid: "연사",
            speed: "가속",
            slow: "감속장"
        },

        MIDBOSS_SCORE: { easy: 40, normal: 70, hard: 110, veryHard: 160, hell: 220 },
        BOSS_SCORE: { easy: 200, normal: 350, hard: 520, veryHard: 780, hell: 1100 },
        MIDBOSS_HP: { easy: 4, normal: 6, hard: 9, veryHard: 12, hell: 16 },
        BOSS_HP: { easy: 18, normal: 28, hard: 40, veryHard: 55, hell: 75 },

        SPAWN_WEIGHTS: {
            easy: { grunt: 0.9, midBoss: 0.1, boss: 0 },
            normal: { grunt: 0.82, midBoss: 0.14, boss: 0.04 },
            hard: { grunt: 0.72, midBoss: 0.2, boss: 0.08 },
            veryHard: { grunt: 0.62, midBoss: 0.26, boss: 0.12 },
            hell: { grunt: 0.52, midBoss: 0.3, boss: 0.18 }
        },

        resizeCanvas: function(){
            var canvas = window.canvas;
            if(!canvas){
                return;
            }
            var w = Math.floor(window.innerWidth);
            var h = Math.floor(window.innerHeight);
            if(window.visualViewport){
                w = Math.floor(window.visualViewport.width);
                h = Math.floor(window.visualViewport.height);
            }
            canvas.width = Math.max(280, w);
            canvas.height = Math.max(400, h);
            window.shipStartX = canvas.width / 2 - 15;
            window.shipStartY = canvas.height - 56;
            if(window.Ship){
                if(window.gamePhase === "menu" || window.gamePhase === "takeoff"){
                    window.Ship.x = window.shipStartX;
                }
                if(window.gamePhase === "playing"){
                    window.Ship.x = Math.min(window.Ship.x, canvas.width - window.Ship.width);
                    window.Ship.y = Math.min(window.Ship.y, canvas.height - window.Ship.height);
                }
            }
        },

        resetCombatState: function(){
            this.enemyBulletArr = [];
            this.itemArr = [];
            this.killCount = 0;
            this.bossActive = false;
            this.touchLeft = false;
            this.touchRight = false;
            this.activePointerId = null;
            this.playerPowerups = {
                bulletType: "normal",
                bulletCount: 1,
                fireIntervalMul: 1,
                speedMul: 1,
                enemySlowMul: 1,
                timers: {}
            };
        },

        getEffectivePlayerSpeed: function(){
            return window.gameConfig.playerSpeed * this.playerPowerups.speedMul;
        },

        getEffectiveEnemySpeed: function(){
            return window.gameConfig.enemySpeed * this.playerPowerups.enemySlowMul;
        },

        getFireInterval: function(){
            return Math.max(6, Math.round(window.gameConfig.bulletInterval * this.playerPowerups.fireIntervalMul));
        },

        pickSpawnType: function(){
            var weights = this.SPAWN_WEIGHTS[window.gameConfig.difficulty] || this.SPAWN_WEIGHTS.easy;
            var roll = Math.random();
            var type = "grunt";
            if(roll < weights.grunt){
                type = "grunt";
            }else if(roll < weights.grunt + weights.midBoss){
                type = "midBoss";
            }else{
                type = "boss";
            }
            if(type === "boss" && this.bossActive){
                type = "midBoss";
            }
            return type;
        },

        randomSpawnX: function(width){
            var cols = Math.max(1, Math.floor((window.canvas.width - width) / 30));
            return Math.floor(Math.random() * (cols + 1)) * 30;
        },

        createEnemy: function(type){
            var difficulty = window.gameConfig.difficulty;
            var enemy = {
                type: type,
                wobblePhase: Math.random() * Math.PI * 2,
                direction: Math.random() < 0.5 ? -1 : 1,
                nextShotAt: window.timer + 80 + Math.floor(Math.random() * 60)
            };
            if(type === "boss"){
                enemy.width = 68;
                enemy.height = 52;
                enemy.x = window.canvas.width / 2 - enemy.width / 2;
                enemy.y = 36;
                enemy.maxHp = this.BOSS_HP[difficulty] || 28;
                enemy.hp = enemy.maxHp;
                enemy.moveSpeed = 1.6 + (difficulty === "hell" ? 1.2 : difficulty === "veryHard" ? 0.8 : 0.4);
                enemy.shootInterval = difficulty === "hell" ? 38 : difficulty === "veryHard" ? 48 : difficulty === "hard" ? 58 : 70;
                enemy.topColor = "#ff8a5b";
                enemy.bottomColor = "#8b1035";
                enemy.glowColor = "#ff5a5a";
                enemy.scoreValue = this.BOSS_SCORE[difficulty] || 350;
                enemy.dropChance = 0.75;
                this.bossActive = true;
            }else if(type === "midBoss"){
                enemy.width = 46;
                enemy.height = 46;
                enemy.x = this.randomSpawnX(enemy.width);
                enemy.y = -enemy.height;
                enemy.maxHp = this.MIDBOSS_HP[difficulty] || 6;
                enemy.hp = enemy.maxHp;
                enemy.moveSpeed = 0;
                enemy.shootInterval = 0;
                enemy.topColor = "#ffd166";
                enemy.bottomColor = "#c45c00";
                enemy.glowColor = "#ffb347";
                enemy.scoreValue = this.MIDBOSS_SCORE[difficulty] || 70;
                enemy.dropChance = 0.4;
            }else{
                enemy.width = 30;
                enemy.height = 30;
                enemy.x = this.randomSpawnX(enemy.width);
                enemy.y = -enemy.height;
                enemy.maxHp = 1;
                enemy.hp = 1;
                enemy.moveSpeed = 0;
                enemy.shootInterval = 0;
                var palettes = [
                    {top: "#ff7edb", bottom: "#b60068", glow: "#ff4fd8"},
                    {top: "#9dff6a", bottom: "#239b2d", glow: "#7df95b"},
                    {top: "#7ecbff", bottom: "#1f4f9c", glow: "#5ec8ff"}
                ];
                var pick = palettes[Math.floor(Math.random() * palettes.length)];
                enemy.topColor = pick.top;
                enemy.bottomColor = pick.bottom;
                enemy.glowColor = pick.glow;
                enemy.scoreValue = 1;
                enemy.dropChance = 0.14;
            }
            return enemy;
        },

        spawnEnemyBullet: function(boss){
            var cx = boss.x + boss.width / 2;
            this.enemyBulletArr.push({
                x: cx - 4,
                y: boss.y + boss.height,
                width: 8,
                height: 14,
                speed: 3.2 + (window.gameConfig.difficulty === "hell" ? 1.4 : 0.6)
            });
        },

        spawnPlayerBullets: function(){
            var Ship = window.Ship;
            var bulletType = this.playerPowerups.bulletType;
            var count = this.playerPowerups.bulletCount;
            if(bulletType === "spread"){
                count = 3;
            }
            var offsets = count === 3 ? [-12, 0, 12] : [0];
            for(var i = 0; i < offsets.length; i++){
                var bullet = {
                    x: Ship.x + (Ship.width - 6) / 2 + offsets[i],
                    y: Ship.y,
                    width: bulletType === "laser" ? 10 : 6,
                    height: bulletType === "laser" ? 22 : 14,
                    type: bulletType,
                    speed: bulletType === "laser" ? window.gameConfig.bulletSpeed + 2 : window.gameConfig.bulletSpeed
                };
                window.bulletArr.push(bullet);
            }
        },

        drawPlayerBullet: function(bullet){
            if(bullet.type === "laser"){
                var cx = bullet.x + bullet.width / 2;
                var grad = window.ctx.createLinearGradient(cx, bullet.y - 8, cx, bullet.y + bullet.height);
                grad.addColorStop(0, "#ffffff");
                grad.addColorStop(0.4, "#ff79f7");
                grad.addColorStop(1, "rgba(255, 60, 180, 0)");
                window.ctx.save();
                window.ctx.shadowColor = "#ff4fd8";
                window.ctx.shadowBlur = 14;
                window.ctx.fillStyle = grad;
                window.ctx.fillRect(bullet.x, bullet.y - 8, bullet.width, bullet.height + 8);
                window.ctx.restore();
            }else{
                window.drawPlasmaBullet(bullet);
            }
        },

        drawEnemyHpBar: function(enemy){
            if(!enemy.maxHp || enemy.hp >= enemy.maxHp){
                return;
            }
            var pct = Math.max(0, enemy.hp / enemy.maxHp);
            window.ctx.fillStyle = "rgba(0,0,0,0.55)";
            window.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 5);
            window.ctx.fillStyle = enemy.type === "boss" ? "#ff4466" : "#ffcc33";
            window.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * pct, 5);
        },

        drawEnemyEntity: function(enemy){
            if(enemy.type === "boss"){
                window.ctx.save();
                window.ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                window.ctx.shadowColor = enemy.glowColor;
                window.ctx.shadowBlur = 18;
                var shell = window.ctx.createLinearGradient(0, -enemy.height / 2, 0, enemy.height / 2);
                shell.addColorStop(0, enemy.topColor);
                shell.addColorStop(1, enemy.bottomColor);
                window.ctx.fillStyle = shell;
                window.ctx.beginPath();
                window.ctx.moveTo(-enemy.width / 2, enemy.height / 4);
                window.ctx.lineTo(-enemy.width / 2 + 10, enemy.height / 2);
                window.ctx.lineTo(enemy.width / 2 - 10, enemy.height / 2);
                window.ctx.lineTo(enemy.width / 2, enemy.height / 4);
                window.ctx.lineTo(enemy.width / 3, -enemy.height / 2);
                window.ctx.lineTo(0, -enemy.height / 2 + 8);
                window.ctx.lineTo(-enemy.width / 3, -enemy.height / 2);
                window.ctx.closePath();
                window.ctx.fill();
                window.ctx.fillStyle = "rgba(255,220,255,0.85)";
                window.ctx.beginPath();
                window.ctx.ellipse(0, 0, enemy.width / 5, enemy.height / 6, 0, 0, Math.PI * 2);
                window.ctx.fill();
                window.ctx.restore();
            }else{
                window.drawEnemyShip(enemy);
            }
            this.drawEnemyHpBar(enemy);
        },

        drawEnemyBullet: function(bullet){
            var cx = bullet.x + bullet.width / 2;
            window.ctx.save();
            window.ctx.shadowColor = "#ff4466";
            window.ctx.shadowBlur = 10;
            var grad = window.ctx.createLinearGradient(cx, bullet.y, cx, bullet.y + bullet.height);
            grad.addColorStop(0, "rgba(255,120,120,0)");
            grad.addColorStop(0.4, "#ff5555");
            grad.addColorStop(1, "#ffffff");
            window.ctx.fillStyle = grad;
            window.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            window.ctx.restore();
        },

        drawItem: function(item){
            var cx = item.x + item.width / 2;
            var cy = item.y + item.height / 2;
            window.ctx.save();
            window.ctx.translate(cx, cy);
            window.ctx.rotate(Math.sin(item.spin) * 0.2);
            window.ctx.shadowColor = "#ffe066";
            window.ctx.shadowBlur = 12;
            window.ctx.fillStyle = "rgba(255, 220, 80, 0.25)";
            window.ctx.beginPath();
            window.ctx.arc(0, 0, item.width / 2 + 2, 0, Math.PI * 2);
            window.ctx.fill();
            window.ctx.fillStyle = "#ffe066";
            window.ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
            window.ctx.fillStyle = "#1a1030";
            window.ctx.font = "bold 9px Orbitron, sans-serif";
            window.ctx.textAlign = "center";
            window.ctx.textBaseline = "middle";
            window.ctx.fillText(item.label.charAt(0), 0, 1);
            window.ctx.restore();
        },

        trySpawnItem: function(enemy){
            if(Math.random() > enemy.dropChance){
                return;
            }
            var type = this.ITEM_TYPES[Math.floor(Math.random() * this.ITEM_TYPES.length)];
            this.itemArr.push({
                x: enemy.x + enemy.width / 2 - 11,
                y: enemy.y + enemy.height / 2,
                width: 22,
                height: 22,
                type: type,
                label: this.ITEM_LABELS[type],
                speed: 1.8,
                spin: Math.random() * Math.PI * 2
            });
        },

        setPowerupTimer: function(key, frames){
            this.playerPowerups.timers[key] = window.timer + frames;
        },

        clearPowerup: function(key){
            delete this.playerPowerups.timers[key];
            if(key === "spread"){
                if(this.playerPowerups.bulletType === "spread"){
                    this.playerPowerups.bulletType = "normal";
                    this.playerPowerups.bulletCount = 1;
                }
            }else if(key === "laser"){
                if(this.playerPowerups.bulletType === "laser"){
                    this.playerPowerups.bulletType = "normal";
                }
            }else if(key === "rapid"){
                this.playerPowerups.fireIntervalMul = 1;
            }else if(key === "speed"){
                this.playerPowerups.speedMul = 1;
            }else if(key === "slow"){
                this.playerPowerups.enemySlowMul = 1;
            }
        },

        updatePowerupTimers: function(){
            var timers = this.playerPowerups.timers;
            for(var key in timers){
                if(timers.hasOwnProperty(key) && window.timer >= timers[key]){
                    this.clearPowerup(key);
                }
            }
        },

        applyItemEffect: function(type){
            switch(type){
                case "spread":
                    this.playerPowerups.bulletType = "spread";
                    this.playerPowerups.bulletCount = 3;
                    this.setPowerupTimer("spread", 480);
                    break;
                case "laser":
                    this.playerPowerups.bulletType = "laser";
                    this.playerPowerups.bulletCount = 1;
                    this.setPowerupTimer("laser", 480);
                    break;
                case "rapid":
                    this.playerPowerups.fireIntervalMul = 0.42;
                    this.setPowerupTimer("rapid", 420);
                    break;
                case "speed":
                    this.playerPowerups.speedMul = 1.55;
                    this.setPowerupTimer("speed", 480);
                    break;
                case "slow":
                    this.playerPowerups.enemySlowMul = 0.5;
                    this.setPowerupTimer("slow", 480);
                    break;
                default:
                    break;
            }
        },

        damageEnemy: function(enemy){
            enemy.hp -= 1;
            if(enemy.hp > 0){
                return false;
            }
            window.score += enemy.scoreValue || 1;
            this.killCount++;
            window.spawnHitExplosion(enemy);
            this.trySpawnItem(enemy);
            if(enemy.type === "boss"){
                this.bossActive = false;
            }
            return true;
        },

        handleEnemyDestroyed: function(enemy, index){
            window.enemyArr.splice(index, 1);
        },

        updateBoss: function(enemy){
            enemy.x += enemy.moveSpeed * enemy.direction;
            if(enemy.x <= 4){
                enemy.x = 4;
                enemy.direction = 1;
            }else if(enemy.x + enemy.width >= window.canvas.width - 4){
                enemy.x = window.canvas.width - 4 - enemy.width;
                enemy.direction = -1;
            }
            enemy.y = Math.min(enemy.y, 48);
            if(window.timer >= enemy.nextShotAt){
                this.spawnEnemyBullet(enemy);
                enemy.nextShotAt = window.timer + enemy.shootInterval;
            }
        },

        updateEnemies: function(){
            var speed = this.getEffectiveEnemySpeed();
            for(var i = window.enemyArr.length - 1; i >= 0; i--){
                var enemy = window.enemyArr[i];
                if(enemy.type === "boss"){
                    this.updateBoss(enemy);
                }else{
                    enemy.y += speed * (enemy.type === "midBoss" ? 0.75 : 1);
                    if(enemy.type === "grunt"){
                        enemy.x += 3 * (2 - Math.floor(Math.random() * 5));
                        enemy.x = Math.max(0, Math.min(enemy.x, window.canvas.width - enemy.width));
                    }
                    enemy.wobblePhase = (enemy.wobblePhase || 0) + 0.14;
                }
                if(enemy.type !== "boss" && enemy.y > window.canvas.height){
                    if(enemy.type === "boss"){
                        this.bossActive = false;
                    }
                    window.enemyArr.splice(i, 1);
                    continue;
                }
                if(window.checkCrash(window.Ship, enemy)){
                    return "crash";
                }
                this.drawEnemyEntity(enemy);
            }
            return null;
        },

        updateEnemyBullets: function(){
            for(var i = this.enemyBulletArr.length - 1; i >= 0; i--){
                var bullet = this.enemyBulletArr[i];
                bullet.y += bullet.speed;
                if(bullet.y > window.canvas.height){
                    this.enemyBulletArr.splice(i, 1);
                    continue;
                }
                if(window.checkCrash(window.Ship, bullet)){
                    return "crash";
                }
                this.drawEnemyBullet(bullet);
            }
            return null;
        },

        updateItems: function(){
            for(var i = this.itemArr.length - 1; i >= 0; i--){
                var item = this.itemArr[i];
                item.y += item.speed;
                item.spin += 0.1;
                if(item.y > window.canvas.height){
                    this.itemArr.splice(i, 1);
                    continue;
                }
                if(window.checkCrash(window.Ship, item)){
                    this.applyItemEffect(item.type);
                    window.triggerVibration([60, 40, 60]);
                    this.itemArr.splice(i, 1);
                    continue;
                }
                this.drawItem(item);
            }
        },

        updatePlayerBullets: function(){
            for(var bulletIndex = window.bulletArr.length - 1; bulletIndex >= 0; bulletIndex--){
                var currentBullet = window.bulletArr[bulletIndex];
                currentBullet.y -= currentBullet.speed || window.gameConfig.bulletSpeed;
                if(currentBullet.y < 0){
                    window.bulletArr.splice(bulletIndex, 1);
                    continue;
                }
                var hitEnemy = false;
                for(var enemyIndex = window.enemyArr.length - 1; enemyIndex >= 0; enemyIndex--){
                    if(window.checkCrash(currentBullet, window.enemyArr[enemyIndex])){
                        window.triggerVibration([100]);
                        var enemy = window.enemyArr[enemyIndex];
                        if(this.damageEnemy(enemy)){
                            this.handleEnemyDestroyed(enemy, enemyIndex);
                        }
                        window.bulletArr.splice(bulletIndex, 1);
                        hitEnemy = true;
                        break;
                    }
                }
                if(!hitEnemy){
                    this.drawPlayerBullet(currentBullet);
                }
            }
        },

        applyTouchFromEvent: function(clientX){
            var rect = window.canvas.getBoundingClientRect();
            var ratio = window.canvas.width / rect.width;
            var canvasX = (clientX - rect.left) * ratio;
            this.touchLeft = canvasX < window.canvas.width / 2;
            this.touchRight = canvasX >= window.canvas.width / 2;
        },

        clearTouch: function(){
            this.touchLeft = false;
            this.touchRight = false;
            this.activePointerId = null;
        },

        applyMovementKeys: function(){
            if(window.gameConfig.controlMode === "touch"){
                window.leftKey = this.touchLeft;
                window.rightKey = this.touchRight;
            }
            var speed = this.getEffectivePlayerSpeed();
            if(window.leftKey && window.Ship.x > 0){
                window.Ship.x -= speed;
            }
            if(window.rightKey && window.Ship.x < (window.canvas.width - window.Ship.width)){
                window.Ship.x += speed;
            }
            if(window.upKey && window.Ship.y > 0){
                window.Ship.y -= speed;
            }
            if(window.downKey && window.Ship.y < (window.canvas.height - window.Ship.height)){
                window.Ship.y += speed;
            }
        },

        initTouchControls: function(){
            var self = this;
            var canvas = window.canvas;
            if(!canvas){
                return;
            }
            canvas.style.touchAction = "none";
            canvas.addEventListener("pointerdown", function(e){
                if(window.gamePhase !== "playing" || window.gameConfig.controlMode !== "touch"){
                    return;
                }
                self.activePointerId = e.pointerId;
                self.applyTouchFromEvent(e.clientX);
                if(canvas.setPointerCapture){
                    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
                }
            });
            canvas.addEventListener("pointermove", function(e){
                if(window.gamePhase !== "playing" || window.gameConfig.controlMode !== "touch"){
                    return;
                }
                if(self.activePointerId !== null && e.pointerId !== self.activePointerId){
                    return;
                }
                self.applyTouchFromEvent(e.clientX);
            });
            function endTouch(e){
                if(self.activePointerId !== null && e.pointerId !== self.activePointerId){
                    return;
                }
                self.clearTouch();
            }
            canvas.addEventListener("pointerup", endTouch);
            canvas.addEventListener("pointercancel", endTouch);
            canvas.addEventListener("pointerleave", function(e){
                if(e.target === canvas){
                    self.clearTouch();
                }
            });
        }
    };

    window.addEventListener("resize", function(){
        window.Gameplay.resizeCanvas();
        if(typeof window.initVisualEffects === "function" && (window.gamePhase === "menu" || window.gamePhase === "playing")){
            window.initVisualEffects();
        }
    });
    if(window.visualViewport){
        window.visualViewport.addEventListener("resize", function(){
            window.Gameplay.resizeCanvas();
        });
    }
})();

// gui.js
export class GUIController {
    constructor(engine) {
        this.engine = engine;
        this.isAutoPlay = false;
        this.isTurboMode = false;
        this.promoInterval = null;

        this.initAudio();
        this.initCoinManager();
        this.bindEvents();
    }

    // --- 1. 音效管理器 ---
    initAudio() {
        window.AudioMgr = {
            musicEnabled: true, sfxEnabled: true,
            updateSettings: function(musicOn, sfxOn) {
                this.musicEnabled = musicOn; this.sfxEnabled = sfxOn;
                if (!this.musicEnabled) { 
                    try { document.getElementById('bgm_main').pause(); document.getElementById('bgm_free').pause(); } catch(e){} 
                } 
                else { 
                    // 🌟 防護罩：確保玩家已經點擊過開始按鈕 (畫面已載入) 才接受大廳的播放指令
                    const stage = document.getElementById('game-stage');
                    if (stage && stage.classList.contains('loaded')) {
                        this.playBGM(document.body.classList.contains('free-mode') ? 'free' : 'main'); 
                    }
                }
            },
            playBGM: function(type) {
                if (!this.musicEnabled) return;
                try { document.getElementById('bgm_main').pause(); document.getElementById('bgm_free').pause(); } catch(e){}
                let target = document.getElementById((type === 'free') ? 'bgm_free' : 'bgm_main');
                if(target) { 
                    target.volume = (type === 'free') ? 1.0 : 0.8; 
                    target.play().catch(()=>{}); 
                }
            },
            playSFX: function(name) {
                if (!this.sfxEnabled) return;
                let audio = document.getElementById(`sfx_${name}_1`);
                if (audio) { 
                    try { audio.currentTime = 0; } catch(e){} 
                    audio.play().catch(()=>{}); 
                }
            }
        };
    }

    // --- 2. 金幣與彩帶特效管理器 ---
    initCoinManager() {
        window.CoinManager = {
            canvas: null, ctx: null, particles: [], isRunning: false, coinImg: new Image(), imgLoaded: false,
            init: function() {
                this.canvas = document.getElementById('coin-canvas'); this.ctx = this.canvas.getContext('2d');
                this.canvas.width = this.canvas.offsetWidth; this.canvas.height = this.canvas.offsetHeight;
                this.coinImg.src = 'coin.png'; this.coinImg.onload = () => { this.imgLoaded = true; };
            },
            fire: function(amount, originX = 0.5) { 
                let count = (amount > 200) ? 50 : amount; if (amount < 5) count = 20; 
                let sparkleCount = Math.floor(count / 2);
                if (!this.isRunning) { this.isRunning = true; this.animate(); }
                for (let i = 0; i < count; i++) this.particles.push(this.createParticle('coin', originX));
                for (let i = 0; i < sparkleCount; i++) this.particles.push(this.createParticle('sparkle', originX));
            },
            createParticle: function(type, originX = 0.5) {
                const w = this.canvas.width; const h = this.canvas.height; const startX = w * originX; 
                if (type === 'coin') {
                    return { type: 'coin', x: startX, y: h + 50, vx: (Math.random() - 0.5 + (0.5 - originX)) * (w * 0.04), vy: -(Math.random() * h * 0.025 + h * 0.015), gravity: h * 0.0005, size: (Math.random() * 30 + 30) * (w / 720) * 3, rotation: Math.random() * 360, rSpeed: (Math.random() - 0.5) * 10, flip: Math.random() * Math.PI, flipSpeed: Math.random() * 0.2 + 0.1, isFlashing: false, flashTimer: 0, flashDuration: 30 };
                } else {
                    return { type: 'sparkle', x: startX + (Math.random() - 0.5) * 50, y: h + 50, vx: (Math.random() - 0.5) * (w * 0.04), vy: -(Math.random() * h * 0.028 + h * 0.01), gravity: h * 0.0002, size: Math.random() * 5 + 2, alpha: 1, decay: Math.random() * 0.02 + 0.01 };
                }
            },
            animate: function() {
                if (!this.isRunning) return;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                for (let i = 0; i < this.particles.length; i++) {
                    let p = this.particles[i]; p.vy += p.gravity; p.x += p.vx; p.y += p.vy;
                    if (p.type === 'coin') {
                        p.rotation += p.rSpeed; p.flip += p.flipSpeed;
                        if (!p.isFlashing && Math.random() < 0.05) { p.isFlashing = true; p.flashTimer = 0; }
                        let brightness = 100;
                        if (p.isFlashing) { p.flashTimer++; brightness = 100 + 100 * Math.sin((p.flashTimer / p.flashDuration) * Math.PI); if (p.flashTimer >= p.flashDuration) p.isFlashing = false; }
                        this.ctx.save(); this.ctx.translate(p.x, p.y); this.ctx.rotate(p.rotation * Math.PI / 180); this.ctx.scale(Math.cos(p.flip), 1);
                        if (brightness > 105) this.ctx.filter = `brightness(${brightness}%)`;
                        if (this.imgLoaded) this.ctx.drawImage(this.coinImg, -p.size/2, -p.size/2, p.size, p.size);
                        else { this.ctx.beginPath(); this.ctx.arc(0, 0, p.size/2, 0, Math.PI*2); this.ctx.fillStyle='#ffd700'; this.ctx.fill(); }
                        this.ctx.restore();
                    } else {
                        p.alpha -= p.decay; if(p.alpha <= 0) { this.particles.splice(i, 1); i--; continue; }
                        this.ctx.save(); this.ctx.globalAlpha = p.alpha; this.ctx.beginPath(); this.ctx.fillStyle = (Math.random()>0.5)?'#ffffff':'#ffff00'; this.ctx.fillRect(p.x, p.y, p.size, p.size); this.ctx.restore();
                    }
                    if (p.y > this.canvas.height + 100) { this.particles.splice(i, 1); i--; }
                }
                if (this.particles.length > 0) requestAnimationFrame(() => this.animate());
                else { this.isRunning = false; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
            }
        };

        window.spawnConfetti = function() {
            const stage = document.querySelector('.stage'); const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const el = document.createElement('div'); el.className = 'confetti'; el.style.left = Math.random() * 100 + '%'; el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]; el.style.animationDuration = (Math.random() * 2 + 1.5) + 's'; 
            stage.appendChild(el); setTimeout(() => { el.remove(); }, 3500);
        };
    }

    // --- 3. 跑馬燈與 UI 更新 ---
    updateMessage(text, styleClass, animationClass) {
        const b = document.getElementById('ui-message-bar'), c = document.getElementById('msg-content');
        if(!b || !c) return;
        c.innerText = text; c.className = styleClass + ' ' + animationClass; b.style.display = 'flex';
    }

    showPromoMessage() {
        // 🌟 把這裡的 3個改 4個，5次改 15次
        this.updateMessage("★ 4個 SCATTER 觸發 15次 免費遊戲 ★", "style-promo", "anim-scroll");
        setTimeout(() => { 
            if(!this.engine.state.isSpinning && this.engine.state.currentWin === 0) 
                document.getElementById('ui-message-bar').style.display = 'none'; 
        }, 10000);
    }

    startPromoLoop() {
        if(this.promoInterval) clearInterval(this.promoInterval);
        this.promoInterval = setInterval(() => { 
            if (!this.engine.state.isSpinning && !this.engine.state.isFreeGame && this.engine.state.currentWin === 0) 
                this.showPromoMessage(); 
        }, 14000);
    }

    updateBetUI(bet) {
        document.getElementById('ui-bet').innerText = bet.toLocaleString('en-US', {minimumFractionDigits: 2});
    }

    // --- 4. 綁定所有共用的按鈕邏輯 ---
    bindEvents() {
        // 阻擋手機滑動預設行為 (防回彈)
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
        document.addEventListener('touchmove', function(e) {
            let target = e.target; let isScrollable = false;
            while(target) { if (target.classList && target.classList.contains('info-content')) { isScrollable = true; break; } target = target.parentNode; }
            if (!isScrollable) { e.preventDefault(); } 
            else {
                let el = document.querySelector('.info-content');
                let scrollTop = el.scrollTop; let scrollHeight = el.scrollHeight; let height = el.clientHeight;
                let deltaY = e.touches[0].clientY - (el.lastY || e.touches[0].clientY); el.lastY = e.touches[0].clientY;
                if (scrollTop === 0 && deltaY > 0) e.preventDefault();
                if (scrollTop + height >= scrollHeight && deltaY < 0) e.preventDefault();
            }
        }, { passive: false });
        document.addEventListener('touchstart', function(e) { let el = document.querySelector('.info-content'); if(el) el.lastY = e.touches[0].clientY; }, { passive: false });

        // 開始遊戲
        const btnStart = document.getElementById('btn-start-game');
        if(btnStart) {
            btnStart.addEventListener('click', () => {
                document.getElementById('loading-layer').style.display = 'none';
                document.getElementById('game-stage').classList.add('loaded');
                
                try {
                    // 1. 正式啟動主遊戲音樂 (MG)
                    window.AudioMgr.playBGM('main');
                    
                    // 2. 🤫 偷渡解鎖免費遊戲音樂 (FG) - 音量0播放後立刻暫停，騙過蘋果憑證
                    let freeBgm = document.getElementById('bgm_free');
                    if (freeBgm) {
                        freeBgm.volume = 0;
                        let p = freeBgm.play();
                        if (p !== undefined) {
                            p.then(() => {
                                freeBgm.pause();
                                freeBgm.currentTime = 0;
                                freeBgm.volume = 1.0; // 恢復正常音量備用
                            }).catch(() => {
                                freeBgm.volume = 1.0; 
                            });
                        }
                    }
                } catch(e) { console.warn("Audio start bypassed", e); }

                if (window.CoinManager) window.CoinManager.init();
                this.startPromoLoop();
            }, { once: true }); // 🌟 確保只觸發一次
        }

        // Spin 按鈕
        const spinBtn = document.getElementById('spinBtn');
        if(spinBtn) {
            spinBtn.addEventListener('click', () => { 
                this.isAutoPlay = false; 
                document.getElementById('btn-auto').classList.remove('active'); 
                this.engine.startSpin(false); 
            });
        }

        // 選單按鈕群
        document.getElementById('btn-phone').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('menu-modal').classList.add('active'); });
        document.getElementById('btn-menu-close-bottom').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('menu-modal').classList.remove('active'); });
        document.getElementById('btn-menu-info').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('info-modal').classList.add('active'); });
        document.getElementById('btn-close-info').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('info-modal').classList.remove('active'); });
        document.getElementById('btn-menu-setting').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('setting-modal').classList.add('active'); });
        document.getElementById('btn-close-setting').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('setting-modal').classList.remove('active'); });

        // 大廳返回鍵
        document.getElementById('btn-menu-home').addEventListener('click', () => { 
            window.AudioMgr.playSFX('click'); 
            if (window.self !== window.top) window.parent.postMessage('closeGame', '*');
            else window.location.href = 'https://zendwucloud.github.io/Casino-Lobby/';
        });

        // 音效與押注
        document.getElementById('chk-sound').addEventListener('change', (e) => { window.AudioMgr.updateSettings(e.target.checked, e.target.checked); });
        
        document.getElementById('btn-buy').addEventListener('click', () => { 
            if (this.engine.state.isSpinning || this.isAutoPlay) return; 
            window.AudioMgr.playSFX('click'); 
            document.getElementById('buy-price-text').innerText = (this.engine.state.bet * 100).toLocaleString(); 
            document.getElementById('buy-modal').classList.add('active'); 
        });
        document.getElementById('btn-buy-cancel').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('buy-modal').classList.remove('active'); });
        document.getElementById('btn-buy-confirm').addEventListener('click', () => { window.AudioMgr.playSFX('click'); document.getElementById('buy-modal').classList.remove('active'); this.engine.startSpin(true); });
        
        document.getElementById('btn-plus').addEventListener('click', () => { window.AudioMgr.playSFX('click'); if(!this.engine.state.isSpinning) { this.engine.state.bet = Math.min(this.engine.state.bet + 100, 5000); this.updateBetUI(this.engine.state.bet); } });
        document.getElementById('btn-minus').addEventListener('click', () => { window.AudioMgr.playSFX('click'); if(!this.engine.state.isSpinning) { this.engine.state.bet = Math.max(this.engine.state.bet - 100, 100); this.updateBetUI(this.engine.state.bet); } });
        
        document.getElementById('btn-auto').addEventListener('click', () => {
            if(this.engine.state.isSpinning) return;
            this.isAutoPlay = !this.isAutoPlay;
            if(this.isAutoPlay) { document.getElementById('btn-auto').classList.add('active'); this.engine.startSpin(); }
            else document.getElementById('btn-auto').classList.remove('active');
        });
        
        document.getElementById('btn-turbo-toggle').addEventListener('click', () => {
            this.isTurboMode = !this.isTurboMode;
            if(this.isTurboMode) document.getElementById('btn-turbo-toggle').classList.add('active');
            else document.getElementById('btn-turbo-toggle').classList.remove('active');
        });
    }
}
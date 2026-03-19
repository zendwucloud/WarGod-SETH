// engine.js
export class SlotEngine {
    constructor(config, callbacks) {
        this.config = config;
        this.callbacks = callbacks || {}; 
        
        this.state = {
            credit: 100000,
            bet: 100,
            currentWin: 0,
            isFreeGame: false,
            freeSpinsLeft: 0,
            isSpinning: false,
            gridData: [],
            globalMultiplier: 0  // ★ 新增：用來記錄免費遊戲的總乘數
        };

        this.poolBase = [];
        this.totalWeightBase = 0;
        this.poolsFreeByReel = Array.from({ length: this.config.mechanics.cols }, () => []);
        this.totalWeightsFreeByReel = new Array(this.config.mechanics.cols).fill(0);

        this.initBasePool();
    }

    initBasePool() {
        this.poolBase = [];
        this.totalWeightBase = 0;
        for (let id in this.config.symbols) {
            let s = this.config.symbols[id];
            if (s.weightBase && s.weightBase > 0) {
                this.poolBase.push({ id: parseInt(id), weight: s.weightBase });
                this.totalWeightBase += s.weightBase;
            }
        }
    }

    updateFreeGameWeights(scatterCount) {
        const cols = this.config.mechanics.cols;
        
        this.poolsFreeByReel = Array.from({ length: cols }, () => []);
        this.totalWeightsFreeByReel = new Array(cols).fill(0);
        
        const symbolQuota = 5000; 
        const baseMultiplierQuota = 120; // ★ 路線 B 核心：超級加倍！把失去的 40% RTP 全部從這裡噴給玩家

        let connectableSymbols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
        
        let ratios = { 
            1: 2, 2: 3, 3: 5, 4: 8, 5: 10, 6: 14, 7: 16, 8: 18, 9: 22, 
            11: 0.15 
        };
        let ratioSum = Object.values(ratios).reduce((a, b) => a + b, 0);

        // ... 下面維持不變 ...

        for (let c = 0; c < cols; c++) {
            connectableSymbols.forEach(id => {
                let w = (ratios[id] / ratioSum) * symbolQuota; // 現在這裡就不會報錯了
                this.poolsFreeByReel[c].push({ id: id, weight: w });
                this.totalWeightsFreeByReel[c] += w;
            });

            let reelMulBoost = (c === 0) ? 3.5 : (c === 1) ? 2.0 : (c === 2) ? 1.5 : (c === 3) ? 1.0 : (c === 4) ? 0.8 : 0.5;
            let currentReelMulQuota = baseMultiplierQuota * reelMulBoost;

            let w2 = 0, w10 = 0, w25 = 0, w100 = 0, w500 = 0;
            if (scatterCount === 3) { w2 = currentReelMulQuota * 0.95; w10 = currentReelMulQuota * 0.05; } 
            else if (scatterCount === 4) { w2 = currentReelMulQuota * 0.85; w10 = currentReelMulQuota * 0.10; w25 = currentReelMulQuota * 0.05; } 
            else { 
                w2 = currentReelMulQuota * 0.80; 
                w10 = currentReelMulQuota * 0.12; 
                w25 = currentReelMulQuota * 0.06; 
                w100 = currentReelMulQuota * 0.018; 
                w500 = currentReelMulQuota * 0.002; 
            }

            if (w2 > 0) { this.poolsFreeByReel[c].push({ id: 20, weight: w2 }); this.totalWeightsFreeByReel[c] += w2; }
            if (w10 > 0) { this.poolsFreeByReel[c].push({ id: 21, weight: w10 }); this.totalWeightsFreeByReel[c] += w10; }
            if (w25 > 0) { this.poolsFreeByReel[c].push({ id: 22, weight: w25 }); this.totalWeightsFreeByReel[c] += w25; }
            if (w100 > 0) { this.poolsFreeByReel[c].push({ id: 23, weight: w100 }); this.totalWeightsFreeByReel[c] += w100; }
            if (w500 > 0) { this.poolsFreeByReel[c].push({ id: 24, weight: w500 }); this.totalWeightsFreeByReel[c] += w500; }
        }
    }

    getWeightedSymbol(reelIndex) {
        if (this.state.isFreeGame) {
            let usePool = this.poolsFreeByReel[reelIndex];
            let useTotal = this.totalWeightsFreeByReel[reelIndex];
            if (!usePool || usePool.length === 0) return 1;
            let r = Math.random() * useTotal; 
            let sum = 0;
            for (let item of usePool) { sum += item.weight; if (r <= sum) return item.id; }
            return 1;
        } else {
            let r = Math.random() * this.totalWeightBase; 
            let sum = 0;
            for (let item of this.poolBase) { sum += item.weight; if (r <= sum) return item.id; }
            return 9; 
        }
    }

    generateRandomGrid(isBuyFeature = false) {
        let newGrid = [];
        const { cols, rows } = this.config.mechanics;
        
        // 決定哪些卷軸要強制塞 Scatter (賽特通常需要 4 個)
        let forceScatterCols = [];
        if (isBuyFeature) {
            // 隨機挑選 4 個不重複的卷軸來放 Scatter
            let availableCols = [0, 1, 2, 3, 4, 5];
            for (let i = 0; i < 4; i++) {
                let randIndex = Math.floor(Math.random() * availableCols.length);
                forceScatterCols.push(availableCols.splice(randIndex, 1)[0]);
            }
        }

        for (let c = 0; c < cols; c++) {
            newGrid[c] = [];
            let hasWildInCol = false; 
            
            // 如果這個卷軸被選中要放 Scatter，隨機決定放在哪一列
            let forcedScatterRow = forceScatterCols.includes(c) ? Math.floor(Math.random() * rows) : -1;

            for (let r = 0; r < rows; r++) {
                let type;
                if (r === forcedScatterRow) { 
                    type = 11; // 放入 SCATTER
                } else {
                    while (true) {
                        type = this.getWeightedSymbol(c);
                        // 避免同一軸太多 WILD 或 SCATTER 擠在一起
                        if (type === 11 && forcedScatterRow !== -1) continue; 
                        if (this.state.isFreeGame && type === 10) { if (hasWildInCol) continue; hasWildInCol = true; }
                        break; 
                    }
                }
                newGrid[c].push(type);
            }
        }
        return newGrid;
    }

    async startSpin(isBuyFeature = false) {
        if (this.state.isSpinning) return;
        let cost = isBuyFeature ? this.state.bet * this.config.mechanics.featureBuyCostMulti : this.state.bet;
        
        if (!this.state.isFreeGame && this.state.credit < cost) {
            if(this.callbacks.onError) this.callbacks.onError("餘額不足！"); return;
        }

        this.state.isSpinning = true;
        this.state.isFirstDrop = true; // ★ 新增這行：記錄這是這局的第一次盤面

        if (!this.state.isFreeGame) {
            this.state.currentWin = 0;
            this.state.credit -= cost;
            if(this.callbacks.onBalanceChange) this.callbacks.onBalanceChange(this.state.credit);
        } else {
            this.state.freeSpinsLeft--;
            if(this.callbacks.onFreeSpinUpdate) this.callbacks.onFreeSpinUpdate(this.state.freeSpinsLeft);
        }

        if(this.callbacks.onSpinStart) this.callbacks.onSpinStart(isBuyFeature);

        this.state.gridData = this.generateRandomGrid(isBuyFeature);

        if(this.callbacks.playSpinAnimation) {
            await this.callbacks.playSpinAnimation(this.state.gridData);
        }

        await this.checkLogic();
    }

    async checkLogic() {
        // ★ 將 isFirstDrop 傳給大腦計算
        const { matches, roundScore, spinMultipliers, scatterCount } = this.calculateWins(this.state.isFirstDrop);
        
        this.state.isFirstDrop = false; // ★ 算完第一次後立刻關掉，後續掉落就不會再觸發

        // 判斷是否有贏分 (有一般消除 OR 有4個以上的Scatter)
        if (matches.size > 0 || (scatterCount >= 4 && roundScore > 0)) {
            let currentMul = 1;

            if (this.state.isFreeGame) {
                // 【賽特靈魂機制】免費遊戲中：只要這局有贏分，且畫面上有乘數，就把乘數加入總池！
                if (roundScore > 0 && spinMultipliers > 0) {
                    this.state.globalMultiplier += spinMultipliers;
                }
                // 計算贏分時，使用「總累積乘數」
                currentMul = this.state.globalMultiplier > 0 ? this.state.globalMultiplier : 1;
            } else {
                // 一般遊戲：只看當下盤面上的乘數
                currentMul = spinMultipliers > 0 ? spinMultipliers : 1;
            }

            let finalWin = roundScore * currentMul;
            
            // ★ Max Win 保護機制 (最大51000倍) ★
            const MAX_PAYOUT_MULTIPLIER = 51000;
            const MAX_WIN_AMOUNT = this.state.bet * MAX_PAYOUT_MULTIPLIER;
            let isMaxWin = false;

            if (this.state.currentWin + finalWin >= MAX_WIN_AMOUNT) {
                finalWin = MAX_WIN_AMOUNT - this.state.currentWin;
                this.state.currentWin = MAX_WIN_AMOUNT;
                isMaxWin = true;
            } else {
                this.state.currentWin += finalWin;
            }
            
            // 呼叫 gui.js 播放動畫 (傳入 currentMul，讓 UI 上顯示疊加後的總倍數)
            if(this.callbacks.playWinAnimation) { 
                await this.callbacks.playWinAnimation(matches, finalWin, currentMul, this.state.currentWin); 
            }

            if (isMaxWin) {
                if (this.callbacks.onMaxWin) await this.callbacks.onMaxWin(this.state.currentWin);
                this.state.freeSpinsLeft = 0; // ★ 補上這行：強制結束 FG，避免無效空轉
                this.endSpin(0); 
                return;
            }

            // 如果有一般符號消除，就繼續掉落 (Refill)
            if (matches.size > 0 && this.config.mechanics.enableCascading) { 
                await this.doRefill(matches); 
            } else { 
                // 只有 Scatter 贏分，沒有一般消除，就不會掉落，直接結束該局
                this.endSpin(scatterCount); 
            }
        } else {
            this.endSpin(scatterCount);
        }
    }

    async doRefill(matches) {
        const { cols, rows } = this.config.mechanics;
        let newGridData = JSON.parse(JSON.stringify(this.state.gridData));

        for (let c = 0; c < cols; c++) {
            let oldColData = newGridData[c];
            let survivors = [];
            for (let r = 0; r < rows; r++) {
                if (!matches.has(`${c},${r}`)) {
                    survivors.push(oldColData[r]);
                }
            }

            if (survivors.length < rows) {
                let missingCount = rows - survivors.length;
                let newSymbols = [];
                for (let k = 0; k < missingCount; k++) {
                    newSymbols.push(this.getWeightedSymbol(c));
                }
                // 剩下的往下掉(放前面)，新抽到的補在上方(放後面)
                newGridData[c] = [...survivors, ...newSymbols];
            }
        }

        this.state.gridData = newGridData;
        if (this.callbacks.playRefillAnimation) { await this.callbacks.playRefillAnimation(this.state.gridData, matches); }
        await this.checkLogic(); 
    }

    endSpin(scatterCount) {
        this.state.isSpinning = false;
        
        // 改為 4 個 SCATTER 觸發 15 局免費遊戲
        if (scatterCount >= 4 && !this.state.isFreeGame) {
            let spins = 15; 
            this.state.isFreeGame = true;
            this.state.freeSpinsLeft = spins;
            this.state.globalMultiplier = 0; // ★ 新增：每次進免費遊戲都要從 0 開始疊加
            this.updateFreeGameWeights(scatterCount);
            if(this.callbacks.onFreeGameTrigger) this.callbacks.onFreeGameTrigger(spins, scatterCount);
            return; 
        }

        if (this.state.isFreeGame && this.state.freeSpinsLeft <= 0) {
            this.state.credit += this.state.currentWin;
            let totalWin = this.state.currentWin;
            this.state.currentWin = 0;
            this.state.isFreeGame = false;
            if(this.callbacks.onBalanceChange) this.callbacks.onBalanceChange(this.state.credit);
            if(this.callbacks.onFreeGameEnd) this.callbacks.onFreeGameEnd(totalWin);
        } else {
            if (!this.state.isFreeGame && this.state.currentWin > 0) {
                this.state.credit += this.state.currentWin;
                this.state.currentWin = 0;
                if(this.callbacks.onBalanceChange) this.callbacks.onBalanceChange(this.state.credit);
            }
            if(this.callbacks.onSpinComplete) this.callbacks.onSpinComplete(scatterCount);
        }
    }
calculateWins(isFirstDrop = true, gridData = this.state.gridData) {
        let matches = new Set();
        let roundScore = 0;
        let tempMulCoords = [];
        let spinMultipliers = 0;
        let scatterCount = 0;

        const { cols, rows } = this.config.mechanics;
        const symbolsConfig = this.config.symbols;

        // 1. 統計盤面上所有符號的「數量」與「座標」
        let symbolCounts = {};
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                let id = gridData[c][r];
                let symInfo = symbolsConfig[id];
                if (!symInfo) continue;

                if (symInfo.type === 'mul') { 
                    spinMultipliers += symInfo.val; 
                    tempMulCoords.push(`${c},${r}`); 
                } 
                else if (symInfo.type === 'scatter') { 
                    scatterCount++; 
                } 
                
                // 把所有非乘數的符號記錄下來
                if (symInfo.type !== 'mul' && symInfo.type !== 'scatter') {
                    if (!symbolCounts[id]) symbolCounts[id] = { count: 0, coords: [] };
                    symbolCounts[id].count++;
                    symbolCounts[id].coords.push(`${c},${r}`);
                }
            }
        }

        // 2. 判斷全盤消除 (Scatter Pays) - 數量達到 8 個以上才消除
        const regularSymbolIds = Object.keys(symbolsConfig)
            .filter(id => ['high', 'mid', 'low'].includes(symbolsConfig[id].type))
            .map(Number);

        for (let targetId of regularSymbolIds) {
            let data = symbolCounts[targetId];
            if (!data || data.count < 8) continue; // 小於 8 個直接跳過

            let symInfo = symbolsConfig[targetId];
            if (this.state.isFreeGame && symInfo.inFree === false) continue;

            // 決定賠率階層 (12+, 10-11, 8-9)
            let payout = 0;
            if (data.count >= 12 && symInfo.payouts[12]) payout = symInfo.payouts[12];
            else if (data.count >= 10 && symInfo.payouts[10]) payout = symInfo.payouts[10];
            else if (data.count >= 8 && symInfo.payouts[8]) payout = symInfo.payouts[8];

            if (payout > 0) {
                // 基礎贏分計算 (維持妳原本的 bet / 20 邏輯)
                let winAmount = payout * (this.state.bet / 20); 
                roundScore += winAmount;
                // 把該符號的所有座標加入 matches，讓畫面知道要炸掉哪些格子
                data.coords.forEach(coord => matches.add(coord));
            }
        }

        // 3. 處理 Scatter 的獨立賠付 (4個以上給分)
        if (isFirstDrop && scatterCount >= 4 && symbolsConfig[11] && symbolsConfig[11].payouts) {
            let sPayout = 0;
            if (scatterCount >= 6 && symbolsConfig[11].payouts[6]) sPayout = symbolsConfig[11].payouts[6];
            else if (scatterCount >= 5 && symbolsConfig[11].payouts[5]) sPayout = symbolsConfig[11].payouts[5];
            else if (scatterCount >= 4 && symbolsConfig[11].payouts[4]) sPayout = symbolsConfig[11].payouts[4];

            if (sPayout > 0) {
                let winAmount = sPayout * (this.state.bet / 20);
                roundScore += winAmount;
            }
        }

        // 4. 如果盤面上有發生一般消除，才把「乘數符號」加入 matches，讓它們一起觸發動畫
        if (matches.size > 0 && tempMulCoords.length > 0) { 
            tempMulCoords.forEach(key => matches.add(key)); 
        }

        return { matches, roundScore, spinMultipliers, scatterCount };
    }
    
}
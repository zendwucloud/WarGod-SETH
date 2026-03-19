// config.js
const GameConfig = {
    gameId: "dragon_treasure", 
    
    mechanics: {
        cols: 6,                    
        rows: 5,                    
        enableCascading: true,      
        ways: 0,                    
        featureBuyCostMulti: 100    
    },

    // 🌟 就是這裡！妳剛才可能不小心把這整塊 assets 刪掉了
    assets: {
        images: {
            bg: `background.jpg`,
            symbols: {
                1: `s1.png`, 2: `s2.png`, 3: `s3.png`, 4: `s4.png`, 5: `s5.png`,
                6: `s6.png`, 7: `s7.png`, 8: `s8.png`, 9: `s9.png`,
                10: `WILD.png`, 11: `SCATTER.png`,
                20: `x2.png`, 21: `x10.png`, 22: `x25.png`, 23: `x100.png`,
                24: `x500.png` // 新增的 500倍 素材路徑
            }
        },
        audio: {
            bgmMain: `bgm_main.mp3`, bgmFree: `bgm_free.mp3`,
            sfxSpin: `sfx_spin.mp3`, sfxStop: `sfx_stop.mp3`
        }
    },

    // --- 符號與機率模型 (第11版：絕對黃金點) ---
    symbols: {
        1:  { type: 'high', payouts: {8: 50,  10: 150, 12: 400}, weightBase: 2.0, inFree: true },
        2:  { type: 'high', payouts: {8: 25,  10: 80,  12: 250}, weightBase: 3.0, inFree: true },
        3:  { type: 'high', payouts: {8: 15,  10: 40,  12: 150}, weightBase: 5.0, inFree: true },
        4:  { type: 'mid',  payouts: {8: 10,  10: 25,  12: 80},  weightBase: 8.0, inFree: true },
        5:  { type: 'mid',  payouts: {8: 8,   10: 15,  12: 60},  weightBase: 10.0, inFree: true },
        
        // ★ 黃金比例：不會無限連鎖，但也不會一灘死水
        6:  { type: 'low',  payouts: {8: 4,   10: 12,  12: 40},  weightBase: 14.0, inFree: true },
        7:  { type: 'low',  payouts: {8: 3,   10: 10,  12: 30},  weightBase: 16.0, inFree: true },
        8:  { type: 'low',  payouts: {8: 2,   10: 8,   12: 20},  weightBase: 18.0, inFree: true },
        9:  { type: 'low',  payouts: {8: 1,   10: 5,   12: 10},  weightBase: 22.0, inFree: true },
        
        10: { type: 'wild', weightBase: 0, inFree: false }, 
        
        // ★ 奈米級校正：1.35 應該能把觸發率精準卡在 1/250 上下！
        11: { type: 'scatter', payouts: {4: 60, 5: 100, 6: 2000}, weightBase: 1.64, inFree: true },
        
        20: { type: 'mul', val: 2,   weightBase: 0, inFree: true }, 
        21: { type: 'mul', val: 10,  weightBase: 0, inFree: true }, 
        22: { type: 'mul', val: 50,  weightBase: 0, inFree: true }, 
        23: { type: 'mul', val: 250, weightBase: 0, inFree: true },
        24: { type: 'mul', val: 500, weightBase: 0, inFree: true } 
    }
};

export default GameConfig;
/**
 * ═══════════════════════════════════════════════════════════════
 * 檔案名稱：difficulty-engine.js
 * 功能說明：動態難度調整引擎 (Dynamic Difficulty Adjustment)
 * 用途：根據玩家表現即時調整遊戲難度，維持心流狀態
 * 最後更新：2026-01-20
 * ═══════════════════════════════════════════════════════════════
 */

class DifficultyEngine {
    constructor(dataManager) {
        this.dataManager = dataManager;

        // 心流區間：最佳正確率範圍
        this.flowZone = { min: 0.70, max: 0.85 };

        // 連續表現評估的題數
        this.windowSize = 10;

        // 調整閾值：連續多少題超出區間才調整
        this.adjustmentThreshold = 3;

        // 難度等級定義 (1-4)
        this.difficultyLevels = {
            1: {
                name: '初學',
                timeLimit: null,        // 無時間限制
                distractorQuality: 1,   // 干擾選項相似度低
                hintAvailable: true,    // 可使用提示
                description: '適合初次學習'
            },
            2: {
                name: '熟練',
                timeLimit: 30,          // 30秒
                distractorQuality: 2,
                hintAvailable: true,
                description: '適合鞏固記憶'
            },
            3: {
                name: '精通',
                timeLimit: 20,          // 20秒
                distractorQuality: 3,
                hintAvailable: false,
                description: '挑戰你的記憶極限'
            },
            4: {
                name: '大師',
                timeLimit: 15,          // 15秒
                distractorQuality: 4,   // 最高相似度
                hintAvailable: false,
                description: '只有真正的修行者才能達成'
            }
        };
    }

    /**
     * 獲取當前難度等級
     */
    getCurrentLevel() {
        if (this.dataManager && this.dataManager.userData) {
            return this.dataManager.userData.difficultyLevel || 2;
        }
        return 2;
    }

    /**
     * 設定難度等級
     */
    setLevel(level) {
        const validLevel = Math.max(1, Math.min(4, level));
        if (this.dataManager) {
            this.dataManager.userData.difficultyLevel = validLevel;
            this.dataManager.saveUserData();
        }
        return validLevel;
    }

    /**
     * 記錄答題表現
     * @param {boolean} isCorrect - 是否答對
     */
    recordPerformance(isCorrect) {
        if (!this.dataManager || !this.dataManager.userData) return;

        if (!this.dataManager.userData.sessionPerformance) {
            this.dataManager.userData.sessionPerformance = [];
        }

        // 添加新記錄
        this.dataManager.userData.sessionPerformance.push({
            correct: isCorrect,
            timestamp: new Date().toISOString()
        });

        // 只保留最近 windowSize 筆記錄
        if (this.dataManager.userData.sessionPerformance.length > this.windowSize) {
            this.dataManager.userData.sessionPerformance.shift();
        }

        this.dataManager.saveUserData();

        // 檢查是否需要調整難度
        return this.checkAndAdjust();
    }

    /**
     * 獲取最近表現統計
     */
    getRecentPerformance() {
        if (!this.dataManager || !this.dataManager.userData) {
            return { correct: 0, total: 0, accuracy: 0 };
        }

        const performance = this.dataManager.userData.sessionPerformance || [];
        const total = performance.length;
        const correct = performance.filter(p => p.correct).length;
        const accuracy = total > 0 ? correct / total : 0;

        return { correct, total, accuracy };
    }

    /**
     * 檢查並調整難度
     */
    checkAndAdjust() {
        const { accuracy, total } = this.getRecentPerformance();
        const currentLevel = this.getCurrentLevel();

        // 至少要有足夠的樣本數才調整
        if (total < this.adjustmentThreshold) {
            return { action: 'maintain', reason: '樣本數不足' };
        }

        // 計算連續正確/錯誤的次數
        const performance = this.dataManager.userData.sessionPerformance || [];
        const recent = performance.slice(-this.adjustmentThreshold);
        const allCorrect = recent.every(p => p.correct);
        const allWrong = recent.every(p => !p.correct);

        // 連續答對且超過上限 → 提高難度
        if (accuracy > this.flowZone.max && allCorrect && currentLevel < 4) {
            const newLevel = this.setLevel(currentLevel + 1);
            console.log(`🔺 難度提升到 ${this.difficultyLevels[newLevel].name}`);
            return {
                action: 'increase',
                oldLevel: currentLevel,
                newLevel: newLevel,
                reason: `正確率 ${(accuracy * 100).toFixed(0)}% 超過目標區間`
            };
        }

        // 連續答錯且低於下限 → 降低難度
        if (accuracy < this.flowZone.min && allWrong && currentLevel > 1) {
            const newLevel = this.setLevel(currentLevel - 1);
            console.log(`🔻 難度降低到 ${this.difficultyLevels[newLevel].name}`);
            return {
                action: 'decrease',
                oldLevel: currentLevel,
                newLevel: newLevel,
                reason: `正確率 ${(accuracy * 100).toFixed(0)}% 低於目標區間`
            };
        }

        return {
            action: 'maintain',
            reason: `正確率 ${(accuracy * 100).toFixed(0)}% 在目標區間內`
        };
    }

    /**
     * 獲取當前難度設定
     */
    getDifficultySettings() {
        const level = this.getCurrentLevel();
        return {
            level: level,
            ...this.difficultyLevels[level]
        };
    }

    /**
     * 獲取難度指示器資訊
     */
    getDifficultyIndicator() {
        const level = this.getCurrentLevel();
        const settings = this.difficultyLevels[level];
        const { accuracy, total } = this.getRecentPerformance();

        // 計算心流狀態
        let flowState = 'neutral';
        if (total >= 3) {
            if (accuracy >= this.flowZone.min && accuracy <= this.flowZone.max) {
                flowState = 'optimal';
            } else if (accuracy > this.flowZone.max) {
                flowState = 'too_easy';
            } else {
                flowState = 'too_hard';
            }
        }

        return {
            level: level,
            name: settings.name,
            stars: '⭐'.repeat(level),
            flowState: flowState,
            accuracy: total > 0 ? Math.round(accuracy * 100) : null,
            message: this.getFlowMessage(flowState)
        };
    }

    /**
     * 獲取心流狀態訊息
     */
    getFlowMessage(flowState) {
        const messages = {
            optimal: '◆ 你正處於最佳學習狀態！',
            too_easy: '💪 表現優異，難度即將提升！',
            too_hard: '📚 放慢腳步，專心記憶',
            neutral: '🙏 開始你的修行之旅'
        };
        return messages[flowState] || messages.neutral;
    }

    /**
     * 重置表現記錄（新遊戲時調用）
     */
    resetPerformance() {
        if (this.dataManager && this.dataManager.userData) {
            this.dataManager.userData.sessionPerformance = [];
            this.dataManager.saveUserData();
        }
    }

    /**
     * 獲取統計摘要
     */
    getStats() {
        const { correct, total, accuracy } = this.getRecentPerformance();
        const level = this.getCurrentLevel();

        return {
            currentLevel: level,
            levelName: this.difficultyLevels[level].name,
            recentCorrect: correct,
            recentTotal: total,
            recentAccuracy: Math.round(accuracy * 100),
            flowZone: this.flowZone,
            isInFlowZone: accuracy >= this.flowZone.min && accuracy <= this.flowZone.max
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// 自動初始化
// ═══════════════════════════════════════════════════════════════

function initDifficultyEngine() {
    if (window.globalDataManager) {
        window.difficultyEngine = new DifficultyEngine(window.globalDataManager);
        console.log('✅ 動態難度引擎已初始化');
    } else {
        console.warn('⚠️ GlobalDataManager 尚未載入，動態難度引擎延遲初始化');
        setTimeout(initDifficultyEngine, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDifficultyEngine);
} else {
    initDifficultyEngine();
}

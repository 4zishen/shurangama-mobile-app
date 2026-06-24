/**
 * ═══════════════════════════════════════════════════════════════
 * 檔案名稱：spaced-repetition-engine.js
 * 功能說明：間隔重複引擎 (SM-2 算法)
 * 用途：科學化管理複習時程，提高咒語記憶效率
 * 最後更新：2026-01-20
 * ═══════════════════════════════════════════════════════════════
 */

class SpacedRepetitionEngine {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.reviewedToday = this.getReviewedTodayCount();
    }

    /**
     * 獲取今日已複習數量
     */
    getReviewedTodayCount() {
        const today = new Date().toDateString();
        const lastReviewDate = localStorage.getItem('srs_last_review_date');

        if (lastReviewDate === today) {
            return parseInt(localStorage.getItem('srs_reviewed_today') || '0');
        } else {
            localStorage.setItem('srs_last_review_date', today);
            localStorage.setItem('srs_reviewed_today', '0');
            return 0;
        }
    }

    /**
     * 從 GlobalDataManager 獲取複習項目
     */
    getItems() {
        if (this.dataManager && this.dataManager.userData) {
            return this.dataManager.userData.reviewItems || [];
        }
        return [];
    }

    /**
     * 儲存複習項目到 GlobalDataManager
     */
    saveItems(items) {
        if (this.dataManager) {
            this.dataManager.userData.reviewItems = items;
            this.dataManager.saveUserData();
        }
    }

    /**
     * SM-2 算法核心
     * @param {Object} item - 複習項目
     * @param {number} quality - 回答品質 (0-5)
     *   0 = 完全忘記
     *   1 = 錯誤，但看到答案後記起
     *   2 = 錯誤，但答案很熟悉
     *   3 = 困難但正確
     *   4 = 正確，稍有猶豫
     *   5 = 完美記憶
     * @returns {Object} 更新後的複習參數
     */
    calculateNextReview(item, quality) {
        let easiness = item.easiness || 2.5;
        let interval = item.interval || 0;
        let repetitions = item.repetitions || 0;

        if (quality >= 3) {
            // 答對：根據遺忘曲線增加間隔
            if (repetitions === 0) {
                interval = 1; // 第一次：1天後複習
            } else if (repetitions === 1) {
                interval = 6; // 第二次：6天後複習
            } else {
                interval = Math.round(interval * easiness);
            }
            repetitions++;
        } else {
            // 答錯：重新開始
            repetitions = 0;
            interval = 1;
        }

        // 更新難易度因子
        easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        easiness = Math.max(1.3, easiness); // 最小值為 1.3

        // 計算下次複習日期
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);

        return {
            easiness,
            interval,
            repetitions,
            nextReviewDate: nextDate.toISOString(),
            lastReviewDate: new Date().toISOString()
        };
    }

    /**
     * 新增複習項目
     * @param {string} word - 咒語文字
     * @param {Object} context - 上下文資訊 (section, line, context)
     * @returns {Object} 新建立的複習項目
     */
    addReviewItem(word, context = {}) {
        const items = this.getItems();

        // 檢查是否已存在相同項目
        const existingIndex = items.findIndex(item => item.word === word);

        if (existingIndex !== -1) {
            // 已存在：增加錯誤計數，重置複習參數
            items[existingIndex].errorCount = (items[existingIndex].errorCount || 1) + 1;
            items[existingIndex].repetitions = 0;
            items[existingIndex].interval = 1;
            items[existingIndex].nextReviewDate = new Date().toISOString();
            items[existingIndex].lastAddedDate = new Date().toISOString();

            this.saveItems(items);
            return items[existingIndex];
        }

        // 建立新項目
        const newItem = {
            id: Date.now(),
            word: word,
            easiness: 2.5,
            interval: 0,
            repetitions: 0,
            errorCount: 1,
            nextReviewDate: new Date().toISOString(),
            lastReviewDate: null,
            createdAt: new Date().toISOString(),
            lastAddedDate: new Date().toISOString(),
            // 上下文資訊
            section: context.section,
            line: context.line,
            contextName: context.context || ''
        };

        items.push(newItem);
        this.saveItems(items);

        console.log(`📝 已加入複習列表: "${word}"`);
        return newItem;
    }

    /**
     * 複習項目
     * @param {number} itemId - 項目 ID
     * @param {number} quality - 回答品質 (0-5)
     * @returns {Object} 更新後的項目
     */
    reviewItem(itemId, quality) {
        const items = this.getItems();
        const itemIndex = items.findIndex(i => i.id === itemId);

        if (itemIndex === -1) {
            console.warn('找不到複習項目:', itemId);
            return null;
        }

        const item = items[itemIndex];
        const updates = this.calculateNextReview(item, quality);
        Object.assign(item, updates);

        // 更新今日已複習計數
        this.reviewedToday++;
        localStorage.setItem('srs_reviewed_today', String(this.reviewedToday));

        this.saveItems(items);

        console.log(`✅ 已複習: "${item.word}", 下次複習: ${updates.interval} 天後`);
        return item;
    }

    /**
     * 獲取今日待複習項目
     * @returns {Array} 待複習項目列表
     */
    getDueItems() {
        const items = this.getItems();
        const today = new Date();

        return items.filter(item => {
            const dueDate = new Date(item.nextReviewDate);
            return dueDate <= today;
        }).sort((a, b) => {
            // 優先顯示錯誤次數多的
            return (b.errorCount || 1) - (a.errorCount || 1);
        });
    }

    /**
     * 計算記憶強度 (0-100)
     * @param {Object} item - 複習項目
     * @returns {number} 記憶強度百分比
     */
    getMemoryStrength(item) {
        if (!item.lastReviewDate) {
            return 0;
        }

        const daysSinceReview = Math.floor(
            (Date.now() - new Date(item.lastReviewDate)) / (1000 * 60 * 60 * 24)
        );

        if (item.interval <= 0) {
            return 0;
        }

        const strength = Math.max(0, 100 - (daysSinceReview / item.interval * 100));
        return Math.round(strength);
    }

    /**
     * 獲取統計數據
     * @returns {Object} 統計資訊
     */
    getStats() {
        const items = this.getItems();
        const dueItems = this.getDueItems();

        // 計算平均記憶強度
        let totalStrength = 0;
        items.forEach(item => {
            totalStrength += this.getMemoryStrength(item);
        });
        const avgStrength = items.length > 0 ? Math.round(totalStrength / items.length) : 0;

        return {
            total: items.length,
            dueToday: dueItems.length,
            reviewedToday: this.reviewedToday,
            averageStrength: avgStrength
        };
    }

    /**
     * 刪除複習項目
     * @param {number} itemId - 項目 ID
     * @returns {boolean} 是否成功刪除
     */
    removeItem(itemId) {
        const items = this.getItems();
        const newItems = items.filter(i => i.id !== itemId);

        if (newItems.length < items.length) {
            this.saveItems(newItems);
            return true;
        }
        return false;
    }

    /**
     * 清空所有複習項目（謹慎使用）
     */
    clearAll() {
        this.saveItems([]);
        this.reviewedToday = 0;
        localStorage.setItem('srs_reviewed_today', '0');
    }
}

// ═══════════════════════════════════════════════════════════════
// 自動初始化
// ═══════════════════════════════════════════════════════════════

// 等待 GlobalDataManager 載入後初始化
function initSpacedRepetitionEngine() {
    if (window.globalDataManager) {
        window.spacedRepetitionEngine = new SpacedRepetitionEngine(window.globalDataManager);
        console.log('✅ 間隔重複引擎已初始化');
    } else {
        console.warn('⚠️ GlobalDataManager 尚未載入，間隔重複引擎延遲初始化');
        setTimeout(initSpacedRepetitionEngine, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpacedRepetitionEngine);
} else {
    initSpacedRepetitionEngine();
}

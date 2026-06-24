/**
 * ═══════════════════════════════════════════════════════════════
 * 檔案名稱：global-data-manager.js
 * 功能說明：楞嚴咒修行道場 - 全域資料管理器
 * 用途：統一管理使用者資料，確保所有頁面資料同步
 * 最後更新：2025-12-01
 * ═══════════════════════════════════════════════════════════════
 */

class GlobalDataManager {
    constructor() {
        this.storageKey = 'shurangama_user_data_v2';
        this.userData = null;
        this.listeners = [];
    }

    /**
     * 初始化資料管理器
     */
    init() {
        this.loadUserData();
        this.setupStorageListener();
        this.updateUI();
        return this;
    }

    /**
     * 載入使用者資料
     */
    loadUserData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.userData = JSON.parse(saved);
                // 合併預設值（確保新增的欄位有預設值）
                this.userData = { ...this.getDefaultData(), ...this.userData };
            } else {
                this.userData = this.getDefaultData();
                this.saveUserData();
            }
        } catch (error) {
            console.error('載入使用者資料失敗:', error);
            this.userData = this.getDefaultData();
        }
        return this.userData;
    }

    /**
     * 獲取預設資料
     */
    getDefaultData() {
        return {
            // 基本資訊
            userName: '修行者',
            userAvatar: 'avatars/praying_monk.png',

            // 遊戲進度
            level: 1,
            xp: 0,
            merit: 50,

            // 劇情進度
            firstVisit: true,
            storyCompleted: false,
            storyRead: false,

            // 學習統計
            totalQuestions: 0,
            correctAnswers: 0,
            totalStudyTime: 0,
            sectionsCompleted: [],

            // 打卡系統
            streakDays: 0,
            maxStreak: 0,
            lastCheckinDate: null,
            checkinHistory: [],

            // 錯誤分析
            weakPoints: {},
            errorHistory: [],

            // 成就系統
            achievements: [],
            unlockedSkills: [],

            // 間隔重複系統
            reviewItems: [],

            // 學習路徑追蹤
            learningPath: {
                completedSections: [],      // 已完成的會別 ['assembly0', 'assembly1']
                currentSection: 'assembly0', // 當前學習章節
                sectionProgress: {},         // 各會別進度 { 'assembly1': { correct: 50, total: 81 } }
                lastStudyDate: null
            },

            // 動態難度系統
            difficultyLevel: 2,           // 當前難度等級 (1-4)
            sessionPerformance: [],       // 最近表現記錄

            // 21天漸進式課程追蹤
            study21DayProgress: {
                enabled: false,
                startDate: null,
                currentDay: 0,
                curriculum: 'assembly0_unit0-20',
                units: {},  // { 'assembly0_unit0': { mastery: 85, status: 'mastered', lastReviewDate: null, completionCount: 3 }, ... }
                dailyMastery: [],  // 每日掌握度 [Day, Score]
                streakDays: 0,
                maxStreak: 0,
                milestonesUnlocked: [],  // [7, 14, 21]
                certificateIssued: false
            },

            // 時間戳
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * 儲存使用者資料
     */
    saveUserData() {
        try {
            this.userData.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.userData));
            this.broadcastUpdate();
            this.updateUI();
        } catch (error) {
            console.error('儲存使用者資料失敗:', error);
        }
    }

    /**
     * 廣播資料更新事件
     */
    broadcastUpdate() {
        // 觸發自定義事件
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
            detail: this.userData
        }));

        // 通知所有監聽器
        this.listeners.forEach(callback => {
            try {
                callback(this.userData);
            } catch (error) {
                console.error('監聽器執行失敗:', error);
            }
        });
    }

    /**
     * 設定 storage 監聽器（跨頁面同步）
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                try {
                    this.userData = JSON.parse(e.newValue);
                    this.updateUI();
                    this.broadcastUpdate();
                } catch (error) {
                    console.error('同步資料失敗:', error);
                }
            }
        });
    }

    /**
     * 更新 UI（導航欄等）
     */
    updateUI() {
        // 更新導航欄的功德和等級
        const meritEl = document.getElementById('nav-merit');
        const levelEl = document.getElementById('nav-level');

        if (meritEl) meritEl.textContent = this.userData.merit;
        if (levelEl) levelEl.textContent = this.userData.level;

        // 更新使用者名稱（如果有的話）
        const userNameEls = document.querySelectorAll('.user-name-display');
        userNameEls.forEach(el => {
            el.textContent = this.userData.userName;
        });
    }

    /**
     * 添加資料變更監聽器
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * 移除資料變更監聽器
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 更新使用者名稱
     */
    updateUserName(name) {
        this.userData.userName = name || '修行者';
        this.saveUserData();
    }

    /**
     * 更新使用者頭像
     */
    updateUserAvatar(avatar) {
        this.userData.userAvatar = avatar || 'avatars/praying_monk.png';
        this.saveUserData();
    }

    /**
     * 增加經驗值
     */
    addXP(amount) {
        this.userData.xp += amount;
        const newLevel = this.calculateLevel(this.userData.xp);

        if (newLevel > this.userData.level) {
            const oldLevel = this.userData.level;
            this.userData.level = newLevel;
            this.saveUserData();

            // 觸發升級事件
            window.dispatchEvent(new CustomEvent('levelUp', {
                detail: { oldLevel, newLevel, xp: this.userData.xp }
            }));

            return { leveledUp: true, oldLevel, newLevel };
        }

        this.saveUserData();
        return { leveledUp: false };
    }

    /**
     * 增加功德
     */
    addMerit(amount) {
        this.userData.merit += amount;
        this.saveUserData();
    }

    /**
     * 扣除功德
     */
    deductMerit(amount) {
        if (this.userData.merit >= amount) {
            this.userData.merit -= amount;
            this.saveUserData();
            return true;
        }
        return false;
    }

    /**
     * 計算等級
     */
    calculateLevel(xp) {
        const levels = [0, 100, 300, 700, 1500, 3200, 6500, 12000, 25000, 50000];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (xp >= levels[i]) return i + 1;
        }
        return 1;
    }

    /**
     * 獲取當前等級所需經驗值
     */
    getLevelXPRequirements() {
        const levels = [0, 100, 300, 700, 1500, 3200, 6500, 12000, 25000, 50000, Infinity];
        const currentLevel = this.userData.level;
        const currentLevelBaseXp = levels[currentLevel - 1];
        const nextLevelTargetXp = levels[currentLevel];
        const xpInCurrentLevel = this.userData.xp - currentLevelBaseXp;
        const xpForNextLevel = nextLevelTargetXp - currentLevelBaseXp;

        return {
            currentLevel,
            currentXP: this.userData.xp,
            currentLevelBaseXp,
            nextLevelTargetXp,
            xpInCurrentLevel,
            xpForNextLevel,
            percentage: xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 0
        };
    }

    /**
     * 記錄錯誤
     */
    recordError(word, context = '', location = {}) {
        // 更新弱點記錄
        if (!this.userData.weakPoints[word]) {
            this.userData.weakPoints[word] = {
                errors: 0,
                lastError: null,
                contexts: [],
                locations: []
            };
        }

        this.userData.weakPoints[word].errors++;
        this.userData.weakPoints[word].lastError = new Date().toISOString();

        if (context && !this.userData.weakPoints[word].contexts.includes(context)) {
            this.userData.weakPoints[word].contexts.push(context);
        }

        // 記錄位置
        if (location.section !== undefined) {
            const locationKey = `${location.section}-${location.page || 0}-${location.line || 0}`;
            const existingLocation = this.userData.weakPoints[word].locations.find(
                loc => `${loc.section}-${loc.page || 0}-${loc.line || 0}` === locationKey
            );

            if (existingLocation) {
                existingLocation.count = (existingLocation.count || 1) + 1;
                existingLocation.lastError = new Date().toISOString();
            } else {
                this.userData.weakPoints[word].locations.push({
                    section: location.section,
                    page: location.page || 0,
                    line: location.line || 0,
                    count: 1,
                    lastError: new Date().toISOString()
                });
            }
        }

        // 記錄錯誤歷史
        this.userData.errorHistory.push({
            word,
            context,
            location,
            timestamp: new Date().toISOString()
        });

        // 限制歷史記錄數量
        if (this.userData.errorHistory.length > 1000) {
            this.userData.errorHistory = this.userData.errorHistory.slice(-500);
        }

        // ✨ 自動同步到 SRS 間隔重複學習系統
        GlobalDataManager.addToSRS(word);

        this.saveUserData();
    }

    /**
     * 將答錯的詞句加入 SRS 複習清單（srs_items）
     * 若該詞句已存在，則不重複新增
     * @param {string} word - 答錯的詞句
     */
    static addToSRS(word) {
        if (!word || !word.trim()) return;
        try {
            const raw = localStorage.getItem('srs_items');
            const items = raw ? JSON.parse(raw) : [];

            // 避免重複新增
            const exists = items.some(item => item.word === word);
            if (exists) return;

            // 建立新的 SRS 項目（SM-2 初始值）
            const newItem = {
                id: Date.now() + Math.random(), // 避免同時新增時 ID 碰撞
                word: word,
                easiness: 2.5,
                interval: 0,
                repetitions: 0,
                nextReviewDate: new Date().toISOString(),
                lastReviewDate: null,
                source: 'auto' // 標記為自動加入
            };

            items.push(newItem);
            localStorage.setItem('srs_items', JSON.stringify(items));
            console.log(`📚 SRS：已自動加入「${word}」到複習清單`);
        } catch (e) {
            console.warn('SRS 同步失敗：', e);
        }
    }

    /**
     * 獲取統計資料
     */
    getStatistics() {
        const accuracy = this.userData.totalQuestions > 0 ?
            Math.round((this.userData.correctAnswers / this.userData.totalQuestions) * 100) : 0;

        return {
            level: this.userData.level,
            xp: this.userData.xp,
            merit: this.userData.merit,
            streakDays: this.userData.streakDays,
            maxStreak: this.userData.maxStreak,
            totalQuestions: this.userData.totalQuestions,
            correctAnswers: this.userData.correctAnswers,
            accuracy: accuracy,
            totalStudyTime: this.userData.totalStudyTime,
            sectionsCompleted: this.userData.sectionsCompleted.length
        };
    }

    /**
     * 獲取弱點分析
     */
    getWeakPointsAnalysis() {
        const weakPoints = Object.entries(this.userData.weakPoints)
            .sort(([, a], [, b]) => b.errors - a.errors)
            .slice(0, 10)
            .map(([word, data]) => ({
                word,
                errors: data.errors,
                lastError: data.lastError,
                contexts: data.contexts,
                locations: data.locations || []
            }));

        return {
            totalErrors: this.userData.errorHistory.length,
            uniqueWeakPoints: Object.keys(this.userData.weakPoints).length,
            topWeakPoints: weakPoints
        };
    }

    /**
     * 重置資料（謹慎使用）
     */
    resetData() {
        if (confirm('確定要重置所有資料嗎？此操作無法復原！')) {
            this.userData = this.getDefaultData();
            this.saveUserData();
            return true;
        }
        return false;
    }

    /**
     * 匯出資料（備份）
     */
    exportData() {
        const dataStr = JSON.stringify(this.userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shurangama-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 匯入資料（還原）
     */
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.userData = { ...this.getDefaultData(), ...data };
                    this.saveUserData();
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * 獲取套餐數據
     * 整合 package-storage.js 的讀取功能
     * @returns {Object|null} 套餐數據對象，如果不存在或無效則返回 null
     */
    getPackageData() {
        try {
            const data = localStorage.getItem('packages');
            if (!data) {
                console.warn('No package data found in localStorage');
                return null;
            }

            const packages = JSON.parse(data);

            // 驗證數據結構
            if (!this.validatePackageData(packages)) {
                console.error('Invalid package data structure detected');
                return null;
            }

            return packages;
        } catch (error) {
            console.error('Failed to get package data:', error);
            return null;
        }
    }

    /**
     * 保存套餐數據
     * 整合 package-storage.js 的寫入功能
     * @param {Object} packageData - 套餐數據對象
     * @returns {boolean} 是否成功保存
     */
    savePackageData(packageData) {
        try {
            // 驗證數據結構
            if (!this.validatePackageData(packageData)) {
                console.error('Invalid package data structure, cannot save');
                return false;
            }

            // 保存到 localStorage
            localStorage.setItem('packages', JSON.stringify(packageData));

            // 更新時間戳
            this.userData.lastUpdated = new Date().toISOString();
            this.saveUserData();

            // 廣播更新事件
            window.dispatchEvent(new CustomEvent('packageDataUpdated', {
                detail: packageData
            }));

            return true;
        } catch (error) {
            console.error('Failed to save package data:', error);

            // 檢查是否是容量限制錯誤
            if (error.name === 'QuotaExceededError') {
                console.error('LocalStorage quota exceeded. Consider cleaning up old data.');
                // 嘗試清理舊數據
                this.cleanupOldPackageData();
                // 重試保存
                try {
                    localStorage.setItem('packages', JSON.stringify(packageData));
                    return true;
                } catch (retryError) {
                    console.error('Failed to save even after cleanup:', retryError);
                    return false;
                }
            }

            return false;
        }
    }

    /**
     * 驗證套餐數據結構是否有效
     * @param {Object} packages - 套餐數據對象
     * @returns {boolean} 是否有效
     */
    validatePackageData(packages) {
        if (!packages || typeof packages !== 'object') {
            return false;
        }

        // 檢查必要的頂層屬性
        if (!packages.daily || typeof packages.daily !== 'object') {
            return false;
        }

        if (!Array.isArray(packages.history)) {
            return false;
        }

        if (!packages.custom || typeof packages.custom !== 'object') {
            return false;
        }

        if (!Array.isArray(packages.custom.templates)) {
            return false;
        }

        if (!Array.isArray(packages.custom.shared)) {
            return false;
        }

        return true;
    }

    /**
     * 清理舊的套餐數據
     * 只保留最近 30 天的詳細記錄
     * @param {number} daysToKeep - 保留的天數（默認 30 天）
     * @returns {boolean} 是否成功清理
     */
    cleanupOldPackageData(daysToKeep = 30) {
        try {
            const packages = this.getPackageData();
            if (!packages) {
                return false;
            }

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            // 清理歷史記錄
            if (Array.isArray(packages.history)) {
                packages.history = packages.history.filter(pkg => {
                    if (!pkg.createdAt) return false;
                    const pkgDate = new Date(pkg.createdAt);
                    return pkgDate >= cutoffDate;
                });
            }

            // 清理每日套餐記錄
            if (packages.daily && typeof packages.daily === 'object') {
                const dailyKeys = Object.keys(packages.daily);
                dailyKeys.forEach(dateKey => {
                    try {
                        const pkgDate = new Date(dateKey);
                        if (pkgDate < cutoffDate) {
                            delete packages.daily[dateKey];
                        }
                    } catch (error) {
                        console.warn(`Invalid date key: ${dateKey}`);
                    }
                });
            }

            // 保存清理後的數據
            return this.savePackageData(packages);
        } catch (error) {
            console.error('Failed to cleanup old package data:', error);
            return false;
        }
    }

    /**
     * 初始化套餐數據結構
     * 如果數據不存在或損壞，則創建默認結構
     * @returns {boolean} 是否成功初始化
     */
    initializePackageData() {
        try {
            const packages = this.getPackageData();

            // 如果數據不存在或無效，創建默認結構
            if (!packages) {
                const defaultPackages = {
                    daily: {},      // 按日期索引的每日套餐
                    history: [],    // 歷史套餐列表
                    custom: {
                        templates: [], // 自訂範本
                        shared: []     // 分享的套餐
                    }
                };

                const success = this.savePackageData(defaultPackages);
                if (success) {
                    console.log('Package data initialized with default structure');
                }
                return success;
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize package data:', error);
            return false;
        }
    }
}

// 創建全域實例
const globalDataManager = new GlobalDataManager();

// 頁面載入時自動初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        globalDataManager.init();
    });
} else {
    globalDataManager.init();
}

// 匯出到全域
window.globalDataManager = globalDataManager;

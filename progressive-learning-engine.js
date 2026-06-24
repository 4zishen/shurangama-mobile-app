/**
 * Progressive Learning Engine
 * 漸進式學習引擎 - 管理學習進度、解鎖邏輯和掌握程度評估
 */

class ProgressiveLearningEngine {
    constructor(dataManager, srsEngine) {
        this.dataManager = dataManager;
        this.srsEngine = srsEngine;
        this.progressData = null;
        
        // 配置參數
        this.unlockThreshold = 0.8;  // 80% 解鎖閾值
        this.assemblyUnlockThreshold = 0.9;  // 90% 會別解鎖閾值
        this.weaknessThreshold = 0.6;  // 60% 弱點閾值
        
        // 楞嚴咒結構（簡化版，實際應從資料源載入）
        this.mantraStructure = {
            assemblies: [
                { id: 0, name: '第一會', totalUnits: 60 },
                { id: 1, name: '第二會', totalUnits: 10 },
                { id: 2, name: '第三會', totalUnits: 59 },
                { id: 3, name: '第四會', totalUnits: 52 },
                { id: 4, name: '第五會', totalUnits: 89 }
            ]
        };
        
        // 操作佇列（防止並發問題）
        this.operationQueue = [];
        this.isProcessing = false;
    }

    // ==================== 初始化與資料載入 ====================

    /**
     * 初始化漸進式學習系統
     */
    async init() {
        try {
            this.progressData = this.loadProgress();
            console.log('漸進式學習系統初始化完成');
            return true;
        } catch (error) {
            console.error('初始化失敗:', error);
            this.progressData = this.getDefaultProgress();
            return false;
        }
    }

    /**
     * 載入進度資料
     */
    loadProgress() {
        try {
            if (!this.dataManager || !this.dataManager.userData) {
                console.warn('Data Manager 未初始化，使用預設進度');
                return this.getDefaultProgress();
            }

            const data = this.dataManager.userData.progressiveLearning;
            
            if (!data || !data.progressData) {
                console.warn('未找到進度資料，使用預設初始狀態');
                return this.getDefaultProgress();
            }

            // 驗證並返回資料
            return this.validateProgressData(data.progressData);
        } catch (error) {
            console.error('載入進度資料失敗:', error);
            return this.getDefaultProgress();
        }
    }

    /**
     * 儲存進度資料
     */
    saveProgress() {
        try {
            if (!this.dataManager || !this.dataManager.userData) {
                console.error('Data Manager 未初始化，無法儲存');
                return false;
            }

            // 更新時間戳
            this.progressData.lastUpdated = new Date().toISOString();

            // 儲存到 Global Data Manager
            if (!this.dataManager.userData.progressiveLearning) {
                this.dataManager.userData.progressiveLearning = {};
            }
            
            this.dataManager.userData.progressiveLearning.enabled = true;
            this.dataManager.userData.progressiveLearning.progressData = this.progressData;

            // 觸發 GDM 儲存
            if (typeof this.dataManager.saveUserData === 'function') {
                this.dataManager.saveUserData();
            }

            return true;
        } catch (error) {
            console.error('儲存進度資料失敗:', error);
            return false;
        }
    }

    /**
     * 獲取預設進度資料（第一會前三句解鎖）
     */
    getDefaultProgress() {
        return {
            version: '1.0',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            
            currentAssembly: 0,
            currentUnit: 2,
            
            unlockedUnits: {
                assembly0: [0, 1, 2],
                assembly1: [],
                assembly2: [],
                assembly3: [],
                assembly4: []
            },
            
            masteryLevels: {},
            
            unlockHistory: [],
            
            assemblyCompletion: {
                assembly0: { allUnlocked: false, averageMastery: 0, completedAt: null },
                assembly1: { allUnlocked: false, averageMastery: 0, completedAt: null },
                assembly2: { allUnlocked: false, averageMastery: 0, completedAt: null },
                assembly3: { allUnlocked: false, averageMastery: 0, completedAt: null },
                assembly4: { allUnlocked: false, averageMastery: 0, completedAt: null }
            },
            
            recommendationsEnabled: true,
            lastRecommendationShown: null,
            
            planStarts: {}, // 記錄每個會別學習計畫的開始日期
            dailyStatus: {
                lastCheckIn: null,
                streak: 0
            },
            
            stats: {
                totalUnlocked: 3,
                totalPracticeSessions: 0,
                totalStudyTime: 0,
                averageSessionDuration: 0
            }
        };
    }

    /**
     * 驗證進度資料
     */
    validateProgressData(data) {
        const validated = { ...data };

        // 驗證版本
        if (!validated.version) {
            validated.version = '1.0';
        }

        // 驗證解鎖狀態
        if (!validated.unlockedUnits || typeof validated.unlockedUnits !== 'object') {
            console.warn('解鎖狀態資料無效，重置為預設');
            validated.unlockedUnits = this.getDefaultProgress().unlockedUnits;
        }

        // 確保所有會別都有解鎖陣列
        for (let i = 0; i < 5; i++) {
            const key = `assembly${i}`;
            if (!Array.isArray(validated.unlockedUnits[key])) {
                validated.unlockedUnits[key] = i === 0 ? [0, 1, 2] : [];
            }
        }

        // 驗證掌握程度
        if (!validated.masteryLevels) {
            validated.masteryLevels = {};
        }

        // 驗證掌握程度數值範圍
        for (const [unitId, data] of Object.entries(validated.masteryLevels)) {
            if (data.level < 0 || data.level > 100) {
                console.warn(`單元 ${unitId} 掌握程度無效: ${data.level}，重置為 0`);
                data.level = 0;
            }
        }

        // 驗證其他必要欄位
        if (!validated.unlockHistory) {
            validated.unlockHistory = [];
        }

        if (!validated.assemblyCompletion) {
            validated.assemblyCompletion = this.getDefaultProgress().assemblyCompletion;
        }

        if (!validated.stats) {
            validated.stats = this.getDefaultProgress().stats;
        }

        if (!validated.planStarts) {
            validated.planStarts = {};
        }

        if (!validated.dailyStatus) {
            validated.dailyStatus = this.getDefaultProgress().dailyStatus;
        }

        return validated;
    }

    // ==================== 解鎖狀態查詢 ====================

    /**
     * 檢查單元是否已解鎖
     */
    isUnitUnlocked(assemblyId, unitIndex) {
        if (!this.progressData) return false;
        
        const key = `assembly${assemblyId}`;
        const unlockedUnits = this.progressData.unlockedUnits[key] || [];
        
        return unlockedUnits.includes(unitIndex);
    }

    /**
     * 獲取已解鎖單元總數
     */
    getUnlockedCount() {
        if (!this.progressData) return 0;
        
        let count = 0;
        for (let i = 0; i < 5; i++) {
            const key = `assembly${i}`;
            count += (this.progressData.unlockedUnits[key] || []).length;
        }
        
        return count;
    }

    /**
     * 獲取總單元數
     */
    getTotalUnits() {
        return this.mantraStructure.assemblies.reduce((sum, assembly) => sum + assembly.totalUnits, 0);
    }

    /**
     * 計算整體進度百分比
     */
    calculateOverallProgress() {
        const unlocked = this.getUnlockedCount();
        const total = this.getTotalUnits();
        
        return total > 0 ? Math.round((unlocked / total) * 100) : 0;
    }

    // ==================== 21 天學習計畫邏輯 ====================

    /**
     * 獲取今日學習計畫狀態
     */
    getDailyPlanStatus() {
        if (!this.progressData) return null;

        const currentAssemblyId = this.progressData.currentAssembly;
        const assemblyInfo = this.mantraStructure.assemblies[currentAssemblyId];
        if (!assemblyInfo) return null;

        const totalUnits = assemblyInfo.totalUnits;
        const key = `assembly${currentAssemblyId}`;

        // 確保有開始日期
        if (!this.progressData.planStarts[key]) {
            this.progressData.planStarts[key] = new Date().toISOString();
            this.saveProgress();
        }

        const startDate = new Date(this.progressData.planStarts[key]);
        const today = new Date();
        // 將時間歸零以計算天數差
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = today - startDate;
        const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 階段參數 (預設 21 天)
        let totalDays = 21;
        let p1End = 7;
        let p2End = 14;

        // 特殊調整
        if (currentAssemblyId === 1) { // 第二會：短
            p1End = 3;
            p2End = 10;
        } else if (currentAssemblyId === 4) { // 第五會：長
            totalDays = 28;
            p1End = 14;
            p2End = 21;
        }

        // 判定階段
        let phase = 1;
        let phaseName = "第一階段：播種與熟悉";
        let phaseGoal = "不求背誦，只求「口齒順暢、耳朵熟悉」。";
        let phaseMindset = "遇到卡卡的字不要氣餒，只要能跟著音頻順順唸過去就好，這階段依賴「拼音」是完全可以的。";
        
        if (currentDay > p2End) {
            phase = 3;
            phaseName = "第三階段：精熟與內化";
            phaseGoal = "達到無字天書的境界，並攻克常錯弱點。";
            phaseMindset = "這階段重點在於「輸出」與「除錯」。透過測驗精準抓出記憶盲區。";
        } else if (currentDay > p1End) {
            phase = 2;
            phaseName = "第二階段：建構與拆解";
            phaseGoal = "建立句子結構的肌肉記憶，逐漸脫離拼音。";
            phaseMindset = "開始嘗試「眼看漢字、心讀拼音」，利用拼圖模式加深對詞組順序的理解。";
        }

        // 會別特殊提示
        const specialTips = {
            0: "第一會最長（約 60 句），需要極大耐心。第一週資訊量較大，請堅持度過。",
            1: "第二會最短，學習週期已為您縮短。多出來的時間可用於複習第一會。",
            2: "第三會包含許多「揭囉訶」、「婆夜」等重複句型，拼圖模式時需注意前綴。",
            3: "第四會包含大量「弊泮」、「泮吒」，問答模式能幫您釐清相似音。",
            4: "第五會句數最多（約 89 句），計畫已自動延長至 28 天，請穩紮穩打。"
        }[currentAssemblyId] || "";

        // 下面是任務清單
        const tasks = this.getTasksByPhase(phase, currentAssemblyId);
        
        // 每日新進度計算 (僅 Phase 1)
        let dailyGoal = null;
        if (phase === 1) {
            const unitsPerDay = Math.ceil(totalUnits / p1End);
            const startUnit = (currentDay - 1) * unitsPerDay;
            const endUnit = Math.min(totalUnits - 1, currentDay * unitsPerDay - 1);
            if (startUnit < totalUnits) {
                dailyGoal = { 
                    start: startUnit, 
                    end: endUnit, 
                    count: (endUnit - startUnit + 1) 
                };
            }
        }

        return {
            currentDay,
            totalDays,
            phase,
            phaseName,
            phaseGoal,
            phaseMindset,
            tasks,
            dailyGoal,
            specialTip: specialTips,
            assemblyName: assemblyInfo.name
        };
    }

    /**
     * 根據階段獲取任務
     */
    getTasksByPhase(phase, assemblyId) {
        const tasks = [];
        
        if (phase === 1) {
            tasks.push({ id: 'listen', title: '聽（預設模式）', desc: '看著拼音，連續聽今日進度 3-5 次。' });
            tasks.push({ id: 'read', title: '讀（跟讀模式）', desc: '開啟錄音，看著拼音跟著唸 3-5 次。' });
            tasks.push({ id: 'checkin', title: '打卡', desc: '前往修行道場完成本日修行紀錄。' });
        } else if (phase === 2) {
            tasks.push({ id: 'hide_pinyin', title: '隱藏拼音', desc: '嘗試看著漢字跟讀大區塊。卡住才看拼音。' });
            tasks.push({ id: 'puzzle', title: '解（拼圖模式）', desc: '使用拼圖模式，建立詞組先後順序感。' });
            tasks.push({ id: 'review_weakness', title: '弱點複習', desc: '完成修行道場中的「待複習項目」。' });
        } else if (phase === 3) {
            tasks.push({ id: 'quiz', title: '測（問答模式）', desc: '進行克漏字測驗，精準抓出記憶模糊處。' });
            tasks.push({ id: 'srs_breakthrough', title: '重點突破', desc: '針對弱點排行榜前幾名進行直接練習。' });
            tasks.push({ id: 'full_recitation', title: '全會大串連', desc: '不看拼音，順暢唸誦或背誦全會 1-2 遍。' });
        }
        
        return tasks;
    }

    /**
     * 每日 20 分鐘 SOP 指引
     */
    getDailySOP() {
        return [
            { id: 'warmup', time: 3, title: '【熱身】今日待複習', desc: '清空 SRS 禪修記憶卡，讓大腦暖機。' },
            { id: 'main', time: 12, title: '【主菜】經文練習', desc: '執行上述階段任務（聽/讀/拼圖/問答）。' },
            { id: 'strengthen', time: 4, title: '【加強】弱點排行榜', desc: '針對紅字（常錯句）用錄音多跟讀幾次。' },
            { id: 'harvest', time: 1, title: '【收成】每日打卡', desc: '按下「今日尚未打卡」，領取功德獎勵！' }
        ];
    }

    /**
     * 獲取當前階段的推薦模式
     * @returns {Object} { mode: string, emoji: string, title: string, color: string }
     */
    getRecommendedMode() {
        const plan = this.getDailyPlanStatus();
        if (!plan) return { mode: 'default', emoji: '🔊', title: '預設模式', color: '#3b82f6' };

        const phase = plan.phase;
        
        if (phase === 1) {
            return {
                mode: 'default',
                emoji: '🔊',
                title: '聽模式',
                color: '#3b82f6',
                description: '今天專注於聽！看著拼音，讓耳朵熟悉每一個字。'
            };
        } else if (phase === 2) {
            return {
                mode: 'puzzle',
                emoji: '🧩',
                title: '拼圖模式',
                color: '#8b5cf6',
                description: '今天專注於讀！透過拼圖建立句子結構的記憶。'
            };
        } else {
            return {
                mode: 'quiz',
                emoji: '❓',
                title: '問答模式',
                color: '#ef4444',
                description: '今天專注於測！用克漏字測驗精準抓出弱點。'
            };
        }
    }

    /**
     * 獲取今日完整學習套裝（含任務、時間、推薦順序）
     * @returns {Object} 完整配套的學習計劃
     */
    getDailyLearningPack() {
        const plan = this.getDailyPlanStatus();
        if (!plan) return null;

        const recommended = this.getRecommendedMode();
        const sop = this.getDailySOP();

        // 根據階段構建具體的學習套裝
        let learningPack = {
            date: new Date().toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
            day: plan.currentDay,
            totalDays: plan.totalDays,
            phase: plan.phase,
            phaseName: plan.phaseName,
            assemblyName: plan.assemblyName,
            
            // 推薦模式
            recommendedMode: recommended.mode,
            recommendedEmoji: recommended.emoji,
            recommendedTitle: recommended.title,
            recommendedColor: recommended.color,

            // 每日目標
            dailyGoal: plan.dailyGoal, // { start, end, count }

            // 時間規劃（分鐘）
            totalTime: sop.reduce((sum, s) => sum + s.time, 0),
            timeSOP: sop,

            // 具體任務清單
            tasks: plan.tasks || [],

            // 特殊提示
            specialTip: plan.specialTip || '',
            phaseGoal: plan.phaseGoal || '',
            phaseMindset: plan.phaseMindset || '',

            // 學習套裝簡介
            packTitle: this.generatePackTitle(plan.phase),
            packInstructions: this.generatePackInstructions(plan.phase, plan.dailyGoal)
        };

        return learningPack;
    }

    /**
     * 根據階段生成學習套裝標題
     */
    generatePackTitle(phase) {
        const titles = {
            1: '🌱 【播種階段】聽力開發套裝',
            2: '🌿 【成長階段】拼圖強化套裝',
            3: '🌸 【綻放階段】問答精熟套裝'
        };
        return titles[phase] || '📚 每日學習套裝';
    }

    /**
     * 根據階段生成具體的學習指引
     */
    generatePackInstructions(phase, dailyGoal) {
        if (phase === 1) {
            const unitCount = dailyGoal ? (dailyGoal.end - dailyGoal.start + 1) : 3;
            return `
1️⃣ 【聽】選擇第 ${dailyGoal?.start + 1}-${dailyGoal?.end + 1} 句，重複播放 3-5 次
   ⏱️ 約 3-5 分鐘 | 🎯 熟悉發音，不求背誦

2️⃣ 【讀】開啟拼音，看著唸誦 3-5 次
   ⏱️ 約 3-5 分鐘 | 🎯 口齒順暢，建立節奏

3️⃣ 【背】嘗試不看拼音背誦 1-2 次
   ⏱️ 約 2-3 分鐘 | 🎯 檢驗學習成果

✅ 今日完成：${unitCount} 句 × 3 模式 = ${unitCount * 3} 次練習
            `;
        } else if (phase === 2) {
            return `
1️⃣ 【隱藏拼音】試著看著漢字跟讀大區塊
   ⏱️ 約 5 分鐘 | 🎯 漸進式脫離拼音依賴

2️⃣ 【拼圖模式】拖拽詞句，建立句子結構感
   ⏱️ 約 10 分鐘 | 🎯 掌握詞序，深化記憶

3️⃣ 【複習舊內容】回顧前兩會的弱點
   ⏱️ 約 5 分鐘 | 🎯 鞏固基礎，防止遺忘

✅ 完成條件：拼圖模式掌握度達 60% 以上
            `;
        } else {
            return `
1️⃣ 【克漏字測驗】進行問答模式練習
   ⏱️ 約 8 分鐘 | 🎯 抓出記憶盲區

2️⃣ 【弱點強化】針對常錯句進行錄音練習
   ⏱️ 約 5 分鐘 | 🎯 精準除錯

3️⃣ 【全會背誦】不看任何提示，順暢唸誦全會
   ⏱️ 約 10 分鐘 | 🎯 驗證掌握度達成

✅ 完成條件：克漏字測驗正確率達 80% 以上
            `;
        }
    }

    // ==================== 掌握程度計算 ====================



    /**
     * 拼圖模式掌握程度計算
     * @param {number} completionTime - 完成時間（秒）
     * @param {number} errors - 錯誤次數
     * @returns {number} 掌握程度 (0-100)
     */
    calculatePuzzleMastery(completionTime, errors) {
        // 基準：30 秒內完成且無錯誤 = 100%
        const baseTime = 30;
        const timeScore = Math.max(0, 100 - (completionTime - baseTime) * 2);
        const errorPenalty = errors * 10;
        
        return Math.max(0, Math.min(100, timeScore - errorPenalty));
    }

    /**
     * 問答模式掌握程度計算
     * @param {number} correct - 正確答題數
     * @param {number} total - 總題數
     * @returns {number} 掌握程度 (0-100)
     */
    calculateQuizMastery(correct, total) {
        if (total === 0) return 0;
        return Math.round((correct / total) * 100);
    }

    /**
     * 跟讀模式掌握程度計算
     * @param {number} completionCount - 完成次數
     * @returns {number} 掌握程度 (0-100)
     */
    calculateFollowMastery(completionCount) {
        // 完成 3 次 = 100%
        return Math.min(100, Math.round((completionCount / 3) * 100));
    }

    /**
     * 計算綜合掌握程度（加權平均）
     * @param {Object} modeBreakdown - 各模式的掌握程度 { puzzle: 90, quiz: 80, follow: 85 }
     * @returns {number} 綜合掌握程度 (0-100)
     */
    calculateOverallMastery(modeBreakdown) {
        // 加權：拼圖 30%、問答 40%、跟讀 30%
        const weights = { puzzle: 0.3, quiz: 0.4, follow: 0.3 };
        let totalWeight = 0;
        let weightedSum = 0;

        for (const [mode, score] of Object.entries(modeBreakdown)) {
            if (score !== null && score !== undefined && weights[mode]) {
                weightedSum += score * weights[mode];
                totalWeight += weights[mode];
            }
        }

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }

    /**
     * 根據練習結果計算並更新掌握程度
     * @param {string} unitId - 單元 ID (e.g., "assembly0_unit0")
     * @param {string} mode - 學習模式 ("puzzle", "quiz", "follow")
     * @param {Object} performance - 練習表現資料
     * @returns {number} 計算出的掌握程度
     */
    calculateMasteryLevel(unitId, mode, performance) {
        let mastery = 0;

        switch (mode) {
            case 'puzzle':
                mastery = this.calculatePuzzleMastery(
                    performance.completionTime || 0,
                    performance.errors || 0
                );
                break;
            case 'quiz':
                mastery = this.calculateQuizMastery(
                    performance.correct || 0,
                    performance.total || 1
                );
                break;
            case 'follow':
                mastery = this.calculateFollowMastery(
                    performance.completionCount || 0
                );
                break;
            default:
                console.warn(`未知的學習模式: ${mode}`);
                return 0;
        }

        // 更新單元的掌握程度
        this.updateMasteryLevel(unitId, mastery, mode);

        return mastery;
    }

    /**
     * 更新單元的掌握程度
     * @param {string} unitId - 單元 ID
     * @param {number} newLevel - 新的掌握程度
     * @param {string} mode - 學習模式（可選）
     */
    updateMasteryLevel(unitId, newLevel, mode = null) {
        if (!this.progressData.masteryLevels[unitId]) {
            this.progressData.masteryLevels[unitId] = {
                level: 0,
                lastPracticed: new Date().toISOString(),
                practiceCount: 0,
                modeBreakdown: {
                    puzzle: null,
                    quiz: null,
                    follow: null
                }
            };
        }

        const unitData = this.progressData.masteryLevels[unitId];

        // 更新模式分數
        if (mode && unitData.modeBreakdown) {
            unitData.modeBreakdown[mode] = Math.max(0, Math.min(100, newLevel));
        }

        // 計算綜合掌握程度
        unitData.level = this.calculateOverallMastery(unitData.modeBreakdown);
        unitData.lastPracticed = new Date().toISOString();
        unitData.practiceCount = (unitData.practiceCount || 0) + 1;

        // 儲存進度
        this.saveProgress();
    }

    /**
     * 獲取單元的掌握程度
     * @param {string} unitId - 單元 ID
     * @returns {number} 掌握程度 (0-100)
     */
    getMasteryLevel(unitId) {
        if (!this.progressData.masteryLevels[unitId]) {
            return 0;
        }
        return this.progressData.masteryLevels[unitId].level || 0;
    }

    /**
     * 獲取會別的平均掌握程度
     * @param {number} assemblyId - 會別 ID (0-4)
     * @returns {number} 平均掌握程度 (0-100)
     */
    getAverageMasteryLevel(assemblyId) {
        const key = `assembly${assemblyId}`;
        const unlockedUnits = this.progressData.unlockedUnits[key] || [];

        if (unlockedUnits.length === 0) return 0;

        let totalMastery = 0;
        for (const unitIndex of unlockedUnits) {
            const unitId = `${key}_unit${unitIndex}`;
            totalMastery += this.getMasteryLevel(unitId);
        }

        return Math.round(totalMastery / unlockedUnits.length);
    }

    // ==================== 解鎖邏輯 ====================

    /**
     * 檢查是否滿足解鎖條件
     * @returns {boolean} 是否可以解鎖新單元
     */
    checkUnlockConditions() {
        const currentAssembly = this.progressData.currentAssembly;
        const avgMastery = this.getAverageMasteryLevel(currentAssembly);
        
        // 檢查平均掌握程度是否 >= 80%
        if (avgMastery < this.unlockThreshold * 100) {
            return false;
        }

        // 檢查是否還有未解鎖的單元
        const nextUnit = this.findNextUnitToUnlock();
        return nextUnit !== null;
    }

    /**
     * 找到下一個待解鎖的單元
     * @returns {Object|null} 單元資訊或 null
     */
    findNextUnitToUnlock() {
        const currentAssembly = this.progressData.currentAssembly;
        const key = `assembly${currentAssembly}`;
        const unlockedUnits = this.progressData.unlockedUnits[key] || [];
        const totalUnits = this.mantraStructure.assemblies[currentAssembly].totalUnits;

        // 找到第一個未解鎖的單元
        for (let i = 0; i < totalUnits; i++) {
            if (!unlockedUnits.includes(i)) {
                return {
                    assemblyId: currentAssembly,
                    unitIndex: i,
                    id: `${key}_unit${i}`
                };
            }
        }

        return null;
    }

    /**
     * 解鎖下一個單元
     * @returns {Object|null} 解鎖的單元資訊或 null
     */
    unlockNextUnit() {
        const nextUnit = this.findNextUnitToUnlock();
        
        if (!nextUnit) {
            console.warn('沒有可解鎖的單元');
            return null;
        }

        if (this.isUnitUnlocked(nextUnit.assemblyId, nextUnit.unitIndex)) {
            console.error('嘗試解鎖已解鎖的單元:', nextUnit.id);
            return null;
        }

        try {
            // 執行解鎖
            const key = `assembly${nextUnit.assemblyId}`;
            this.progressData.unlockedUnits[key].push(nextUnit.unitIndex);
            this.progressData.stats.totalUnlocked++;

            // 記錄解鎖歷史
            this.recordUnlockEvent(nextUnit.id, 'average_mastery_80');

            // 同步到 SRS
            this.syncWithSRS(nextUnit.id, 'unlock');

            // 發放獎勵
            const reward = this.awardUnlockReward(nextUnit.id);

            // 儲存進度
            this.saveProgress();

            // 觸發慶祝動畫
            this.triggerUnlockCelebration(nextUnit);

            console.log(`成功解鎖單元: ${nextUnit.id}`);
            return { ...nextUnit, reward };
        } catch (error) {
            console.error('解鎖失敗:', error);
            return null;
        }
    }

    /**
     * 解鎖下一個會別的前三句
     * @returns {boolean} 是否成功解鎖
     */
    unlockNextAssembly() {
        const currentAssembly = this.progressData.currentAssembly;
        
        // 檢查當前會別是否全部解鎖
        const key = `assembly${currentAssembly}`;
        const unlockedUnits = this.progressData.unlockedUnits[key] || [];
        const totalUnits = this.mantraStructure.assemblies[currentAssembly].totalUnits;
        
        if (unlockedUnits.length < totalUnits) {
            console.warn('當前會別尚未全部解鎖');
            return false;
        }

        // 檢查平均掌握程度是否 >= 90%
        const avgMastery = this.getAverageMasteryLevel(currentAssembly);
        if (avgMastery < this.assemblyUnlockThreshold * 100) {
            console.warn(`當前會別平均掌握程度 ${avgMastery}% < 90%`);
            return false;
        }

        // 檢查是否還有下一個會別
        const nextAssembly = currentAssembly + 1;
        if (nextAssembly >= this.mantraStructure.assemblies.length) {
            console.log('已完成所有會別！');
            return false;
        }

        try {
            // 標記當前會別完成
            this.progressData.assemblyCompletion[key] = {
                allUnlocked: true,
                averageMastery: avgMastery,
                completedAt: new Date().toISOString()
            };

            // 解鎖下一會別的前三句
            const nextKey = `assembly${nextAssembly}`;
            this.progressData.unlockedUnits[nextKey] = [0, 1, 2];
            this.progressData.currentAssembly = nextAssembly;
            this.progressData.stats.totalUnlocked += 3;

            // 記錄解鎖歷史
            for (let i = 0; i < 3; i++) {
                const unitId = `${nextKey}_unit${i}`;
                this.recordUnlockEvent(unitId, 'assembly_unlock');
                this.syncWithSRS(unitId, 'unlock');
            }

            // 發放會別完成獎勵
            this.awardAssemblyReward(currentAssembly);

            // 儲存進度
            this.saveProgress();

            console.log(`成功解鎖第 ${nextAssembly + 1} 會`);
            return true;
        } catch (error) {
            console.error('會別解鎖失敗:', error);
            return false;
        }
    }

    /**
     * 記錄解鎖事件
     * @param {string} unitId - 單元 ID
     * @param {string} triggerCondition - 觸發條件
     */
    recordUnlockEvent(unitId, triggerCondition) {
        this.progressData.unlockHistory.push({
            unitId,
            unlockedAt: new Date().toISOString(),
            triggerCondition
        });
    }

    // ==================== SRS Engine 整合 ====================

    /**
     * 與 SRS Engine 同步
     * @param {string} unitId - 單元 ID
     * @param {string} action - 動作類型 ("unlock", "mastery")
     * @returns {boolean} 是否成功同步
     */
    syncWithSRS(unitId, action) {
        try {
            if (!this.srsEngine) {
                console.warn('SRS Engine 未初始化');
                return false;
            }

            // 獲取單元資料（這裡簡化處理，實際應從資料源獲取）
            const [assemblyKey, unitPart] = unitId.split('_');
            const unitIndex = parseInt(unitPart.replace('unit', ''));
            const assemblyId = parseInt(assemblyKey.replace('assembly', ''));

            if (action === 'unlock') {
                // 解鎖時加入 SRS 清單
                if (typeof this.srsEngine.addReviewItem === 'function') {
                    this.srsEngine.addReviewItem(unitId, {
                        section: assemblyId,
                        line: unitIndex,
                        context: 'progressive_learning'
                    });
                }
            } else if (action === 'mastery') {
                // 掌握程度達標時標記
                if (typeof this.srsEngine.markAsMastered === 'function') {
                    this.srsEngine.markAsMastered(unitId);
                }
            }

            return true;
        } catch (error) {
            console.error('SRS 同步失敗:', error);
            return false;
        }
    }

    /**
     * 處理 SRS 複習反饋
     * @param {string} unitId - 單元 ID
     * @param {number} quality - 評分 (1-5)
     */
    handleSRSFeedback(unitId, quality) {
        try {
            // 當評分為「困難」(quality <= 3) 時，降低掌握程度 10%
            if (quality <= 3) {
                const currentMastery = this.getMasteryLevel(unitId);
                const newMastery = Math.max(0, currentMastery - 10);
                
                // 更新掌握程度（不指定模式，直接更新總體掌握程度）
                if (this.progressData.masteryLevels[unitId]) {
                    this.progressData.masteryLevels[unitId].level = newMastery;
                    this.saveProgress();
                }
                
                console.log(`SRS 反饋：${unitId} 掌握程度從 ${currentMastery}% 降至 ${newMastery}%`);
            }
        } catch (error) {
            console.error('處理 SRS 反饋失敗:', error);
        }
    }

    // ==================== 弱點分析 ====================

    /**
     * 識別弱點項目
     * @returns {Array} 弱點項目列表，按掌握程度升序排列
     */
    identifyWeaknesses() {
        const weaknesses = [];

        // 遍歷所有已解鎖的單元
        for (let i = 0; i < 5; i++) {
            const key = `assembly${i}`;
            const unlockedUnits = this.progressData.unlockedUnits[key] || [];

            for (const unitIndex of unlockedUnits) {
                const unitId = `${key}_unit${unitIndex}`;
                const mastery = this.getMasteryLevel(unitId);

                // 掌握程度 < 60% 視為弱點
                if (mastery < this.weaknessThreshold * 100) {
                    const unitData = this.progressData.masteryLevels[unitId] || {};
                    weaknesses.push({
                        unitId,
                        assemblyId: i,
                        unitIndex,
                        mastery,
                        practiceCount: unitData.practiceCount || 0
                    });
                }
            }
        }

        // 按掌握程度升序排序（最弱的在前）
        weaknesses.sort((a, b) => a.mastery - b.mastery);

        return weaknesses;
    }

    /**
     * 獲取學習建議
     * @returns {Object|null} 建議資訊
     */
    getWeaknessRecommendations() {
        if (!this.progressData.recommendationsEnabled) {
            return null;
        }

        const weaknesses = this.identifyWeaknesses();
        const avgMastery = this.getAverageMasteryLevel(this.progressData.currentAssembly);
        const unlockedCount = this.getUnlockedCount();

        // 建議 1：平均掌握程度低於解鎖閾值
        if (avgMastery < this.unlockThreshold * 100) {
            return {
                type: 'low_mastery',
                message: `當前平均掌握程度 ${avgMastery}%，建議多練習以達到 80% 解鎖新內容`,
                targetUnits: weaknesses.slice(0, 3).map(w => w.unitId)
            };
        }

        // 建議 2：存在弱點項目
        if (weaknesses.length > 0) {
            return {
                type: 'weakness_focus',
                message: `發現 ${weaknesses.length} 個薄弱環節，建議使用弱點強化模式`,
                targetUnits: weaknesses.slice(0, 5).map(w => w.unitId)
            };
        }

        // 建議 3：已解鎖超過 10 個單元但未使用 SRS
        if (unlockedCount > 10 && this.srsEngine) {
            const dueItems = this.srsEngine.getDueItems ? this.srsEngine.getDueItems() : [];
            if (dueItems.length > 0) {
                return {
                    type: 'srs_reminder',
                    message: `您有 ${dueItems.length} 個項目待複習，建議進行 SRS 複習以鞏固記憶`,
                    targetUnits: []
                };
            }
        }

        return null;
    }

    /**
     * 顯示學習建議
     * @param {string} message - 建議訊息
     */
    showRecommendation(message) {
        // 這個方法將在 UI 整合時實作
        console.log('學習建議:', message);
        this.progressData.lastRecommendationShown = new Date().toISOString();
    }

    // ==================== 獎勵系統 ====================

    /**
     * 發放解鎖獎勵
     * @param {string} unitId - 單元 ID
     * @returns {Object} 獎勵資訊
     */
    awardUnlockReward(unitId) {
        const merit = 10;  // 解鎖獎勵：10 功德
        const xp = 20;     // 解鎖獎勵：20 經驗值

        if (this.dataManager && this.dataManager.userData) {
            // 發放功德
            if (typeof this.dataManager.addMerit === 'function') {
                this.dataManager.addMerit(merit);
            } else if (this.dataManager.userData.merit !== undefined) {
                this.dataManager.userData.merit = (this.dataManager.userData.merit || 0) + merit;
            }

            // 發放經驗值
            if (typeof this.dataManager.addXP === 'function') {
                this.dataManager.addXP(xp);
            } else if (this.dataManager.userData.xp !== undefined) {
                this.dataManager.userData.xp = (this.dataManager.userData.xp || 0) + xp;
            }

            // 儲存
            if (typeof this.dataManager.saveUserData === 'function') {
                this.dataManager.saveUserData();
            }
        }

        return { merit, xp };
    }

    /**
     * 發放會別完成獎勵
     * @param {number} assemblyId - 會別 ID
     * @returns {Object} 獎勵資訊
     */
    awardAssemblyReward(assemblyId) {
        // 遞增獎勵：50 + 25 × (n - 1) 功德
        const merit = 50 + 25 * assemblyId;
        const xp = 100 + 50 * assemblyId;

        if (this.dataManager && this.dataManager.userData) {
            if (typeof this.dataManager.addMerit === 'function') {
                this.dataManager.addMerit(merit);
            } else if (this.dataManager.userData.merit !== undefined) {
                this.dataManager.userData.merit = (this.dataManager.userData.merit || 0) + merit;
            }

            if (typeof this.dataManager.addXP === 'function') {
                this.dataManager.addXP(xp);
            } else if (this.dataManager.userData.xp !== undefined) {
                this.dataManager.userData.xp = (this.dataManager.userData.xp || 0) + xp;
            }

            if (typeof this.dataManager.saveUserData === 'function') {
                this.dataManager.saveUserData();
            }
        }

        console.log(`會別 ${assemblyId + 1} 完成獎勵：功德 +${merit}, 經驗值 +${xp}`);
        return { merit, xp };
    }

    /**
     * 發放完美掌握獎勵
     * @param {string} unitId - 單元 ID
     * @returns {Object} 獎勵資訊
     */
    awardMasteryReward(unitId) {
        const merit = 5;  // 完美掌握獎勵：5 功德

        if (this.dataManager && this.dataManager.userData) {
            if (typeof this.dataManager.addMerit === 'function') {
                this.dataManager.addMerit(merit);
            } else if (this.dataManager.userData.merit !== undefined) {
                this.dataManager.userData.merit = (this.dataManager.userData.merit || 0) + merit;
            }

            if (typeof this.dataManager.saveUserData === 'function') {
                this.dataManager.saveUserData();
            }
        }

        return { merit };
    }

    // ==================== UI 事件 ====================

    /**
     * 觸發解鎖慶祝動畫
     * @param {Object} unitInfo - 單元資訊
     */
    triggerUnlockCelebration(unitInfo) {
        // 這個方法將在 UI 整合時實作
        console.log('🎉 解鎖新單元:', unitInfo.id);
        
        // 觸發自定義事件
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('progressivelearning:unlock', {
                detail: unitInfo
            });
            window.dispatchEvent(event);
        }
    }

    /**
     * 更新進度 UI
     */
    updateProgressUI() {
        // 這個方法將在 UI 整合時實作
        const progress = this.calculateOverallProgress();
        console.log(`進度更新: ${progress}%`);
        
        // 觸發自定義事件
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('progressivelearning:progress', {
                detail: { progress, unlockedCount: this.getUnlockedCount() }
            });
            window.dispatchEvent(event);
        }
    }

    // ==================== 學習模式整合 ====================

    /**
     * 過濾已解鎖的單元
     * @param {Array} units - 所有單元列表
     * @returns {Array} 已解鎖的單元列表
     */
    filterUnlockedUnits(units) {
        return units.filter(unit => {
            return this.isUnitUnlocked(unit.assemblyId, unit.unitIndex);
        });
    }

    /**
     * 檢查是否可以訪問特定模式的單元
     * @param {string} mode - 學習模式
     * @param {string} unitId - 單元 ID
     * @returns {boolean} 是否可以訪問
     */
    canAccessMode(mode, unitId) {
        const [assemblyKey, unitPart] = unitId.split('_');
        const unitIndex = parseInt(unitPart.replace('unit', ''));
        const assemblyId = parseInt(assemblyKey.replace('assembly', ''));

        return this.isUnitUnlocked(assemblyId, unitIndex);
    }
}

// 導出為全域變數（用於 HTML 整合）
if (typeof window !== 'undefined') {
    window.ProgressiveLearningEngine = ProgressiveLearningEngine;
}

// 導出為模組（用於測試）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressiveLearningEngine;
}

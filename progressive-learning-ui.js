/**
 * Progressive Learning UI Integration
 * 漸進式學習 UI 整合腳本
 */

(function() {
    'use strict';

    let progressiveLearning = null;
    let isProgressiveMode = false;

    // ==================== 初始化 ====================

    /**
     * 初始化漸進式學習 UI
     */
    function initProgressiveLearningUI() {
        // 等待 Global Data Manager 和 SRS Engine 載入
        if (typeof window.globalDataManager === 'undefined' || 
            typeof window.spacedRepetitionEngine === 'undefined') {
            setTimeout(initProgressiveLearningUI, 100);
            return;
        }

        // 創建引擎實例
        progressiveLearning = new ProgressiveLearningEngine(
            window.globalDataManager,
            window.spacedRepetitionEngine
        );

        // 初始化引擎
        progressiveLearning.init().then(() => {
            console.log('漸進式學習 UI 初始化完成');
            
            // 添加模式選擇器按鈕
            addProgressiveModeButton();
            
            // 添加進度條
            addProgressBar();
            
            // 監聽事件
            setupEventListeners();
        });
    }

    // ==================== UI 組件 ====================

    /**
     * 添加漸進式學習模式按鈕
     */
    function addProgressiveModeButton() {
        const modeSelector = document.getElementById('modeSelector');
        if (!modeSelector) {
            console.warn('找不到模式選擇器');
            return;
        }

        // 創建按鈕
        const button = document.createElement('button');
        button.className = 'btn section-btn';
        button.setAttribute('data-mode', 'progressive');
        button.innerHTML = '漸進式學習 <span class="progress-badge">0%</span>';
        
        // 添加到選擇器
        modeSelector.appendChild(button);

        // 綁定點擊事件
        button.addEventListener('click', () => {
            toggleProgressiveMode();
        });

        // 更新進度顯示
        updateProgressBadge();
    }

    /**
     * 添加進度條
     */
    function addProgressBar() {
        const learningSection = document.querySelector('.learning-section');
        if (!learningSection) return;

        const progressContainer = document.createElement('div');
        progressContainer.id = 'progressive-progress-container';
        progressContainer.className = 'progressive-progress-container';
        progressContainer.style.display = 'none';
        progressContainer.innerHTML = `
            <div class="progressive-progress-header">
                <span class="progressive-progress-text" id="progressive-progress-text">載入中...</span>
                <button class="progressive-stats-btn" id="progressive-stats-btn" title="查看詳細統計">
                    📊
                </button>
            </div>
            <div class="progressive-progress-bar">
                <div class="progressive-progress-fill" id="progressive-progress-fill" style="width: 0%"></div>
            </div>
            
            <!-- 21 天學習計畫區域 -->
            <div id="progressive-daily-plan-container" class="daily-plan-section"></div>
            
            <div class="progressive-assembly-progress" id="progressive-assembly-progress"></div>
        `;

        learningSection.insertBefore(progressContainer, learningSection.firstChild);

        // 綁定統計按鈕
        document.getElementById('progressive-stats-btn').addEventListener('click', showDetailedStats);
    }

    /**
     * 更新進度徽章
     */
    function updateProgressBadge() {
        if (!progressiveLearning) return;

        const progress = progressiveLearning.calculateOverallProgress();
        const badge = document.querySelector('[data-mode="progressive"] .progress-badge');
        
        if (badge) {
            badge.textContent = `${progress}%`;
            badge.style.color = getProgressColor(progress);
        }
    }

    /**
     * 更新進度條
     */
    function updateProgressBar() {
        if (!progressiveLearning) return;

        const progress = progressiveLearning.calculateOverallProgress();
        const unlockedCount = progressiveLearning.getUnlockedCount();
        const totalCount = progressiveLearning.getTotalUnits();

        // 更新進度文字
        const progressText = document.getElementById('progressive-progress-text');
        if (progressText) {
            progressText.textContent = `學習進度：${unlockedCount} / ${totalCount} (${progress}%)`;
        }

        // 更新進度條
        const progressFill = document.getElementById('progressive-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            progressFill.style.backgroundColor = getProgressColor(progress);
        }

        // 更新每日計畫
        updateDailyPlanUI();

        // 更新會別進度
        updateAssemblyProgress();
    }

    /**
     * 更新每日計畫 UI
     */
    function updateDailyPlanUI() {
        const container = document.getElementById('progressive-daily-plan-container');
        if (!container || !progressiveLearning) return;

        const plan = progressiveLearning.getDailyPlanStatus();
        if (!plan) return;

        const sop = progressiveLearning.getDailySOP();

        let html = `
            <div class="daily-plan-header">
                <span class="daily-plan-title">${plan.assemblyName}・第 ${plan.currentDay} / ${plan.totalDays} 天</span>
                <span class="phase-badge phase-${plan.phase}">階段 ${plan.phase}</span>
            </div>
            
            <div class="phase-summary">
                <strong class="phase-name">${plan.phaseName}</strong>
                <span class="phase-goal">${plan.phaseGoal}</span>
                <p class="phase-mindset">💡 禪修心法：${plan.phaseMindset}</p>
            </div>
            
            ${plan.specialTip ? `
                <div class="special-tip-box">
                    <span class="tip-icon">⚠️</span>
                    <span class="tip-text">${plan.specialTip}</span>
                </div>
            ` : ''}
        `;

        // 如果有每日新進度目標
        if (plan.dailyGoal) {
            html += `
                <div class="daily-goal-box">
                    <span class="daily-goal-title">今日新切入點</span>
                    <span class="daily-goal-range">第 ${plan.dailyGoal.start + 1} 句 ～ 第 ${plan.dailyGoal.end + 1} 句</span>
                </div>
            `;
        }

        // 任務清單
        html += '<div class="task-list">';
        plan.tasks.forEach(task => {
            const icons = { listen: '🎧', read: '📖', checkin: '🔥', hide_pinyin: '👁️', puzzle: '🧩', review_weakness: '🎯', quiz: '📝', srs_breakthrough: '🚀', full_recitation: '📿' };
            html += `
                <div class="task-item">
                    <div class="task-icon">${icons[task.id] || '✅'}</div>
                    <div class="task-content">
                        <span class="task-title">${task.title}</span>
                        <span class="task-desc">${task.desc}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        // 20 分鐘 SOP
        html += `
            <div class="sop-section">
                <div class="sop-header">
                    <h3>🔔 每日 20 分鐘修行 SOP</h3>
                </div>
                <div class="sop-grid">
        `;
        
        sop.forEach(item => {
            html += `
                <div class="sop-item">
                    <span class="sop-time">${item.time} 分鐘</span>
                    <span class="sop-title">${item.title}</span>
                    <span class="sop-desc">${item.desc}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * 更新會別進度顯示
     */
    function updateAssemblyProgress() {
        const container = document.getElementById('progressive-assembly-progress');
        if (!container || !progressiveLearning) return;

        let html = '<div class="assembly-progress-grid">';
        
        for (let i = 0; i < 5; i++) {
            const avgMastery = progressiveLearning.getAverageMasteryLevel(i);
            const key = `assembly${i}`;
            const unlockedUnits = progressiveLearning.progressData.unlockedUnits[key] || [];
            const totalUnits = progressiveLearning.mantraStructure.assemblies[i].totalUnits;
            const progress = Math.round((unlockedUnits.length / totalUnits) * 100);

            html += `
                <div class="assembly-progress-item">
                    <div class="assembly-name">第${i + 1}會</div>
                    <div class="assembly-bar">
                        <div class="assembly-bar-fill" style="width: ${progress}%; background-color: ${getProgressColor(avgMastery)}"></div>
                    </div>
                    <div class="assembly-stats">${unlockedUnits.length}/${totalUnits} (${avgMastery}%)</div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * 根據進度獲取顏色
     */
    function getProgressColor(progress) {
        if (progress >= 80) return '#16a34a';  // 綠色
        if (progress >= 51) return '#f5a623';  // 黃色
        return '#d0021b';  // 紅色
    }

    // ==================== 模式切換 ====================

    /**
     * 切換漸進式學習模式
     */
    function toggleProgressiveMode() {
        isProgressiveMode = !isProgressiveMode;

        const button = document.querySelector('[data-mode="progressive"]');
        const progressContainer = document.getElementById('progressive-progress-container');

        if (isProgressiveMode) {
            // 啟動漸進式學習模式
            button.classList.add('active');
            if (progressContainer) {
                progressContainer.style.display = 'block';
            }

            // 應用內容鎖定
            applyContentLocking();
            
            // 更新進度顯示
            updateProgressBar();

            console.log('漸進式學習模式已啟動');
        } else {
            // 關閉漸進式學習模式
            button.classList.remove('active');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }

            // 解除內容鎖定
            removeContentLocking();

            console.log('漸進式學習模式已關閉');
        }
    }

    /**
     * 應用內容鎖定
     */
    function applyContentLocking() {
        // 獲取所有咒語行
        const mantraRows = document.querySelectorAll('.mantra-table tr');
        
        mantraRows.forEach((row, index) => {
            const assemblyId = getCurrentAssemblyId();
            const isUnlocked = progressiveLearning.isUnitUnlocked(assemblyId, index);

            if (!isUnlocked) {
                row.classList.add('locked-unit');
                row.style.opacity = '0.4';
                row.style.pointerEvents = 'none';
                
                // 添加鎖定圖示
                const firstCell = row.querySelector('td');
                if (firstCell && !firstCell.querySelector('.lock-icon')) {
                    const lockIcon = document.createElement('span');
                    lockIcon.className = 'lock-icon';
                    lockIcon.textContent = '🔒';
                    lockIcon.style.marginRight = '8px';
                    firstCell.insertBefore(lockIcon, firstCell.firstChild);
                }
            } else {
                row.classList.remove('locked-unit');
                row.style.opacity = '1';
                row.style.pointerEvents = 'auto';
                
                // 移除鎖定圖示
                const lockIcon = row.querySelector('.lock-icon');
                if (lockIcon) {
                    lockIcon.remove();
                }
            }
        });
    }

    /**
     * 解除內容鎖定
     */
    function removeContentLocking() {
        const mantraRows = document.querySelectorAll('.mantra-table tr');
        
        mantraRows.forEach(row => {
            row.classList.remove('locked-unit');
            row.style.opacity = '1';
            row.style.pointerEvents = 'auto';
            
            const lockIcon = row.querySelector('.lock-icon');
            if (lockIcon) {
                lockIcon.remove();
            }
        });
    }

    /**
     * 獲取當前會別 ID
     */
    function getCurrentAssemblyId() {
        const activeSection = document.querySelector('.section-btn.active');
        if (!activeSection) return 0;
        
        const dataId = activeSection.getAttribute('data-id');
        if (!dataId) return 0;
        
        return parseInt(dataId.replace('assembly', ''));
    }

    // ==================== 練習結束處理 ====================

    /**
     * 處理練習結束
     */
    function handlePracticeComplete(unitId, mode, performance) {
        if (!isProgressiveMode || !progressiveLearning) return;

        // 計算掌握程度
        const mastery = progressiveLearning.calculateMasteryLevel(unitId, mode, performance);
        
        console.log(`練習完成：${unitId}, 模式：${mode}, 掌握程度：${mastery}%`);

        // 檢查是否達到 100%
        if (mastery === 100) {
            progressiveLearning.awardMasteryReward(unitId);
            showNotification('🎉 完美掌握！獲得 5 功德點數');
        }

        // 檢查解鎖條件
        if (progressiveLearning.checkUnlockConditions()) {
            const unlocked = progressiveLearning.unlockNextUnit();
            if (unlocked) {
                showUnlockCelebration(unlocked);
            }
        }

        // 更新 UI
        updateProgressBar();
        updateProgressBadge();
        applyContentLocking();

        // 檢查學習建議
        const recommendation = progressiveLearning.getWeaknessRecommendations();
        if (recommendation) {
            showRecommendation(recommendation);
        }
    }

    // ==================== 通知與動畫 ====================

    /**
     * 顯示解鎖慶祝動畫
     */
    function showUnlockCelebration(unitInfo) {
        const modal = document.createElement('div');
        modal.className = 'progressive-celebration-modal';
        modal.innerHTML = `
            <div class="progressive-celebration-content">
                <div class="celebration-icon">🎉</div>
                <h2>解鎖新內容！</h2>
                <p>恭喜您解鎖了新的學習單元</p>
                <div class="reward-display">
                    <span>🪷 功德 +${unitInfo.reward.merit}</span>
                    <span>⭐ 經驗值 +${unitInfo.reward.xp}</span>
                </div>
                <button class="progressive-btn" onclick="this.closest('.progressive-celebration-modal').remove()">
                    繼續學習
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 3 秒後自動關閉
        setTimeout(() => {
            modal.remove();
        }, 3000);
    }

    /**
     * 顯示通知
     */
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'progressive-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * 顯示學習建議
     */
    function showRecommendation(recommendation) {
        const notification = document.createElement('div');
        notification.className = 'progressive-recommendation';
        notification.innerHTML = `
            <div class="recommendation-content">
                <span class="recommendation-icon">💡</span>
                <span class="recommendation-text">${recommendation.message}</span>
                <button class="recommendation-close" onclick="this.closest('.progressive-recommendation').remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }

    /**
     * 顯示詳細統計
     */
    function showDetailedStats() {
        if (!progressiveLearning) return;

        const stats = progressiveLearning.progressData.stats;
        const weaknesses = progressiveLearning.identifyWeaknesses();

        const modal = document.createElement('div');
        modal.className = 'progressive-stats-modal';
        modal.innerHTML = `
            <div class="progressive-stats-content">
                <div class="stats-header">
                    <h2>學習統計</h2>
                    <button class="stats-close" onclick="this.closest('.progressive-stats-modal').remove()">×</button>
                </div>
                <div class="stats-body">
                    <div class="stat-item">
                        <span class="stat-label">已解鎖單元</span>
                        <span class="stat-value">${stats.totalUnlocked}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">練習次數</span>
                        <span class="stat-value">${stats.totalPracticeSessions}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">總學習時間</span>
                        <span class="stat-value">${Math.round(stats.totalStudyTime / 60)} 分鐘</span>
                    </div>
                    ${weaknesses.length > 0 ? `
                        <div class="weakness-section">
                            <h3>薄弱環節 (${weaknesses.length})</h3>
                            <ul class="weakness-list">
                                ${weaknesses.slice(0, 5).map(w => `
                                    <li>
                                        <span>${w.unitId}</span>
                                        <span class="weakness-mastery" style="color: ${getProgressColor(w.mastery)}">${w.mastery}%</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : '<p class="no-weakness">太棒了！沒有薄弱環節</p>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // ==================== 事件監聽 ====================

    /**
     * 設置事件監聽器
     */
    function setupEventListeners() {
        // 監聽自定義事件
        window.addEventListener('progressivelearning:unlock', (e) => {
            console.log('解鎖事件:', e.detail);
        });

        window.addEventListener('progressivelearning:progress', (e) => {
            console.log('進度更新:', e.detail);
        });

        // 監聽會別切換
        document.querySelectorAll('.section-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (isProgressiveMode) {
                    setTimeout(() => applyContentLocking(), 100);
                }
            });
        });
    }

    // ==================== 導出 API ====================

    window.progressiveLearningUI = {
        init: initProgressiveLearningUI,
        handlePracticeComplete,
        isProgressiveMode: () => isProgressiveMode,
        getEngine: () => progressiveLearning
    };

    // 自動初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProgressiveLearningUI);
    } else {
        initProgressiveLearningUI();
    }

})();

/**
 * ═══════════════════════════════════════════════════════════════
 * 檔案名稱：reward-notification.js
 * 功能說明：楞嚴咒修行道場 - 獎勵通知系統
 * 用途：統一的獎勵提示組件
 * 最後更新：2025-12-01
 * ═══════════════════════════════════════════════════════════════
 */

class RewardNotification {
    /**
     * 顯示獎勵通知
     * @param {string} type - 通知類型：success, level-up, achievement, warning, error
     * @param {string} message - 通知訊息
     * @param {object} rewards - 獎勵內容 { merit, xp, items }
     * @param {number} duration - 顯示時長（毫秒），預設 3000
     */
    static show(type, message, rewards = {}, duration = 3000) {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `reward-notification ${type}`;

        // 構建內容
        let content = '';

        // 圖標
        content += `<div class="reward-icon">${this.getIcon(type)}</div>`;

        // 訊息
        content += `<div class="reward-message">${message}</div>`;

        // 獎勵項目
        if (rewards.merit) {
            content += `<div class="reward-item">◎ +${rewards.merit} 功德</div>`;
        }
        if (rewards.xp) {
            content += `<div class="reward-item">⭐ +${rewards.xp} 經驗</div>`;
        }
        if (rewards.items && rewards.items.length > 0) {
            rewards.items.forEach(item => {
                content += `<div class="reward-item">${item.icon} ${item.name}</div>`;
            });
        }

        notification.innerHTML = content;

        // 添加到頁面
        document.body.appendChild(notification);

        // 動畫顯示
        setTimeout(() => notification.classList.add('show'), 10);

        // 自動移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 400);
        }, duration);

        // 播放音效（如果有）
        this.playSound(type);

        return notification;
    }

    /**
     * 獲取圖標
     */
    static getIcon(type) {
        const icons = {
            'success': '✅',
            'level-up': '🎉',
            'achievement': '🏆',
            'warning': '⚠️',
            'error': '❌',
            'info': 'ℹ️',
            'merit': '◎',
            'xp': '⭐'
        };
        return icons[type] || '📢';
    }

    /**
     * 播放音效
     */
    static playSound(type) {
        // 如果有音效系統，在這裡播放
        // 目前先跳過
    }

    /**
     * 顯示升級通知（特殊樣式）
     */
    static showLevelUp(oldLevel, newLevel, rewards = {}) {
        const message = `恭喜升級！\nLv.${oldLevel} → Lv.${newLevel}`;
        return this.show('level-up', message, rewards, 4000);
    }

    /**
     * 顯示成就解鎖通知
     */
    static showAchievement(achievement) {
        const message = `🏆 成就解鎖\n${achievement.name}`;
        const rewards = {
            merit: achievement.reward?.merit,
            xp: achievement.reward?.xp
        };
        return this.show('achievement', message, rewards, 4000);
    }

    /**
     * 顯示錯誤通知
     */
    static showError(message) {
        return this.show('error', message, {}, 2000);
    }

    /**
     * 顯示警告通知
     */
    static showWarning(message) {
        return this.show('warning', message, {}, 2500);
    }

    /**
     * 顯示資訊通知
     */
    static showInfo(message) {
        return this.show('info', message, {}, 2000);
    }

    /**
     * 顯示功德獲得通知
     */
    static showMeritGain(amount, reason = '') {
        const message = reason ? `${reason}\n獲得功德` : '獲得功德';
        return this.show('merit', message, { merit: amount }, 2500);
    }

    /**
     * 顯示經驗獲得通知
     */
    static showXPGain(amount, reason = '') {
        const message = reason ? `${reason}\n獲得經驗` : '獲得經驗';
        return this.show('xp', message, { xp: amount }, 2500);
    }

    /**
     * 顯示多個通知（依序顯示）
     */
    static showMultiple(notifications, delay = 500) {
        notifications.forEach((notif, index) => {
            setTimeout(() => {
                this.show(notif.type, notif.message, notif.rewards, notif.duration);
            }, index * delay);
        });
    }
}

// 監聽升級事件
window.addEventListener('levelUp', (e) => {
    const { oldLevel, newLevel } = e.detail;
    RewardNotification.showLevelUp(oldLevel, newLevel);
});

// 監聽成就解鎖事件
window.addEventListener('achievementUnlocked', (e) => {
    const achievements = e.detail;
    if (Array.isArray(achievements)) {
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                RewardNotification.showAchievement(achievement);
            }, index * 500);
        });
    } else {
        RewardNotification.showAchievement(achievements);
    }
});

// 匯出到全域
window.RewardNotification = RewardNotification;

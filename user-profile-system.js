/**
 * 用戶資料管理系統
 * 管理用戶暱稱、頭像、偏好設定等
 * 為未來 Firebase 整合做準備
 */

class UserProfileSystem {
    constructor() {
        this.storageKey = 'shurangama_user_profile';
        this.userProfile = this.loadProfile();
        this.initialized = false;
    }

    /**
     * 載入用戶資料
     */
    loadProfile() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('載入用戶資料失敗:', error);
        }

        // 返回預設資料
        return {
            displayName: null,
            userId: this.generateUserId(),
            createdAt: new Date().toISOString(),
            avatar: 'avatars/praying_monk.png',
            preferences: {
                showInLeaderboard: true,
                theme: 'light'
            }
        };
    }

    /**
     * 儲存用戶資料
     */
    saveProfile() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.userProfile));
            this.dispatchEvent('profileUpdated', this.userProfile);
        } catch (error) {
            console.error('儲存用戶資料失敗:', error);
        }
    }

    /**
     * 生成唯一用戶ID
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 檢查是否已設定暱稱
     */
    hasDisplayName() {
        return this.userProfile.displayName && this.userProfile.displayName.trim() !== '';
    }

    /**
     * 設定暱稱
     */
    setDisplayName(name) {
        if (!name || name.trim() === '') {
            return { success: false, message: '暱稱不能為空' };
        }

        const trimmedName = name.trim();

        // 驗證暱稱長度
        if (trimmedName.length < 2) {
            return { success: false, message: '暱稱至少需要2個字' };
        }

        if (trimmedName.length > 20) {
            return { success: false, message: '暱稱不能超過20個字' };
        }

        // 驗證暱稱內容（允許中文、英文、數字、底線）
        const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9_\s]+$/;
        if (!validPattern.test(trimmedName)) {
            return { success: false, message: '暱稱只能包含中文、英文、數字和底線' };
        }

        this.userProfile.displayName = trimmedName;
        this.userProfile.updatedAt = new Date().toISOString();
        this.saveProfile();

        // 確保與全域管理器同步，避免日後被舊資料覆蓋回來
        if (typeof globalDataManager !== 'undefined' && window.globalDataManager) {
            globalDataManager.updateUserName(trimmedName);
        }

        return { success: true, message: '暱稱設定成功' };
    }

    /**
     * 獲取顯示名稱
     */
    getDisplayName() {
        return this.userProfile.displayName || '修行者';
    }

    /**
     * 獲取用戶ID
     */
    getUserId() {
        return this.userProfile.userId;
    }

    /**
     * 設定頭像
     */
    setAvatar(emoji) {
        this.userProfile.avatar = emoji;
        this.saveProfile();
    }

    /**
     * 獲取頭像
     */
    getAvatar() {
        return this.userProfile.avatar;
    }

    /**
     * 更新偏好設定
     */
    updatePreferences(preferences) {
        this.userProfile.preferences = {
            ...this.userProfile.preferences,
            ...preferences
        };
        this.saveProfile();
    }

    /**
     * 獲取完整資料
     */
    getProfile() {
        return { ...this.userProfile };
    }

    /**
     * 重置資料（用於測試或登出）
     */
    resetProfile() {
        localStorage.removeItem(this.storageKey);
        this.userProfile = this.loadProfile();
        this.dispatchEvent('profileReset');
    }

    /**
     * 顯示歡迎彈窗
     * @param {boolean} force - 是否強制顯示（用於編輯資料按鈕）
     */
    showWelcomeModal(force = false) {
        // 如果不是強制顯示，檢查是否已設定暱稱
        if (!force && this.hasDisplayName()) {
            return; // 已設定暱稱，不顯示
        }

        // 檢查是否已經有彈窗存在（防止重複建立）
        if (document.getElementById('welcome-modal')) {
            return; // 彈窗已存在，不重複建立
        }

        const modal = this.createWelcomeModal();
        document.body.appendChild(modal);

        // 顯示動畫
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    /**
     * 創建歡迎彈窗
     */
    createWelcomeModal() {
        const modal = document.createElement('div');
        modal.id = 'welcome-modal';
        modal.className = 'user-welcome-modal';
        modal.innerHTML = `
            <div class="welcome-modal-overlay"></div>
            <div class="welcome-modal-content">
                <div class="welcome-header">
                    <div class="welcome-icon">🙏</div>
                    <h2>歡迎來到</h2>
                    <h1>〈楞嚴咒〉背誦學習平台</h1>
                </div>
                
                <div class="welcome-body">
                    <div class="input-group">
                        <label for="displayNameInput">請輸入您的法號或暱稱：</label>
                        <input 
                            type="text" 
                            id="displayNameInput" 
                            class="display-name-input"
                            placeholder="輸入名字或暱稱"
                            maxlength="20"
                            autocomplete="off"
                        />
                        <div class="input-hint" id="nameHint"></div>
                    </div>
                    
                    <div class="welcome-tips">
                        <h4>💡 溫馨提示：</h4>
                        <ul>
                            <li>暱稱將顯示在排行榜上</li>
                            <li>建議使用法號或修行暱稱</li>
                            <li>可隨時在設定中修改</li>
                        </ul>
                    </div>
                </div>
                
                <div class="welcome-footer">
                    <button class="btn-secondary" id="skipBtn">暫不設定</button>
                    <button class="btn-primary" id="confirmBtn">開始修行</button>
                </div>
            </div>
        `;

        // 添加樣式
        this.injectStyles();

        // 綁定事件
        this.bindWelcomeModalEvents(modal);

        return modal;
    }

    /**
     * 綁定歡迎彈窗事件
     */
    bindWelcomeModalEvents(modal) {
        const input = modal.querySelector('#displayNameInput');
        const confirmBtn = modal.querySelector('#confirmBtn');
        const skipBtn = modal.querySelector('#skipBtn');
        const hint = modal.querySelector('#nameHint');

        // 輸入驗證
        input.addEventListener('input', () => {
            const value = input.value.trim();
            if (value.length === 0) {
                hint.textContent = '';
                hint.className = 'input-hint';
            } else if (value.length < 2) {
                hint.textContent = '暱稱至少需要2個字';
                hint.className = 'input-hint error';
            } else if (value.length > 20) {
                hint.textContent = '暱稱不能超過20個字';
                hint.className = 'input-hint error';
            } else {
                hint.textContent = '✓ 暱稱可用';
                hint.className = 'input-hint success';
            }
        });

        // Enter 鍵確認
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });

        // 確認按鈕
        confirmBtn.addEventListener('click', () => {
            const name = input.value.trim();

            if (!name) {
                hint.textContent = '請輸入暱稱';
                hint.className = 'input-hint error';
                input.focus();
                return;
            }

            const result = this.setDisplayName(name);

            if (result.success) {
                this.closeWelcomeModal(modal);
                this.showWelcomeMessage(name);
            } else {
                hint.textContent = result.message;
                hint.className = 'input-hint error';
                input.focus();
            }
        });

        // 跳過按鈕
        skipBtn.addEventListener('click', () => {
            this.setDisplayName('修行者_' + Math.random().toString(36).substr(2, 4));
            this.closeWelcomeModal(modal);
        });

        // 自動聚焦
        setTimeout(() => {
            input.focus();
        }, 500);
    }

    /**
     * 關閉歡迎彈窗
     */
    closeWelcomeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    /**
     * 顯示歡迎訊息
     */
    showWelcomeMessage(name) {
        const message = document.createElement('div');
        message.className = 'welcome-toast';
        message.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">🎉</span>
                <span class="toast-text">歡迎您，${name}！</span>
            </div>
        `;
        document.body.appendChild(message);

        setTimeout(() => {
            message.classList.add('show');
        }, 100);

        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    /**
     * 注入樣式
     */
    injectStyles() {
        if (document.getElementById('user-profile-styles')) {
            return; // 已注入
        }

        const style = document.createElement('style');
        style.id = 'user-profile-styles';
        style.textContent = `
            /* 歡迎彈窗樣式 */
            .user-welcome-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .user-welcome-modal.show {
                opacity: 1;
            }

            .welcome-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(5px);
            }

            .welcome-modal-content {
                position: relative;
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                padding: 2.5rem;
                transform: translateY(-20px);
                transition: transform 0.3s ease;
            }

            .user-welcome-modal.show .welcome-modal-content {
                transform: translateY(0);
            }

            .welcome-header {
                text-align: center;
                margin-bottom: 2rem;
            }

            .welcome-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                animation: bounce 2s infinite;
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            .welcome-header h2 {
                font-size: 1.2rem;
                color: #666;
                margin: 0.5rem 0;
                font-weight: 400;
            }

            .welcome-header h1 {
                font-size: 2rem;
                color: #2c3e50;
                margin: 0;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .welcome-body {
                margin-bottom: 2rem;
            }

            .input-group {
                margin-bottom: 1.5rem;
            }

            .input-group label {
                display: block;
                font-size: 1rem;
                color: #2c3e50;
                margin-bottom: 0.75rem;
                font-weight: 600;
            }

            .display-name-input {
                width: 100%;
                padding: 1rem;
                font-size: 1.1rem;
                border: 2px solid #e0e0e0;
                border-radius: 12px;
                transition: all 0.3s ease;
                font-family: 'Noto Serif TC', serif;
                box-sizing: border-box;
            }

            .display-name-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            }

            .input-hint {
                margin-top: 0.5rem;
                font-size: 0.9rem;
                min-height: 1.2rem;
            }

            .input-hint.error {
                color: #e74c3c;
            }

            .input-hint.success {
                color: #27ae60;
            }

            .welcome-tips {
                background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
                padding: 1.25rem;
                border-radius: 12px;
                border-left: 4px solid #667eea;
            }

            .welcome-tips h4 {
                margin: 0 0 0.75rem 0;
                color: #2c3e50;
                font-size: 1rem;
            }

            .welcome-tips ul {
                margin: 0;
                padding-left: 1.5rem;
                color: #555;
            }

            .welcome-tips li {
                margin: 0.5rem 0;
                line-height: 1.6;
            }

            .welcome-footer {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }

            .welcome-footer button {
                padding: 0.875rem 2rem;
                font-size: 1rem;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                font-family: 'Noto Serif TC', serif;
            }

            .btn-secondary {
                background: #e0e0e0;
                color: #666;
            }

            .btn-secondary:hover {
                background: #d0d0d0;
                transform: translateY(-2px);
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }

            /* 歡迎提示訊息 */
            .welcome-toast {
                position: fixed;
                top: 2rem;
                left: 50%;
                transform: translateX(-50%) translateY(-100px);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 1rem 2rem;
                border-radius: 50px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                opacity: 0;
                transition: all 0.3s ease;
            }

            .welcome-toast.show {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }

            .toast-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .toast-icon {
                font-size: 1.5rem;
            }

            .toast-text {
                font-size: 1.1rem;
                font-weight: 600;
            }

            /* 響應式設計 */
            @media (max-width: 768px) {
                .welcome-modal-content {
                    padding: 2rem 1.5rem;
                }

                .welcome-header h1 {
                    font-size: 1.5rem;
                }

                .welcome-footer {
                    flex-direction: column;
                }

                .welcome-footer button {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 觸發自定義事件
     */
    dispatchEvent(eventName, detail) {
        document.dispatchEvent(new CustomEvent(`userProfile:${eventName}`, { detail }));
    }

    /**
     * 初始化系統
     */
    init() {
        if (this.initialized) return;

        // 檢查當前頁面 - 以下頁面不顯示歡迎彈窗：
        // 1. RPG 故事頁面 - 該頁面本身就有法號輸入功能
        // 2. 修行道場頁面 - 入口頁面會處理法號輸入
        // 3. 手機版 App 頁面 - 使用 onboarding 進行輸入
        // 修正在瀏覽器位址列中中文可能被 URL 編碼的問題
        const currentPath = decodeURIComponent(window.location.pathname);
        const isRpgStoryPage = currentPath.includes('rpg-story');
        const isDashboardPage = currentPath.includes('修行道場');
        const isMobileAppPage = currentPath.includes('mobile-app');

        const isIndexPage = currentPath.includes('index.html') || currentPath.endsWith('/') || currentPath.endsWith('\\');

        if (!isRpgStoryPage && !isDashboardPage && !isIndexPage && !isMobileAppPage) {
            // 頁面載入完成後顯示歡迎彈窗
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => this.showWelcomeModal(), 500);
                });
            } else {
                setTimeout(() => this.showWelcomeModal(), 500);
            }
        }

        this.initialized = true;
    }
}

// 創建全局實例
window.userProfileSystem = new UserProfileSystem();

// 自動初始化
window.userProfileSystem.init();

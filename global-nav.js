/**
 * ═══════════════════════════════════════════════════════════════
 * 檔案名稱：global-nav.js
 * 功能說明：楞嚴咒修行道場 - 全域導航欄
 * 用途：在所有頁面顯示統一的導航欄
 * 最後更新：2025-12-01
 * ═══════════════════════════════════════════════════════════════
 */

window.confirmAndGoBackToHome = function(e) {
    if (e) e.preventDefault();
    if (confirm('確定要返回首頁嗎？你將重新開始選擇法號和頭像。')) {
        // 清除選擇相關記錄
        localStorage.removeItem('userName');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('firstStoryShown');
        localStorage.removeItem('missionAccepted');
        
        if (window.globalDataManager && window.globalDataManager.userData) {
            window.globalDataManager.userData.firstVisit = true;
            window.globalDataManager.userData.storyCompleted = false;
            window.globalDataManager.saveUserData();
        }

        // 以過場動畫跳轉，若失敗則使用原生跳轉
        if (typeof navigateWithTransition === 'function') {
            navigateWithTransition('index.html');
        } else {
            window.location.href = 'index.html';
        }
    }
    return false;
};

/**
 * 初始化全域導航欄
 */
function initGlobalNav() {
    // 檢查是否已經有導航欄
    if (document.querySelector('.global-nav')) {
        return;
    }

    // 獲取當前頁面路徑
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // 創建導航欄 HTML
    const navHTML = `
        <nav class="global-nav">
            <div class="nav-container">
                <!-- Logo -->
                <a href="修行道場.html" class="nav-logo">
                    <span class="logo-icon">◎</span>
                    <span class="logo-text">背誦學習平台</span>
                </a>
                
                <!-- 導航連結 -->
                <div class="nav-links">
                    <a href="practice.html" class="nav-link ${currentPath === 'practice.html' ? 'active' : ''}">
                        <span class="nav-icon">◇</span>
                        <span>新手村</span>
                    </a>
                    <a href="game.html" class="nav-link ${currentPath === 'game.html' ? 'active' : ''}">
                        <span class="nav-icon">◆</span>
                        <span>挑戰域</span>
                    </a>
                    <a href="wooden-fish-challenge.html" class="nav-link ${currentPath === 'wooden-fish-challenge.html' ? 'active' : ''}">
                        <span class="nav-icon"><img src="images/wooden-fish-icon.png" alt="木魚" style="width: 20px; height: 20px; object-fit: contain; vertical-align: middle;"></span>
                        <span>課誦模式</span>
                    </a>
                    <a href="story.html" class="nav-link ${currentPath === 'story.html' ? 'active' : ''}">
                        <span class="nav-icon">◈</span>
                        <span>〈楞嚴咒〉緣起</span>
                    </a>
                    <a href="index.html" onclick="return window.confirmAndGoBackToHome(event);" class="nav-link">
                        <span class="nav-icon">↩️</span>
                        <span>返回首頁</span>
                    </a>
                </div>
                
                <!-- 使用者資訊 -->
                <div class="nav-user">
                    <span class="user-merit">◎ <span id="nav-merit">0</span></span>
                    <span class="user-level">⭐ Lv.<span id="nav-level">1</span></span>
                </div>
            </div>
        </nav>
    `;

    // 插入導航欄到頁面頂部
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // 為 body 添加 padding-top，避免內容被導航欄遮擋
    document.body.style.paddingTop = '70px';

    // 更新導航欄資料
    updateNavData();

    // 監聽資料更新
    window.addEventListener('userDataUpdated', updateNavData);
}

/**
 * 更新導航欄資料
 */
function updateNavData() {
    if (window.globalDataManager && window.globalDataManager.userData) {
        const userData = window.globalDataManager.userData;

        const meritEl = document.getElementById('nav-merit');
        const levelEl = document.getElementById('nav-level');

        if (meritEl) meritEl.textContent = userData.merit;
        if (levelEl) levelEl.textContent = userData.level;
    }
}

/**
 * 檢查是否為首次訪問
 * 如果是首次訪問且未完成劇情，跳轉到劇情頁
 */
function checkFirstVisit() {
    // 如果當前已經在劇情頁，不需要檢查
    const currentPath = window.location.pathname;
    if (currentPath.includes('rpg-story')) {
        return true;
    }

    // 檢查使用者資料
    if (window.globalDataManager && window.globalDataManager.userData) {
        const userData = window.globalDataManager.userData;

        // 如果是首次訪問且未完成劇情
        if (userData.firstVisit && !userData.storyCompleted) {
            // 顯示過渡動畫
            document.body.classList.add('page-exit');

            // 延遲跳轉
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 300);

            return false;
        }
    }

    return true;
}

/**
 * 頁面過渡效果
 */
function navigateWithTransition(url) {
    // 添加退出動畫
    document.body.classList.add('page-exit');

    // 延遲跳轉
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

/**
 * 為所有內部連結添加過渡效果
 */
function setupTransitionLinks() {
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');

        // 只處理內部連結
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                // 如果不是在新視窗開啟
                if (!e.ctrlKey && !e.metaKey && !link.target) {
                    e.preventDefault();
                    navigateWithTransition(href);
                }
            });
        }
    });
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initGlobalNav();
        setupTransitionLinks();
    });
} else {
    initGlobalNav();
    setupTransitionLinks();
}

// 匯出函數
window.initGlobalNav = initGlobalNav;
window.checkFirstVisit = checkFirstVisit;
window.navigateWithTransition = navigateWithTransition;

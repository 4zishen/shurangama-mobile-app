/**
 * ═══════════════════════════════════════════════════════════════
 * 檔案名稱：mobile-app.js
 * 功能說明：楞嚴咒修行平台 — 手機 App 核心邏輯
 * 包含：路由、狀態管理、各頁面邏輯、手勢控制
 * ═══════════════════════════════════════════════════════════════
 */

const MobileApp = (() => {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // 狀態管理
    // ═══════════════════════════════════════════════════════════
    const state = {
        currentTab: 'home',
        previousTab: null,
        userName: '修行者',
        userAvatar: 'avatars/mobile/1praying_monk.png',
        merit: 0,
        xp: 0,
        level: 1,
        streak: 0,
        lastCheckin: null,
        checkinHistory: [],
        storyCompleted: false,
        practiceSection: 'verses',
        practiceMode: 'default',
        practicePage: 0,
        showPinyin: false,
        // Game state
        gameErrors: 0,
        gameCurrentIdx: 0,
        gameLines: [],
        gamePlayerPos: 10,
        gameEnemyPos: 80,
        gameActive: false,
        // Recorder
        isRecording: false,
        mediaRecorder: null,
        audioChunks: [],
        recordedBlob: null
    };

    // ═══════════════════════════════════════════════════════════
    // 外部模組參照（由 HTML 載入的原站 JS 模組）
    // ═══════════════════════════════════════════════════════════
    function getGDM() { return window.globalDataManager; }
    function getSRS() { return window.spacedRepetitionEngine; }
    function getDifficulty() { return window.difficultyEngine; }
    function getRewardNotif() { return window.RewardNotification; }
    let progressiveEngine = null;

    // ═══════════════════════════════════════════════════════════
    // 初始化
    // ═══════════════════════════════════════════════════════════
    function init() {
        loadUserData();
        checkOnboarding();
        initParticles();
        initCheckinWeek();
        initLeaderboard();
        initSections();
        initModes();
        updateUI();
        initSwipeGestures();
        initHashRouting();
        updateDashboard();
        initExternalModules();

        // 監聽 globalDataManager 資料變更事件
        window.addEventListener('userDataUpdated', () => {
            syncFromGDM();
            updateUI();
            updateDashboard();
        });
        window.addEventListener('levelUp', (e) => {
            if (e.detail) {
                state.level = e.detail.newLevel || state.level;
                updateUI();
            }
        });
    }

    // 初始化外部模組（等待 globalDataManager 就緒）
    function initExternalModules() {
        const checkReady = setInterval(() => {
            const gdm = getGDM();
            const srs = getSRS();
            if (gdm && srs) {
                clearInterval(checkReady);
                console.log('[MobileApp] External modules ready');
                // 初始化漸進式學習引擎
                if (window.ProgressiveLearningEngine) {
                    try {
                        progressiveEngine = new ProgressiveLearningEngine(gdm, srs);
                        progressiveEngine.init().then(() => {
                            console.log('[MobileApp] ProgressiveLearningEngine initialized');
                        }).catch(e => console.warn('[MobileApp] PLE init error:', e));
                    } catch(e) {
                        console.warn('[MobileApp] PLE creation error:', e);
                    }
                }
                // 同步一次資料
                syncFromGDM();
                updateUI();
                updateDashboard();
            }
        }, 200);
    }

    // ═══════════════════════════════════════════════════════════
    // 資料管理（透過 globalDataManager 同步）
    // ═══════════════════════════════════════════════════════════
    function syncFromGDM() {
        const gdm = getGDM();
        if (!gdm || !gdm.userData) return;
        const ud = gdm.userData;
        state.userName = ud.userName || state.userName;
        state.userAvatar = ud.userAvatar || state.userAvatar;
        state.merit = ud.merit || 0;
        state.xp = ud.xp || 0;
        state.level = ud.level || 1;
        state.streak = ud.streakDays || 0;
        state.lastCheckin = ud.lastCheckinDate || null;
        state.checkinHistory = ud.checkinHistory || [];
        state.storyCompleted = ud.storyCompleted || false;
    }

    function loadUserData() {
        try {
            // 優先從 globalDataManager 讀取（正確的 key: shurangama_user_data_v2）
            const gdm = getGDM();
            if (gdm && gdm.userData) {
                syncFromGDM();
            } else {
                // globalDataManager 還沒初始化，從 localStorage 直接讀
                const rawData = localStorage.getItem('shurangama_user_data_v2');
                if (rawData) {
                    const data = JSON.parse(rawData);
                    state.userName = data.userName || '修行者';
                    state.userAvatar = data.userAvatar || 'avatars/mobile/1praying_monk.png';
                    state.merit = data.merit || 0;
                    state.xp = data.xp || 0;
                    state.level = data.level || 1;
                    state.streak = data.streakDays || 0;
                    state.lastCheckin = data.lastCheckinDate || null;
                    state.checkinHistory = data.checkinHistory || [];
                    state.storyCompleted = data.storyCompleted || false;
                }
            }

            // 備用：個別 localStorage keys
            state.userName = localStorage.getItem('userName') || state.userName;
            state.storyCompleted = localStorage.getItem('firstStoryShown') === 'true' || state.storyCompleted;
        } catch (e) {
            console.warn('[MobileApp] 載入用戶資料失敗:', e);
        }
    }

    function saveUserData() {
        try {
            const gdm = getGDM();
            if (gdm) {
                // 透過 globalDataManager 保存（自動使用正確的 localStorage key）
                if (gdm.userData) {
                    gdm.userData.userName = state.userName;
                    gdm.userData.userAvatar = state.userAvatar;
                    gdm.userData.storyCompleted = state.storyCompleted;
                    gdm.userData.lastCheckinDate = state.lastCheckin;
                    gdm.userData.checkinHistory = state.checkinHistory;
                    gdm.userData.streakDays = state.streak;
                }
                gdm.saveUserData();
            }
            // 同步到原站個別 keys（相容性）
            localStorage.setItem('userName', state.userName);
            localStorage.setItem('userAvatar', state.userAvatar);
            if (state.storyCompleted) {
                localStorage.setItem('firstStoryShown', 'true');
            }
        } catch (e) {
            console.warn('[MobileApp] 保存用戶資料失敗:', e);
        }
    }

    // 透過 GDM 增加功德（觸發事件，保持同步）
    function addMerit(amount) {
        const gdm = getGDM();
        if (gdm && typeof gdm.addMerit === 'function') {
            gdm.addMerit(amount);
            state.merit = gdm.userData.merit;
        } else {
            state.merit += amount;
        }
    }

    // 透過 GDM 增加經驗（觸發升級事件）
    function addXP(amount) {
        const gdm = getGDM();
        if (gdm && typeof gdm.addXP === 'function') {
            const result = gdm.addXP(amount);
            state.xp = gdm.userData.xp;
            state.level = gdm.userData.level;
            if (result && result.leveledUp) {
                showToast('⭐', '升級了！', `Lv.${result.oldLevel} → Lv.${result.newLevel}`, 'success');
            }
        } else {
            state.xp += amount;
            checkLevelUp();
        }
    }

    // 透過 GDM 扣除功德
    function deductMerit(amount) {
        const gdm = getGDM();
        if (gdm && typeof gdm.deductMerit === 'function') {
            gdm.deductMerit(amount);
            state.merit = gdm.userData.merit;
        } else {
            state.merit -= amount;
        }
    }

    // 記錄錯誤（同步到 GDM 弱點分析 + SRS）
    function recordError(word, context) {
        const gdm = getGDM();
        if (gdm && typeof gdm.recordError === 'function') {
            gdm.recordError(word, context, 'mobile-app');
        }
        // 同時記錄到難度引擎
        const de = getDifficulty();
        if (de && typeof de.recordPerformance === 'function') {
            de.recordPerformance(false);
        }
    }

    // 記錄正確答案（同步到難度引擎）
    function recordCorrect() {
        const de = getDifficulty();
        if (de && typeof de.recordPerformance === 'function') {
            de.recordPerformance(true);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UI 更新
    // ═══════════════════════════════════════════════════════════
    function updateUI() {
        // Header
        const avatar = document.getElementById('headerAvatar');
        if (avatar) avatar.src = state.userAvatar;
        setText('meritCount', state.merit);
        setText('levelText', 'Lv.' + state.level);

        // Dashboard greeting
        setText('dashGreeting', `歡迎回來，${state.userName}`);

        // Game merit display
        setText('gameMeritDisplay', state.merit);
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function updateDashboard() {
        // 計算進度
        const totalLines = 427;
        const learnedStr = localStorage.getItem('learnedLines');
        const learned = learnedStr ? JSON.parse(learnedStr).length : 0;
        const pct = Math.round((learned / totalLines) * 100);

        // 更新進度環
        const ring = document.getElementById('progressRing');
        if (ring) {
            const circumference = 2 * Math.PI * 60; // r=60
            const offset = circumference - (pct / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        }
        setText('progressPercent', pct + '%');
        setText('progressLabel', `已學會 ${learned}/${totalLines} 句`);

        // 連續天數
        setText('streakDisplay', '🔥 ' + state.streak + ' 天');
    }

    // ═══════════════════════════════════════════════════════════
    // Onboarding
    // ═══════════════════════════════════════════════════════════
    function checkOnboarding() {
        if (state.storyCompleted) {
            document.getElementById('onboardingOverlay').classList.add('hidden');
            document.getElementById('appHeader').style.display = '';
            document.getElementById('bottomNav').style.display = '';
        } else {
            document.getElementById('appHeader').style.display = 'none';
            document.getElementById('bottomNav').style.display = 'none';
        }
    }

    function initParticles() {
        const container = document.getElementById('obParticles');
        if (!container) return;
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('div');
            p.className = 'ob-particle';
            const size = Math.random() * 4 + 2;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 6 + 's';
            p.style.animationDuration = (Math.random() * 4 + 4) + 's';
            container.appendChild(p);
        }
    }

    function selectAvatar(btn) {
        document.querySelectorAll('.ob-avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.userAvatar = btn.getAttribute('data-avatar');
    }

    function startOnboarding() {
        const input = document.getElementById('obUserName');
        state.userName = (input && input.value.trim()) || '修行者';
        updateOBNames();
        nextOBScene(1);
    }

    function updateOBNames() {
        document.querySelectorAll('[id^="obName"]').forEach(el => {
            el.textContent = state.userName;
        });
        const speaker1 = document.getElementById('obSpeaker1');
        if (speaker1) speaker1.textContent = state.userName;
    }

    function nextOBScene(num) {
        document.querySelectorAll('.ob-scene').forEach(s => s.classList.remove('active'));
        const scene = document.getElementById('obScene' + num);
        if (scene) {
            scene.classList.add('active');
            // 更新進度
            document.querySelectorAll('.ob-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i <= num);
            });
            // 滾動到頂
            document.getElementById('onboardingOverlay').scrollTop = 0;
        }
    }

    function showEncouragement() {
        document.querySelectorAll('.ob-scene').forEach(s => s.classList.remove('active'));
        document.getElementById('obSceneEncourage').classList.add('active');
        document.getElementById('onboardingOverlay').scrollTop = 0;
    }

    function acceptMission() {
        state.storyCompleted = true;
        addMerit(20);
        addXP(50);
        saveUserData();

        // 淡出動畫
        const overlay = document.getElementById('onboardingOverlay');
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.opacity = '0';

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.opacity = '';
            document.getElementById('appHeader').style.display = '';
            document.getElementById('bottomNav').style.display = '';
            updateUI();
            updateDashboard();
            showToast('✨', '使命已接受！', `+20 功德 +50 XP`, 'success');
            // 也透過 RewardNotification 顯示
            const rn = getRewardNotif();
            if (rn) rn.showMeritGain(20, '接受使命');
        }, 500);
    }

    function skipOnboarding() {
        state.storyCompleted = true;
        const input = document.getElementById('obUserName');
        state.userName = (input && input.value.trim()) || '修行者';
        saveUserData();
        const overlay = document.getElementById('onboardingOverlay');
        overlay.classList.add('hidden');
        document.getElementById('appHeader').style.display = '';
        document.getElementById('bottomNav').style.display = '';
        updateUI();
        updateDashboard();
    }

    function advancedEntry() {
        const input = document.getElementById('obUserName');
        state.userName = (input && input.value.trim()) || '修行者';
        state.storyCompleted = true;
        saveUserData();
        const overlay = document.getElementById('onboardingOverlay');
        overlay.classList.add('hidden');
        document.getElementById('appHeader').style.display = '';
        document.getElementById('bottomNav').style.display = '';
        updateUI();
        updateDashboard();
    }

    // ═══════════════════════════════════════════════════════════
    // Tab 路由
    // ═══════════════════════════════════════════════════════════
    const tabOrder = ['home', 'practice', 'game', 'story', 'leaderboard'];

    function switchTab(tab) {
        if (tab === state.currentTab) return;

        const prevIdx = tabOrder.indexOf(state.currentTab);
        const newIdx = tabOrder.indexOf(tab);
        const direction = newIdx > prevIdx ? 'right' : 'left';

        state.previousTab = state.currentTab;
        state.currentTab = tab;

        // 更新 views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active', 'slide-in-right', 'slide-in-left');
        });

        const newView = document.getElementById('view-' + tab);
        if (newView) {
            newView.classList.add('active', direction === 'right' ? 'slide-in-right' : 'slide-in-left');
        }

        // 更新 tab 按鈕
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tab);
        });

        // 特殊頁面初始化
        if (tab === 'practice') {
            renderMantra();
        } else if (tab === 'leaderboard') {
            initLeaderboard();
        }

        // 更新 hash
        window.location.hash = tab;

        // 錄音 FAB 顯示
        const fab = document.getElementById('recorderFab');
        if (fab) {
            fab.style.display = tab === 'practice' ? '' : 'none';
        }

        // 滾動到頂部
        document.getElementById('appContent').scrollTop = 0;
        window.scrollTo(0, 0);
    }

    function initHashRouting() {
        const hash = window.location.hash.slice(1);
        if (hash && tabOrder.includes(hash)) {
            switchTab(hash);
        }
        window.addEventListener('hashchange', () => {
            const h = window.location.hash.slice(1);
            if (h && tabOrder.includes(h) && h !== state.currentTab) {
                switchTab(h);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 手勢控制
    // ═══════════════════════════════════════════════════════════
    function initSwipeGestures() {
        let startX = 0, startY = 0, swiping = false;

        document.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            swiping = true;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            if (!swiping) return;
            swiping = false;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                const idx = tabOrder.indexOf(state.currentTab);
                if (dx < 0 && idx < tabOrder.length - 1) {
                    switchTab(tabOrder[idx + 1]);
                } else if (dx > 0 && idx > 0) {
                    switchTab(tabOrder[idx - 1]);
                }
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════════════════
    // 每日打卡
    // ═══════════════════════════════════════════════════════════
    function initCheckinWeek() {
        const container = document.getElementById('checkinWeek');
        if (!container) return;
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        const today = new Date();
        const dayOfWeek = today.getDay();

        container.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - dayOfWeek + i);
            const dateStr = d.toISOString().split('T')[0];
            const done = state.checkinHistory.includes(dateStr);
            const isToday = i === dayOfWeek;

            container.innerHTML += `
                <div class="checkin-day">
                    <div class="checkin-day-label">${days[i]}</div>
                    <div class="checkin-day-circle ${done ? 'done' : ''} ${isToday ? 'today' : ''}">
                        ${done ? '✓' : d.getDate()}
                    </div>
                </div>
            `;
        }

        // 更新打卡按鈕狀態
        const todayStr = today.toISOString().split('T')[0];
        const btn = document.getElementById('checkinBtn');
        if (btn && state.checkinHistory.includes(todayStr)) {
            btn.textContent = '✅ 已打卡';
            btn.classList.add('checked');
            btn.disabled = true;
        }
    }

    function dailyCheckin() {
        const today = new Date().toISOString().split('T')[0];
        if (state.checkinHistory.includes(today)) {
            showToast('📅', '今日已打卡', '明天再來吧！', 'warning');
            return;
        }

        state.checkinHistory.push(today);

        // 計算連續天數
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (state.lastCheckin === yStr) {
            state.streak++;
        } else if (state.lastCheckin !== today) {
            state.streak = 1;
        }
        state.lastCheckin = today;

        // 獎勵（透過 GDM 模組）
        const meritReward = 5 + Math.min(state.streak, 7);
        addMerit(meritReward);
        addXP(10);
        saveUserData();

        // UI 更新
        initCheckinWeek();
        updateUI();
        updateDashboard();

        showToast('🎉', '打卡成功！', `+${meritReward} 功德 | 連續 ${state.streak} 天`, 'success');
        showMeritFly(meritReward);
        const rn = getRewardNotif();
        if (rn) rn.showMeritGain(meritReward, '每日打卡');
    }

    // ═══════════════════════════════════════════════════════════
    // 經文練習
    // ═══════════════════════════════════════════════════════════
    const sections = [
        { key: 'verses', label: '偈頌' },
        { key: 'assembly1', label: '第一會' },
        { key: 'assembly2', label: '第二會' },
        { key: 'assembly3', label: '第三會' },
        { key: 'assembly4', label: '第四會' },
        { key: 'assembly5', label: '第五會' }
    ];

    const modes = [
        { key: 'default', label: '📖 閱讀' },
        { key: 'puzzle', label: '🧩 拼圖' },
        { key: 'quiz', label: '❓ 問答' }
    ];

    function initSections() {
        const container = document.getElementById('sectionSelector');
        if (!container) return;
        container.innerHTML = sections.map(s =>
            `<button class="section-chip ${s.key === state.practiceSection ? 'active' : ''}"
                     onclick="MobileApp.setSection('${s.key}')">${s.label}</button>`
        ).join('');
    }

    function initModes() {
        const container = document.getElementById('modeSelector');
        if (!container) return;
        container.innerHTML = modes.map(m =>
            `<button class="mode-chip ${m.key === state.practiceMode ? 'active' : ''}"
                     onclick="MobileApp.setMode('${m.key}')">${m.label}</button>`
        ).join('');
    }

    function setSection(key) {
        state.practiceSection = key;
        state.practicePage = 0;
        document.querySelectorAll('.section-chip').forEach(c =>
            c.classList.toggle('active', c.textContent.trim() === sections.find(s => s.key === key)?.label));
        renderMantra();
    }

    function setMode(key) {
        state.practiceMode = key;
        document.querySelectorAll('.mode-chip').forEach(c =>
            c.classList.toggle('active', c.textContent.trim() === modes.find(m => m.key === key)?.label));

        // 切換模式內容
        document.getElementById('defaultModeContent').style.display = key === 'default' ? '' : 'none';
        document.getElementById('puzzleModeContent').style.display = key === 'puzzle' ? '' : 'none';
        document.getElementById('quizModeContent').style.display = key === 'quiz' ? '' : 'none';

        if (key === 'default') renderMantra();
        else if (key === 'puzzle') initPuzzle();
        else if (key === 'quiz') initQuiz();
    }

    function getMantraData() {
        if (typeof fullMantraData === 'undefined') return [];
        return fullMantraData[state.practiceSection] || [];
    }

    function renderMantra() {
        const data = getMantraData();
        if (!data.length) {
            document.getElementById('mantraDisplay').innerHTML =
                '<div class="empty-state"><span class="empty-state-icon">📖</span><p class="empty-state-text">載入咒語資料中...</p></div>';
            return;
        }

        const page = data[state.practicePage] || data[0];
        const container = document.getElementById('mantraDisplay');

        container.innerHTML = page.map((line, i) => {
            const chars = line.columns ? line.columns.filter(c => c).join('　') : '';
            return `
                <div class="mantra-line" onclick="MobileApp.playAudio('${line.audioSrc || ''}')">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button class="play-btn" onclick="event.stopPropagation(); MobileApp.playAudio('${line.audioSrc || ''}')">▶</button>
                        <div style="flex:1;">
                            <div class="mantra-line-number">第 ${line.lineNumber} 句</div>
                            <div class="mantra-chars">${chars}</div>
                            <div class="mantra-pinyin ${state.showPinyin ? 'show' : ''}">${line.pinyin || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 分頁
        renderPagination(data.length);
    }

    function renderPagination(totalPages) {
        const container = document.getElementById('pagination');
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <button class="page-btn" onclick="MobileApp.changePage(-1)" ${state.practicePage <= 0 ? 'disabled' : ''}>← 上頁</button>
            <span class="page-indicator">${state.practicePage + 1} / ${totalPages}</span>
            <button class="page-btn" onclick="MobileApp.changePage(1)" ${state.practicePage >= totalPages - 1 ? 'disabled' : ''}>下頁 →</button>
        `;
    }

    function changePage(delta) {
        const data = getMantraData();
        const newPage = state.practicePage + delta;
        if (newPage >= 0 && newPage < data.length) {
            state.practicePage = newPage;
            renderMantra();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function togglePinyin() {
        state.showPinyin = !state.showPinyin;
        document.getElementById('pinyinToggle').classList.toggle('on', state.showPinyin);
        document.querySelectorAll('.mantra-pinyin').forEach(p =>
            p.classList.toggle('show', state.showPinyin));
    }

    function playAudio(src) {
        if (!src) return;
        const player = document.getElementById('audioPlayer');
        player.src = src;
        player.play().catch(() => {});
    }

    // ═══════════════════════════════════════════════════════════
    // 拼圖模式
    // ═══════════════════════════════════════════════════════════
    let puzzleCurrentLine = 0;
    let puzzleCorrectOrder = [];
    let puzzleUserOrder = [];

    function initPuzzle() {
        const data = getMantraData();
        const allLines = data.flat();
        if (!allLines.length) return;

        puzzleCurrentLine = Math.floor(Math.random() * allLines.length);
        const line = allLines[puzzleCurrentLine];
        const chars = (line.columns || []).filter(c => c && c.trim());

        if (!chars.length) { nextPuzzle(); return; }

        puzzleCorrectOrder = [...chars];
        puzzleUserOrder = [];

        // 打亂順序
        const shuffled = [...chars].sort(() => Math.random() - 0.5);

        document.getElementById('puzzleRef').textContent = `第 ${line.lineNumber} 句`;
        document.getElementById('puzzleAnswer').innerHTML = '';
        document.getElementById('puzzlePieces').innerHTML = shuffled.map((c, i) =>
            `<div class="puzzle-piece" data-idx="${i}" data-char="${c}" onclick="MobileApp.placePuzzlePiece(this)">${c}</div>`
        ).join('');
    }

    function placePuzzlePiece(el) {
        if (el.classList.contains('placed')) return;
        el.classList.add('placed');
        puzzleUserOrder.push(el.getAttribute('data-char'));

        const answer = document.getElementById('puzzleAnswer');
        const piece = document.createElement('div');
        piece.className = 'puzzle-answer-piece';
        piece.textContent = el.getAttribute('data-char');
        piece.onclick = () => {
            // 移除
            puzzleUserOrder = puzzleUserOrder.filter(c => c !== el.getAttribute('data-char'));
            el.classList.remove('placed');
            piece.remove();
        };
        answer.appendChild(piece);

        // 檢查是否完成
        if (puzzleUserOrder.length === puzzleCorrectOrder.length) {
            const correct = JSON.stringify(puzzleUserOrder) === JSON.stringify(puzzleCorrectOrder);
            if (correct) {
                showToast('🎉', '正確！', '+5 功德', 'success');
                addMerit(5);
                addXP(10);
                recordCorrect();
                saveUserData();
                updateUI();
            } else {
                showToast('❌', '順序不正確', `正確順序：${puzzleCorrectOrder.join(' ')}`, 'error');
                recordError(puzzleCorrectOrder.join(''), 'puzzle');
            }
        }
    }

    function nextPuzzle() {
        initPuzzle();
    }

    // ═══════════════════════════════════════════════════════════
    // 問答模式
    // ═══════════════════════════════════════════════════════════
    let quizCurrentIdx = 0;
    let quizLines = [];

    function initQuiz() {
        const data = getMantraData();
        quizLines = data.flat();
        if (quizLines.length < 2) return;
        quizCurrentIdx = Math.floor(Math.random() * (quizLines.length - 1));
        renderQuiz();
    }

    function renderQuiz() {
        if (quizCurrentIdx >= quizLines.length - 1) {
            quizCurrentIdx = 0;
        }

        const current = quizLines[quizCurrentIdx];
        const correct = quizLines[quizCurrentIdx + 1];
        const currentText = (current.columns || []).filter(c => c).join(' ');
        const correctText = (correct.columns || []).filter(c => c).join(' ');

        setText('quizCurrentText', currentText);

        // 生成選項（1正確 + 3隨機）
        const options = [{ text: correctText, correct: true }];
        const others = quizLines.filter((_, i) => i !== quizCurrentIdx + 1);
        const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
        shuffled.forEach(l => {
            options.push({ text: (l.columns || []).filter(c => c).join(' '), correct: false });
        });
        options.sort(() => Math.random() - 0.5);

        const container = document.getElementById('quizOptions');
        container.innerHTML = options.map(o =>
            `<button class="quiz-option" onclick="MobileApp.answerQuiz(this, ${o.correct})">${o.text}</button>`
        ).join('');

        document.getElementById('quizFeedback').style.display = 'none';
    }

    function answerQuiz(btn, correct) {
        // 禁用所有按鈕
        document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);

        if (correct) {
            btn.classList.add('correct');
            const fb = document.getElementById('quizFeedback');
            fb.className = 'game-feedback correct';
            fb.textContent = '✅ 正確！';
            fb.style.display = 'block';
            addMerit(2);
            addXP(5);
            recordCorrect();
            saveUserData();
            updateUI();
        } else {
            btn.classList.add('wrong');
            // 顯示正確答案
            const correctLine = quizLines[quizCurrentIdx + 1];
            const ct = (correctLine.columns || []).filter(c => c).join(' ');
            document.querySelectorAll('.quiz-option').forEach(b => {
                if (!b.classList.contains('wrong') && b.textContent === ct) {
                    b.classList.add('correct');
                }
            });
            const fb = document.getElementById('quizFeedback');
            fb.className = 'game-feedback wrong';
            fb.textContent = '❌ 答錯了';
            fb.style.display = 'block';
            recordError(ct, 'quiz');
        }

        // 自動下一題
        setTimeout(() => {
            quizCurrentIdx++;
            renderQuiz();
        }, 1500);
    }

    // ═══════════════════════════════════════════════════════════
    // 追逐遊戲
    // ═══════════════════════════════════════════════════════════
    function startChaseGame() {
        if (state.merit < 10) {
            showToast('⚠️', '功德不足', '需要至少 10 功德才能入場', 'warning');
            return;
        }

        deductMerit(10);
        saveUserData();
        updateUI();

        state.gameErrors = 0;
        state.gameCurrentIdx = 0;
        state.gamePlayerPos = 10;
        state.gameEnemyPos = 80;
        state.gameActive = true;

        const section = document.getElementById('gameSection').value;
        const data = typeof fullMantraData !== 'undefined' ? (fullMantraData[section] || []) : [];
        state.gameLines = data.flat();

        if (state.gameLines.length < 2) {
            showToast('⚠️', '資料不足', '此分會資料不可用', 'warning');
            exitChaseGame();
            return;
        }

        document.getElementById('gameModeSelect').style.display = 'none';
        document.getElementById('chaseGameArea').style.display = '';
        document.getElementById('gameResultArea').style.display = 'none';

        renderChaseGame();
    }

    function renderChaseGame() {
        if (!state.gameActive) return;
        if (state.gameCurrentIdx >= state.gameLines.length - 1) {
            endChaseGame(true);
            return;
        }

        const current = state.gameLines[state.gameCurrentIdx];
        const correct = state.gameLines[state.gameCurrentIdx + 1];
        const currentText = (current.columns || []).filter(c => c).join(' ');

        setText('gameCurrentText', currentText);
        setText('chaseErrors', state.gameErrors);

        // 更新角色位置
        document.getElementById('chasePlayer').style.left = state.gamePlayerPos + '%';
        document.getElementById('chaseEnemy').style.left = state.gameEnemyPos + '%';

        // 生成4個選項
        const correctText = (correct.columns || []).filter(c => c).join(' ');
        const options = [{ text: correctText, correct: true }];
        const others = state.gameLines.filter((_, i) => i !== state.gameCurrentIdx + 1);
        const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
        shuffled.forEach(l => {
            options.push({ text: (l.columns || []).filter(c => c).join(' '), correct: false });
        });
        options.sort(() => Math.random() - 0.5);

        const container = document.getElementById('gameOptions');
        container.innerHTML = options.map(o =>
            `<button class="game-option-btn" onclick="MobileApp.answerChase(this, ${o.correct})">${o.text}</button>`
        ).join('');

        document.getElementById('gameFeedback').style.display = 'none';
    }

    function answerChase(btn, correct) {
        document.querySelectorAll('.game-option-btn').forEach(b => b.disabled = true);

        const fb = document.getElementById('gameFeedback');
        if (correct) {
            btn.style.background = 'var(--success)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--success)';
            fb.className = 'game-feedback correct';
            fb.textContent = '✅ 正確！前進！';
            fb.style.display = 'block';
            recordCorrect();

            state.gamePlayerPos = Math.min(state.gamePlayerPos + 5, 85);
            state.gameCurrentIdx++;
        } else {
            btn.style.background = 'var(--danger)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--danger)';
            state.gameErrors++;
            state.gamePlayerPos = Math.max(state.gamePlayerPos - 3, 5);

            fb.className = 'game-feedback wrong';
            const correctLine = state.gameLines[state.gameCurrentIdx + 1];
            const ct = (correctLine.columns || []).filter(c => c).join(' ');
            fb.textContent = `❌ 正確答案: ${ct}`;
            fb.style.display = 'block';
            recordError(ct, 'chase-game');

            if (state.gameErrors >= 10) {
                setTimeout(() => endChaseGame(false), 1000);
                return;
            }

            state.gameCurrentIdx++;
        }

        // 更新位置
        document.getElementById('chasePlayer').style.left = state.gamePlayerPos + '%';
        setText('chaseErrors', state.gameErrors);

        setTimeout(() => {
            if (state.gameActive) renderChaseGame();
        }, 1200);
    }

    function endChaseGame(won) {
        state.gameActive = false;
        document.getElementById('chaseGameArea').style.display = 'none';
        document.getElementById('gameResultArea').style.display = '';

        if (won) {
            const reward = 15 + Math.max(0, 10 - state.gameErrors);
            addMerit(reward);
            addXP(50);
            saveUserData();
            updateUI();
            const rn = getRewardNotif();
            if (rn) rn.showMeritGain(reward, '追逐賽完成');

            setText('gameResultIcon', '🎉');
            setText('gameResultTitle', '挑戰完成！');
            setText('gameResultScore', `答對 ${state.gameCurrentIdx - state.gameErrors}/${state.gameCurrentIdx} 題\n獲得 ${reward} 功德 + 50 XP`);
        } else {
            setText('gameResultIcon', '😔');
            setText('gameResultTitle', '挑戰失敗');
            setText('gameResultScore', `錯誤次數達到 10 次\n下次再加油！`);
        }
    }

    function exitChaseGame() {
        state.gameActive = false;
        document.getElementById('gameModeSelect').style.display = '';
        document.getElementById('chaseGameArea').style.display = 'none';
        document.getElementById('gameResultArea').style.display = 'none';
        updateUI();
    }

    function resetChaseGame() {
        if (state.gameActive) {
            state.gameCurrentIdx = 0;
            state.gameErrors = 0;
            state.gamePlayerPos = 10;
            state.gameEnemyPos = 80;

            const section = document.getElementById('gameSection').value;
            const data = typeof fullMantraData !== 'undefined' ? (fullMantraData[section] || []) : [];
            state.gameLines = data.flat();
            renderChaseGame();
        }
    }

    function playGameAudio() {
        if (state.gameLines[state.gameCurrentIdx]) {
            playAudio(state.gameLines[state.gameCurrentIdx].audioSrc);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 排行榜
    // ═══════════════════════════════════════════════════════════
    function initLeaderboard() {
        const container = document.getElementById('leaderboardList');
        if (!container) return;

        const fakeData = [
            { name: '慧光法師', level: 15, xp: 28500, avatar: '🧘' },
            { name: '覺明', level: 12, xp: 18200, avatar: '📿' },
            { name: '妙音居士', level: 10, xp: 14800, avatar: '🪷' },
            { name: '淨心', level: 9, xp: 12300, avatar: '☸️' },
            { name: '法喜', level: 8, xp: 9800, avatar: '🙏' },
            { name: '般若行者', level: 7, xp: 7500, avatar: '🔔' },
            { name: '如意', level: 6, xp: 5200, avatar: '✨' },
        ];

        // 加入目前使用者
        const userEntry = {
            name: state.userName,
            level: state.level,
            xp: state.xp,
            avatar: '👤',
            isCurrentUser: true
        };

        const allEntries = [...fakeData, userEntry].sort((a, b) => b.xp - a.xp);

        container.innerHTML = allEntries.map((entry, i) => {
            const rank = i + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'top-1';
            else if (rank === 2) rankClass = 'top-2';
            else if (rank === 3) rankClass = 'top-3';

            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

            return `
                <div class="lb-item ${rankClass} ${entry.isCurrentUser ? 'current-user' : ''}">
                    <div class="lb-rank">${rankEmoji}</div>
                    <div class="lb-avatar">${entry.avatar}</div>
                    <div class="lb-info">
                        <div class="lb-name">${entry.name} ${entry.isCurrentUser ? '(你)' : ''}</div>
                        <div class="lb-level">Lv.${entry.level}</div>
                    </div>
                    <div class="lb-xp">${entry.xp.toLocaleString()} XP</div>
                </div>
            `;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════
    // 等級系統（使用 GDM 的閾值公式，與桌面版一致）
    // XP 閾值: [0, 100, 300, 700, 1500, 3200, 6500, 12000, 25000, 50000]
    // ═══════════════════════════════════════════════════════════
    function checkLevelUp() {
        const gdm = getGDM();
        if (gdm && typeof gdm.calculateLevel === 'function') {
            const newLevel = gdm.calculateLevel(state.xp);
            if (newLevel > state.level) {
                state.level = newLevel;
                showToast('⭐', '升級了！', `恭喜到達 Lv.${state.level}`, 'success');
            }
        } else {
            // 備用：使用與 GDM 相同的閾值陣列
            const thresholds = [0, 100, 300, 700, 1500, 3200, 6500, 12000, 25000, 50000];
            let newLevel = 1;
            for (let i = thresholds.length - 1; i >= 0; i--) {
                if (state.xp >= thresholds[i]) { newLevel = i + 1; break; }
            }
            if (newLevel > state.level) {
                state.level = newLevel;
                showToast('⭐', '升級了！', `恭喜到達 Lv.${state.level}`, 'success');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Toast 通知
    // ═══════════════════════════════════════════════════════════
    let toastTimeout = null;

    function showToast(icon, title, message, type = 'success') {
        const toast = document.getElementById('mobileToast');
        toast.className = 'mobile-toast ' + type;
        setText('toastIcon', icon);
        setText('toastTitle', title);
        setText('toastMessage', message);

        clearTimeout(toastTimeout);
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ═══════════════════════════════════════════════════════════
    // 功德飛入動畫
    // ═══════════════════════════════════════════════════════════
    function showMeritFly(amount) {
        const el = document.createElement('div');
        el.className = 'merit-fly';
        el.textContent = `+${amount} ☸`;
        el.style.left = '50%';
        el.style.top = '40%';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }

    // ═══════════════════════════════════════════════════════════
    // 錄音功能
    // ═══════════════════════════════════════════════════════════
    function toggleRecorder() {
        if (!state.isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];

            state.mediaRecorder.ondataavailable = e => state.audioChunks.push(e.data);
            state.mediaRecorder.onstop = () => {
                state.recordedBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(t => t.stop());
                showToast('🎙️', '錄音完成', '點擊播放按鈕聽取', 'success');
            };

            state.mediaRecorder.start();
            state.isRecording = true;
            document.getElementById('recorderFab').classList.add('recording');
            document.getElementById('recorderFab').textContent = '⏹️';
        } catch (e) {
            showToast('❌', '錄音失敗', '請允許麥克風權限', 'error');
        }
    }

    function stopRecording() {
        if (state.mediaRecorder && state.isRecording) {
            state.mediaRecorder.stop();
            state.isRecording = false;
            document.getElementById('recorderFab').classList.remove('recording');
            document.getElementById('recorderFab').textContent = '🎙️';
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Profile（整合 GDM 統計）
    // ═══════════════════════════════════════════════════════════
    function showProfile() {
        let msg = `法號：${state.userName}\n等級：Lv.${state.level}\n功德：${state.merit}\n經驗值：${state.xp}\n連續打卡：${state.streak} 天`;

        // 從 GDM 取得更詳細的統計
        const gdm = getGDM();
        if (gdm && typeof gdm.getStatistics === 'function') {
            const stats = gdm.getStatistics();
            if (stats) {
                msg += `\n\n── 詳細統計 ──`;
                msg += `\n總答題數：${stats.totalQuestions || 0}`;
                msg += `\n正確率：${stats.accuracy || 0}%`;
                msg += `\n最長連續：${stats.maxStreak || 0} 天`;
            }
        }

        // 從 SRS 取得複習統計
        const srs = getSRS();
        if (srs && typeof srs.getStats === 'function') {
            const srsStats = srs.getStats();
            if (srsStats) {
                msg += `\n\n── 複習統計 ──`;
                msg += `\n待複習：${srsStats.dueToday || 0} 項`;
                msg += `\n總複習項：${srsStats.total || 0}`;
            }
        }

        alert(msg);
    }

    // ═══════════════════════════════════════════════════════════
    // 公開 API
    // ═══════════════════════════════════════════════════════════
    return {
        init,
        switchTab,
        selectAvatar,
        startOnboarding,
        nextOBScene,
        showEncouragement,
        acceptMission,
        skipOnboarding,
        advancedEntry,
        dailyCheckin,
        setSection,
        setMode,
        changePage,
        togglePinyin,
        playAudio,
        placePuzzlePiece,
        nextPuzzle,
        answerQuiz,
        startChaseGame,
        answerChase,
        exitChaseGame,
        resetChaseGame,
        playGameAudio,
        toggleRecorder,
        showProfile,
        showToast
    };
})();

// 啟動 App
document.addEventListener('DOMContentLoaded', MobileApp.init);

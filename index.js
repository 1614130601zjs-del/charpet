import { eventSource, event_types } from '../../../script.js';
import { getContext } from '../../../extensions.js';

const EXT_ID = 'charpet-st-extension';
const PET_EVENTS = ['CHARACTER_SELECTED', 'CHAT_CHANGED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_RECEIVED', 'GENERATION_ENDED', 'GENERATION_STOPPED'];
let root;
let petImage;
let gameFrame = 0;
let gameRunning = false;
let gameOver = false;
let gameTick = 0;
let gameScore = 0;
let gameSpeed = 4;
let gameLast = 0;
let gameObstacles = [];
let bunnyY = 0;
let bunnyVY = 0;
let gameCanvas;
let gameCtx;
let gameScoreEl;
let gameStatusEl;
let lastCharacterKey = '';
let observer;

const $ = (selector) => root?.querySelector(selector);
const safeText = (value) => typeof value === 'string' ? value.trim() : '';
const escapeHtml = (value) => safeText(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function getCurrentCharacter() {
    try {
        const context = getContext();
        const characterId = context?.characterId;
        const characters = context?.characters;
        let character = Number.isInteger(characterId) && characterId >= 0 ? characters?.[characterId] : null;
        if (!character && context?.character && typeof context.character === 'object') character = context.character;
        if (!character && Array.isArray(characters) && characters.length === 1) character = characters[0];
        if (!character) {
            return {
                key: 'no-character',
                name: '尚未选择角色',
                avatar: '',
                description: '打开一张角色卡后，CharPet 会自动绑定当前角色。',
                personality: '',
            };
        }
        const avatar = safeText(character.avatar);
        const name = safeText(character.name || character.data?.name) || '未命名角色';
        const description = safeText(character.description || character.data?.description);
        const personality = safeText(character.personality || character.data?.personality);
        return {
            key: String(character.avatar || character.name || characterId),
            name,
            avatar: avatar ? (/^(https?:|data:|blob:|\/)/i.test(avatar) ? avatar : '/characters/' + encodeURIComponent(avatar)) : '',
            description,
            personality,
        };
    } catch (error) {
        console.warn('[CharPet] Could not read current SillyTavern character:', error);
        return { key: 'context-unavailable', name: '等待酒馆角色', avatar: '', description: '暂时无法读取当前角色卡。', personality: '' };
    }
}

function setPetImage(src) {
    if (!petImage) return;
    if (src) {
        petImage.src = src;
        petImage.hidden = false;
        petImage.onerror = () => { petImage.hidden = true; };
    } else {
        petImage.removeAttribute('src');
        petImage.hidden = true;
    }
}

function refreshCharacter() {
    if (!root) return;
    const character = getCurrentCharacter();
    const changed = character.key !== lastCharacterKey;
    lastCharacterKey = character.key;
    $('#charpet-name').textContent = character.name;
    $('#charpet-avatar-name').textContent = character.name.slice(0, 1) || '宠';
    $('#charpet-description').textContent = character.description || character.personality || '这张角色卡暂未填写描述。';
    $('#charpet-personality').textContent = character.personality ? '性格：' + character.personality : '';
    setPetImage(character.avatar);
    if (changed) {
        $('#charpet-bubble').textContent = character.name === '尚未选择角色' ? '等你选择角色卡' : '已绑定：' + character.name;
        window.setTimeout(() => {
            if ($('#charpet-bubble')) $('#charpet-bubble').textContent = '点我互动';
        }, 2600);
    }
}

function mount() {
    if (document.getElementById(EXT_ID)) return;
    root = document.createElement('section');
    root.id = EXT_ID;
    root.innerHTML = `
      <button class="charpet-fab" type="button" aria-label="打开 CharPet 桌宠">
        <span class="charpet-fallback">兔</span><img class="charpet-fab-image" alt="" hidden>
        <span class="charpet-notice" id="charpet-bubble">点我互动</span>
      </button>
      <section class="charpet-panel" aria-label="CharPet 桌宠面板" hidden>
        <header class="charpet-header">
          <div><span class="charpet-eyebrow">CHARPET / STUDIO PET</span><strong id="charpet-name">等待酒馆角色</strong></div>
          <button type="button" class="charpet-close" aria-label="关闭">×</button>
        </header>
        <div class="charpet-profile">
          <div class="charpet-avatar"><span id="charpet-avatar-name">宠</span><img id="charpet-profile-image" alt="" hidden></div>
          <div class="charpet-profile-copy"><div class="charpet-status"><i></i> 已连接酒馆</div><p id="charpet-description">打开一张角色卡后，CharPet 会自动绑定当前角色。</p><p class="charpet-personality" id="charpet-personality"></p></div>
        </div>
        <div class="charpet-actions">
          <button type="button" data-action="happy">摸摸头</button>
          <button type="button" data-action="talk">打个招呼</button>
          <button type="button" data-action="sleep">休息一下</button>
          <button type="button" data-action="game">玩跑酷</button>
        </div>
        <div class="charpet-speech" id="charpet-speech" aria-live="polite">准备好陪你了。</div>
        <div class="charpet-runner" hidden>
          <div class="charpet-runner-top"><strong>棉花糖跑酷</strong><span>分数 <b id="charpet-game-score">0000</b></span></div>
          <canvas id="charpet-game-canvas" width="600" height="190" aria-label="跑酷游戏，点击跳跃"></canvas>
          <div class="charpet-game-actions"><button type="button" data-action="game-start">开始 / 重试</button><button type="button" data-action="game-jump">跳跃</button></div>
          <p id="charpet-game-status">点开始后，点击游戏画面或跳跃按钮躲避障碍。</p>
        </div>
        <footer>跟随酒馆当前角色卡 · 本地运行</footer>
      </section>`;
    document.body.appendChild(root);
    petImage = $('.charpet-fab-image');
    const profileImage = $('#charpet-profile-image');
    const originalSetPetImage = setPetImage;
    setPetImage = function(src) {
        originalSetPetImage(src);
        if (!profileImage) return;
        if (src) {
            profileImage.src = src;
            profileImage.hidden = false;
            profileImage.onerror = () => { profileImage.hidden = true; };
        } else {
            profileImage.removeAttribute('src');
            profileImage.hidden = true;
        }
    };
    gameCanvas = $('#charpet-game-canvas');
    gameCtx = gameCanvas.getContext('2d');
    gameScoreEl = $('#charpet-game-score');
    gameStatusEl = $('#charpet-game-status');

    $('.charpet-fab').addEventListener('click', () => {
        const panel = $('.charpet-panel');
        panel.hidden = !panel.hidden;
        if (!panel.hidden) refreshCharacter();
    });
    $('.charpet-close').addEventListener('click', () => { $('.charpet-panel').hidden = true; });
    root.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const name = getCurrentCharacter().name;
        const messages = {
            happy: name + '开心地蹭了蹭你的手。',
            talk: name + '抬起头，像是在认真听你说话。',
            sleep: name + '找了个舒服的位置，准备休息。',
        };
        if (messages[action]) {
            $('#charpet-speech').textContent = messages[action];
            $('#charpet-fab').classList.add('charpet-bounce');
            window.setTimeout(() => $('.charpet-fab')?.classList.remove('charpet-bounce'), 650);
        } else if (action === 'game') {
            $('.charpet-runner').hidden = false;
            drawGame();
        } else if (action === 'game-start') {
            startGame();
        } else if (action === 'game-jump') {
            jumpGame();
        }
    });
    gameCanvas.addEventListener('pointerdown', (event) => { event.preventDefault(); jumpGame(); });
    refreshCharacter();
    observer = new MutationObserver(() => refreshCharacter());
    const chat = document.getElementById('chat');
    if (chat) observer.observe(chat, { childList: true, subtree: false });
    window.addEventListener('resize', drawGame);
}

function drawGame() {
    if (!gameCtx || gameRunning) return;
    const ctx = gameCtx;
    ctx.clearRect(0, 0, 600, 190);
    const sky = ctx.createLinearGradient(0, 0, 0, 190);
    sky.addColorStop(0, '#ffe7f0'); sky.addColorStop(1, '#fff8fb');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 600, 190);
    ctx.fillStyle = '#f4cfe0'; ctx.beginPath(); ctx.moveTo(0, 128); ctx.quadraticCurveTo(120, 95, 250, 128); ctx.quadraticCurveTo(420, 91, 600, 128); ctx.lineTo(600, 190); ctx.lineTo(0, 190); ctx.fill();
    ctx.fillStyle = '#e4a9c3'; ctx.fillRect(0, 151, 600, 39); ctx.fillStyle = '#cc82a6'; ctx.fillRect(0, 151, 600, 3);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText('✿', 40, 142); ctx.fillText('✿', 260, 142); ctx.fillText('✿', 500, 142);
    gameObstacles.forEach(o => { ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(o.x + 12, o.y + 12, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3f8'; ctx.beginPath(); ctx.arc(o.x + 12, o.y + 12, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(75, bunnyY + 25, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(66, bunnyY + 8, 4, 11, -.2, 0, Math.PI * 2); ctx.ellipse(78, bunnyY + 8, 4, 11, .2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0a0c0'; ctx.beginPath(); ctx.ellipse(66, bunnyY + 8, 2, 7, -.2, 0, Math.PI * 2); ctx.ellipse(78, bunnyY + 8, 2, 7, .2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#654057'; ctx.beginPath(); ctx.arc(70, bunnyY + 24, 1.8, 0, 7); ctx.arc(81, bunnyY + 24, 1.8, 0, 7); ctx.fill();
    if (!gameRunning && !gameOver) { ctx.fillStyle = '#9c5d7d'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('点「开始 / 重试」开始跑酷', 205, 45); }
}

function startGame() {
    cancelAnimationFrame(gameFrame);
    gameRunning = true; gameOver = false; gameTick = 0; gameScore = 0; gameSpeed = 4; gameLast = 0; gameObstacles = []; bunnyY = 107; bunnyVY = 0;
    gameScoreEl.textContent = '0000'; gameStatusEl.textContent = '跑起来！点击跳跃躲避障碍。';
    gameFrame = requestAnimationFrame(gameLoop);
}
function jumpGame() {
    if (!gameRunning) {
        if (!gameOver) startGame();
        return;
    }
    if (bunnyY >= 106) bunnyVY = -10.5;
}
function endGame() {
    gameRunning = false; gameOver = true;
    cancelAnimationFrame(gameFrame);
    gameStatusEl.textContent = '撞到障碍啦！本次得分 ' + gameScore + '，点「开始 / 重试」再来一次。';
    drawGame();
    gameCtx.fillStyle = '#8d4f70'; gameCtx.font = 'bold 17px sans-serif'; gameCtx.fillText('游戏结束！', 245, 45);
}
function gameLoop(time) {
    if (!gameRunning) return;
    const dt = Math.min((time - (gameLast || time)) / 16.67, 2); gameLast = time;
    gameTick += dt; gameSpeed = Math.min(4 + gameTick / 700, 8);
    bunnyVY += .58 * dt; bunnyY += bunnyVY * dt;
    if (bunnyY > 107) { bunnyY = 107; bunnyVY = 0; }
    if (gameTick % 72 < dt) gameObstacles.push({ x: 610, y: 130, color: Math.random() > .5 ? '#c58be0' : '#e987b2' });
    gameObstacles.forEach(o => o.x -= gameSpeed * dt);
    gameObstacles = gameObstacles.filter(o => o.x > -30);
    for (const o of gameObstacles) {
        if (75 + 13 > o.x + 3 && 59 < o.x + 21 && bunnyY + 37 > o.y + 3) { endGame(); return; }
    }
    gameScore = Math.floor(gameTick / 3); gameScoreEl.textContent = String(gameScore).padStart(4, '0');
    drawGame();
    gameFrame = requestAnimationFrame(gameLoop);
}

function boot() {
    mount();
    for (const name of PET_EVENTS) {
        const type = event_types?.[name];
        if (type && eventSource?.on) eventSource.on(type, refreshCharacter);
    }
    window.setInterval(refreshCharacter, 1600);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

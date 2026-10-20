import { eventSource, event_types } from '../../../scripts/script.js';
import { getContext } from '../../../scripts/extensions.js';

const EXT_ID = 'charpet-st-extension';
const REFRESH_EVENTS = [
    'CHARACTER_SELECTED',
    'CHAT_CHANGED',
    'CHARACTER_MESSAGE_RENDERED',
    'MESSAGE_RECEIVED',
    'GENERATION_ENDED',
    'GENERATION_STOPPED',
];
let root;
let lastCharacterKey = '';
let refreshTimer;

const $ = (selector) => root?.querySelector(selector);
const text = (value) => typeof value === 'string' ? value.trim() : '';

function currentCharacter() {
    try {
        const context = getContext();
        const id = context?.characterId;
        const list = context?.characters;
        const character = Number.isInteger(id) && id >= 0 ? list?.[id] : null;
        if (!character) {
            return {
                key: 'none',
                name: '尚未选择角色',
                avatar: '',
                description: '选择一张酒馆角色卡后，这里会自动同步角色信息。',
                personality: '',
            };
        }
        const avatar = text(character.avatar);
        return {
            key: String(id) + ':' + text(character.avatar) + ':' + text(character.name),
            name: text(character.name || character.data?.name) || '未命名角色',
            avatar: avatar ? '/characters/' + encodeURIComponent(avatar) : '',
            description: text(character.description || character.data?.description),
            personality: text(character.personality || character.data?.personality),
        };
    } catch (error) {
        console.warn('[CharPet] Failed to read SillyTavern context', error);
        return {
            key: 'unavailable',
            name: '等待酒馆角色',
            avatar: '',
            description: '暂时无法读取当前角色卡，请重新打开面板。',
            personality: '',
        };
    }
}

function applyAvatar(img, fallback, src) {
    if (!img || !fallback) return;
    img.onerror = () => { img.hidden = true; fallback.hidden = false; };
    if (!src) {
        img.removeAttribute('src');
        img.hidden = true;
        fallback.hidden = false;
        return;
    }
    img.src = src;
    img.hidden = false;
    fallback.hidden = true;
}

function refreshCharacter() {
    if (!root) return;
    const character = currentCharacter();
    $('#charpet-name').textContent = character.name;
    $('#charpet-description').textContent = character.description || '这张角色卡还没有填写描述。';
    $('#charpet-personality').textContent = character.personality ? '性格：' + character.personality : '';
    applyAvatar($('#charpet-fab-image'), $('.charpet-fallback'), character.avatar);
    applyAvatar($('#charpet-profile-image'), $('#charpet-profile-fallback'), character.avatar);

    if (character.key !== lastCharacterKey) {
        lastCharacterKey = character.key;
        $('#charpet-bubble').textContent = character.name === '尚未选择角色' ? '等你选择角色卡' : '已绑定：' + character.name;
        window.setTimeout(() => {
            const bubble = $('#charpet-bubble');
            if (bubble) bubble.textContent = '点我互动';
        }, 2200);
    }
}

function showReaction(action) {
    const name = currentCharacter().name;
    const reactions = {
        pet: name + '乖乖地低下头，让你摸摸。',
        hello: name + '看向你，像是在认真回应你。',
        rest: name + '找了个舒服的位置休息。',
    };
    $('#charpet-speech').textContent = reactions[action] || '我在这里陪着你。';
    const pet = $('.charpet-fab');
    pet.classList.remove('charpet-bounce');
    void pet.offsetWidth;
    pet.classList.add('charpet-bounce');
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
          <div class="charpet-avatar"><span id="charpet-profile-fallback">宠</span><img id="charpet-profile-image" alt="" hidden></div>
          <div class="charpet-profile-copy"><div class="charpet-status"><i></i> 已连接酒馆</div><p id="charpet-description">选择一张酒馆角色卡后，这里会自动同步角色信息。</p><p class="charpet-personality" id="charpet-personality"></p></div>
        </div>
        <div class="charpet-actions">
          <button type="button" data-action="pet">摸摸头</button>
          <button type="button" data-action="hello">打个招呼</button>
          <button type="button" data-action="rest">休息一下</button>
        </div>
        <div class="charpet-speech" id="charpet-speech" aria-live="polite">准备好陪你了。</div>
        <footer>跟随酒馆当前角色卡 · 本地运行</footer>
      </section>`;
    document.body.appendChild(root);

    $('.charpet-fab').addEventListener('click', () => {
        const panel = $('.charpet-panel');
        panel.hidden = !panel.hidden;
        if (!panel.hidden) refreshCharacter();
    });
    $('.charpet-close').addEventListener('click', () => { $('.charpet-panel').hidden = true; });
    root.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (button) showReaction(button.dataset.action);
    });

    refreshCharacter();
    const chat = document.getElementById('chat');
    if (chat && typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => refreshCharacter());
        observer.observe(chat, { childList: true });
    }
}

function boot() {
    mount();
    for (const eventName of REFRESH_EVENTS) {
        const eventType = event_types?.[eventName];
        if (eventType && eventSource?.on) eventSource.on(eventType, refreshCharacter);
    }
    refreshTimer = window.setInterval(refreshCharacter, 2000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

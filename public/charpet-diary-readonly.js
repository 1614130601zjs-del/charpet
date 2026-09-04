(() => {
  const apply = () => {
    const nav = [...document.querySelectorAll('.frameworkNav button')].find(b => b.textContent?.trim() === '日记');
    const active = nav?.classList.contains('active');
    if (!active) return;
    const page = document.querySelector('.frameworkPage');
    if (!page) return;

    page.querySelectorAll('input, textarea, select').forEach(el => {
      const input = el;
      input.closest('label, .diaryComposer, form, .panelActions, .frameworkPanel')?.classList.add('charpet-user-diary-control');
    });

    page.querySelectorAll('button').forEach(button => {
      const text = button.textContent?.trim() || '';
      if (/新增|写日记|添加日记|保存日记|编辑日记|删除日记/.test(text)) {
        button.classList.add('charpet-user-diary-control');
      }
    });

    page.querySelectorAll('.charpet-diary-readonly-note').forEach(x => x.remove());
    const note = document.createElement('div');
    note.className = 'charpet-diary-readonly-note frameworkNote';
    note.textContent = '这里是 CHAR 自己留下的日记。User 不需要、也不能手动写日记。';
    page.appendChild(note);
  };

  const style = document.createElement('style');
  style.textContent = '.charpet-user-diary-control{display:none!important}.charpet-diary-readonly-note{margin-top:18px}';
  document.head.appendChild(style);

  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  apply();
})();

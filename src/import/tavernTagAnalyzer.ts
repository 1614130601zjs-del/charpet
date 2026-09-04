/** Deterministic first-pass tag extraction for imported Tavern character cards. */
export function analyzeInitialTags(input: {
  name?: string;
  description?: string;
  personality?: string;
  messageExamples?: string;
  worldbookText?: string;
}): string[] {
  const text = [input.name, input.description, input.personality, input.messageExamples, input.worldbookText]
    .filter(Boolean).join('\n').toLowerCase();

  const rules: Array<[string, RegExp]> = [
    ['温柔', /温柔|体贴|柔和|温暖/],
    ['傲娇', /傲娇|嘴硬|口是心非/],
    ['高冷', /高冷|冷淡|疏离|寡言/],
    ['活泼', /活泼|开朗|元气|调皮/],
    ['害羞', /害羞|羞涩|容易脸红/],
    ['腹黑', /腹黑|心机|狡黠/],
    ['粘人', /粘人|黏人|依赖|喜欢陪伴/],
    ['治愈', /治愈|安慰|疗愈/],
    ['神秘', /神秘|谜团|秘密/],
    ['猫系', /猫娘|猫耳|猫系|尾巴.*猫/],
    ['犬系', /犬娘|狗耳|犬系|尾巴.*狗/],
    ['兽耳', /兽耳|兽娘|耳朵.*尾巴/],
    ['幻想', /魔法|精灵|龙族|幻想|异世界/],
    ['校园', /校园|学生|学校|教室|同学/],
    ['赛博', /赛博|cyber|机械|ai|人工智能/],
    ['文学', /诗|文学|书籍|小说|作家/],
    ['恋爱', /恋爱|喜欢你|爱你|情侣|心动/],
  ];

  const tags = rules.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  return [...new Set(tags)].slice(0, 8);
}

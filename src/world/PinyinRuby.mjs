// A deliberately small, reviewed dictionary for the early-primary Chinese screens.
// It keeps pinyin in the shipped source instead of sending children's text to a
// translation service. Polyphonic words used here are handled before characters.
const CHARACTER_PINYIN=Object.fromEntries(`
一 yī 三 sān 上 shàng 下 xià 不 bù 与 yǔ 个 gè 中 zhōng 么 me 义 yì 乐 lè 书 shū 了 le 于 yú 云 yún 些 xiē 交 jiāo 亮 liàng 人 rén 亻 rén 什 shén 代 dài 低 dī 作 zuò 你 nǐ 偏 piān 做 zuò 关 guān 兴 xìng 冷 lěng 出 chū 到 dào 前 qián 动 dòng 匹 pǐ 去 qù 反 fǎn 受 shòu 口 kǒu 句 jù 只 zhǐ 可 kě 合 hé 同 tóng 后 hòu 向 xiàng 和 hé 哪 nǎ 回 huí 土 tǔ 在 zài 声 shēng 天 tiān 子 zǐ 字 zì 学 xué 安 ān 完 wán 寒 hán 小 xiǎo 山 shān 左 zuǒ 常 cháng 度 dù 开 kāi 张 zhāng 心 xīn 忄 xīn 快 kuài 情 qíng 愉 yú 意 yì 感 gǎn 慢 màn 我 wǒ 或 huò 手 shǒu 扌 shǒu 择 zé 拼 pīn 持 chí 据 jù 提 tí 支 zhī 整 zhěng 方 fāng 旁 páng 日 rì 明 míng 是 shì 暖 nuǎn 月 yuè 有 yǒu 木 mù 本 běn 条 tiáo 来 lái 树 shù 校 xiào 根 gēn 桌 zhuō 棵 kē 正 zhèng 母 mǔ 水 shuǐ 氵 shuǐ 河 hé 注 zhù 泳 yǒng 海 hǎi 温 wēn 游 yóu 湖 hú 火 huǒ 点 diǎn 热 rè 爱 ài 牛 niú 猫 māo 生 shēng 用 yòng 田 tián 白 bái 的 de 目 mù 相 xiāng 看 kàn 睡 shuì 确 què 示 shì 移 yí 空 kōng 米 mǐ 缓 huǎn 羊 yáng 翔 xiáng 耳 ěr 艘 sōu 花 huā 草 cǎo 表 biǎo 见 jiàn 觉 jué 言 yán 讠 yán 证 zhèng 词 cí 语 yǔ 请 qǐng 读 dú 谁 shuí 调 diào 足 zú 车 chē 轻 qīng 辆 liàng 边 biān 达 dá 近 jìn 远 yuǎn 适 shì 选 xuǎn 通 tōng 都 dōu 里 lǐ 量 liàng 门 mén 问 wèn 雨 yǔ 静 jìng 面 miàn 音 yīn 韵 yùn 题 tí 风 fēng 飞 fēi 马 mǎ 高 gāo 鱼 yú 鸟 niǎo 齐 qí
二 èr 四 sì 五 wǔ 六 liù 七 qī 八 bā 九 jiǔ 十 shí 年 nián 级 jí 拼 pīn 辅 fǔ 助 zhù 阅 yuè 线 xiàn 索 suǒ 答 dá 案 àn 检 jiǎn 查 chá 再 zài 观 guān 察 chá 分 fēn 数 shù 例 lì 单 dān 位 wèi 挑 tiāo 战 zhàn 通 tōng 过 guò 得 dé 剩 shèng 时 shí 间 jiān 加 jiā 减 jiǎn 法 fǎ 乘 chéng 除 chú 认 rèn 识 shí 位 wèi 文 wén 具 jù 店 diàn 经 jīng 历 lì 每 měi 行 háng 列 liè 重 chóng 复 fù 填 tián 格 gé 管 guǎn 道 dào 接 jiē 电 diàn 路 lù 旋 xuán 转 zhuǎn 密 mì 码 mǎ 位 wèi 置 zhì 符 fú 号 hào 卡 kǎ 片 piàn 形 xíng 颜 yán 色 sè 纹 wén 理 lǐ 旅 lǚ 客 kè 排 pái 紧 jǐn 挨 āi 量 liáng 水 shuǐ 箱 xiāng 装 zhuāng 满 mǎn 倒 dào 入 rù 岛 dǎo 屿 yǔ 连 lián 能 néng 最 zuì 少 shǎo 成 chéng 本 běn 无 wú 浪 làng 费 fèi 英 yīng 说 shuō 意 yì 思 sī 表 biǎo 达 dá 早 zǎo 好 hǎo 谢 xiè 喜 xǐ 欢 huan 红 hóng 蓝 lán 绿 lǜ 黄 huáng 这 zhè 那 nà 名 míng 叫 jiào 岁 suì 家 jiā 学 xué 饭 fàn 苹 píng 果 guǒ 狗 gǒu 帽 mào 鞋 xié 球 qiú 包 bāo 老 lǎo 师 shī 朋 péng 友 yǒu 妈 mā 爸 bà 哥 gē 姐 jiě 弟 dì 妹 mèi 吃 chī 喝 hē 走 zǒu 跑 pǎo 坐 zuò 起 qǐ 床 chuáng 晚 wǎn 午 wǔ 今 jīn 昨 zuó 周 zhōu 星 xīng 期 qī 点 diǎn 半 bàn 里 lǐ 外 wài 左 zuǒ 右 yòu 大 dà 多 duō 少 shǎo 新 xīn 旧 jiù 先 xiān 找 zhǎo 键 jiàn 话 huà 娅 yà 立 lì 打 dǎ 吗 ma 很 hěn 判 pàn 断 duàn 对 duì 候 hòu 还 hái 求 qiú 宫 gōng 让 ràng 所 suǒ 种 zhǒng 特 tè 征 zhēng 要 yào 全 quán 等 děng 式 shì 图 tú 邻 lín 互 hù 标 biāo 环 huán 主 zhǔ 放 fàng 地 dì 短 duǎn 依 yī
`.trim().split(/\s+/).reduce((out,item,index,list)=>{if(index%2===0)out.push([item,list[index+1]]);return out;},[]));

const PHRASE_PINYIN={
 '什么':'shén me','快乐':'kuài lè','高兴':'gāo xìng','音乐':'yīn yuè','重新':'chóng xīn','重量':'zhòng liàng','量词':'liàng cí','测量':'cè liáng','长大':'zhǎng dà','长高':'zhǎng gāo','长方形':'cháng fāng xíng','一行':'yì háng','银行':'yín háng','一个':'yí gè','一样':'yí yàng','不一样':'bù yí yàng','还差':'hái chà','觉得':'jué de','地面':'dì miàn','轻声':'qīng shēng','喜欢':'xǐ huan','挨着':'āi zhe','游得':'yóu de'
};
const PHRASES=Object.keys(PHRASE_PINYIN).sort((a,b)=>b.length-a.length);
const HAN=/[\u3400-\u9fff]/;
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function isEarlyPrimaryChinese(profile,year){
 return typeof profile==='string'&&profile.startsWith('CN')&&/^Y[12]$/.test(String(year));
}

export function pinyinCoverage(value){
 const missing=[];let index=0,text=String(value);
 while(index<text.length){const phrase=PHRASES.find(item=>text.startsWith(item,index));if(phrase){index+=phrase.length;continue;}const char=text[index++];if(HAN.test(char)&&!CHARACTER_PINYIN[char])missing.push(char);}
 return {complete:missing.length===0,missing:[...new Set(missing)]};
}

export function rubyPinyin(value,enabled=true){
 if(!enabled)return escape(value);let index=0,text=String(value),html='';
 while(index<text.length){
  const phrase=PHRASES.find(item=>text.startsWith(item,index));
  if(phrase){html+=`<ruby>${escape(phrase)}<rt>${PHRASE_PINYIN[phrase]}</rt></ruby>`;index+=phrase.length;continue;}
  const char=text[index++],pinyin=CHARACTER_PINYIN[char];html+=pinyin?`<ruby>${escape(char)}<rt>${pinyin}</rt></ruby>`:escape(char);
 }
 return html;
}

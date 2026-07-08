// Composes layered 疊宮 readings for flying 四化 arrows.
//
// Reading methodology (see the 疊宮判讀 discussion): one physical palace wears three
// name tags — 本命 (體, the permanent domain), 大限 (運, the decade's context), 流年
// (應期, this year's trigger). A flight is therefore one event described at three
// depths: same-layer first (the event), the decadal name as the channel, and the
// natal landing as the lasting consequence. These sentences are template-composed
// (rule output, chart-agnostic), not hand-written interpretation.

const KEY_NOUN = {
  '祿': '資源與機遇',
  '權': '主導與變動',
  '科': '聲名與貴助',
  '忌': '課題與耗損',
};

const KEY_ADVICE = {
  '祿': '此線可主動經營',
  '權': '宜掌握節奏、防強求',
  '科': '利名聲文書、貴人斡旋',
  '忌': '本年課題所在，宜守不宜攻',
};

// Concrete domain phrases per palace name, used by the 最終解盤 fluent composer.
// Slots: actor (as the acting source), field (as the affected area), channel (as the
// decade-context pathway), pool (as the natal palace the effect settles into).
const PALACE_ASPECT = {
  '命宮': { actor: '你自身的決心與行動', field: '自我狀態與整體運勢', channel: '由你親自出面主導', pool: '你的主體格局' },
  '兄弟': { actor: '兄弟同儕與平輩夥伴', field: '同儕人脈與現金流', channel: '經同儕引介或資金調度', pool: '你的人脈財庫（現金存量）' },
  '夫妻': { actor: '配偶或親密伴侶', field: '感情與婚姻', channel: '透過伴侶的支持或姻親關係', pool: '你的感情婚姻基礎' },
  '子女': { actor: '子女、下屬或合夥人', field: '合作、新創與桃花之事', channel: '經由下屬合夥或新專案推進', pool: '你的合作與傳承之位' },
  '財帛': { actor: '金錢與收入本身', field: '財利與現金收入', channel: '藉由金錢往來運轉', pool: '你的進財管道' },
  '疾厄': { actor: '身體與勞務', field: '健康與工作負荷', channel: '以身體勞力親力親為', pool: '你的健康根基' },
  '遷移': { actor: '外緣與外地機會', field: '外地發展與對外形象', channel: '經外出遠行或外地人脈', pool: '你的對外舞台' },
  '僕役': { actor: '朋友與客戶群', field: '交友圈與客戶關係', channel: '透過朋友客戶的牽線', pool: '你的群眾人脈' },
  '官祿': { actor: '事業與職務', field: '事業成就與職位', channel: '藉由職務或公司平台', pool: '你的事業根基' },
  '田宅': { actor: '家宅與不動產', field: '家庭資產與居所', channel: '經由家庭或置產安排', pool: '你的家底資產庫' },
  '福德': { actor: '心境嗜好與福分', field: '精神生活與享受', channel: '順其心性自然促成', pool: '你的福澤與心靈存糧' },
  '父母': { actor: '父母長輩與上司', field: '長輩關係與文書契約', channel: '透過合約簽署或長輩主管的背書', pool: '你的靠山與信用' },
};

// Per-key sentence frames for the fluent synthesis. {A}=source actor, {F}=target field,
// {C}=decadal channel, {P}=natal pool; citations appended by the composer.
const KEY_FRAME = {
  '祿': ['今年，{A}會為你在{F}上帶來利益', '過程多{C}而順利推進', '最終成果沉澱於{P}'],
  '權': ['今年，{A}讓你在{F}上取得主導與擴張', '過程需{C}來落實', '其影響力鞏固於{P}'],
  '科': ['今年，{A}為你在{F}上帶來名聲與貴人之助', '多半{C}而水到渠成', '聲譽與信任積累於{P}'],
  '忌': ['今年，{A}使你在{F}上面臨課題與耗損', '癥結常出在{C}這一環', '其影響最終沉積於{P}，宜提前布局、守多於攻'],
};

/** The three layer names a physical palace wears (null for missing layers). */
export function palaceNamesAt(chart, branchIndex) {
  const [natal, decadal, yearly] = chart.layers;
  const nameIn = (layer) =>
    layer && layer.cells[branchIndex] ? layer.cells[branchIndex].palaceName : null;
  return {
    natal: nameIn(natal),
    decadal: nameIn(decadal),
    yearly: nameIn(yearly),
  };
}

/**
 * Composes the layered reading for one flight.
 * @param {Object} chart - buildChartData() result.
 * @param {Object} flight - { fromIndex, key: '祿'|'權'|'科'|'忌', star, toIndex|null }.
 * @returns {{key, title, text}|null} null when the flight has no target.
 */
export function composeFlightReading(chart, { fromIndex, key, star, toIndex }) {
  if (toIndex === null || toIndex === undefined) return null;
  const src = palaceNamesAt(chart, fromIndex);
  const tgt = palaceNamesAt(chart, toIndex);

  if (toIndex === fromIndex) {
    // Self-flight: the palace transforms back into itself (自化-style concentration).
    const frames = [src.natal ? `本命${src.natal}` : null, src.decadal ? `限${src.decadal}` : null]
      .filter(Boolean).join('／');
    return {
      key,
      title: `年${src.yearly}化${key}（${star}）入本宮`,
      text: `${star}化${key}回入本宮（${frames}）：${KEY_NOUN[key]}自生自受，效應集中於此一宮位。`,
    };
  }

  const channel = tgt.decadal ? `行經大限${tgt.decadal}之境，` : '';
  return {
    key,
    title: `年${src.yearly}化${key}（${star}）→ 年${tgt.yearly}`,
    text: `本年${src.yearly}之${KEY_NOUN[key]}入年${tgt.yearly}，${channel}落於本命${tgt.natal}。${KEY_ADVICE[key]}。`,
  };
}

/**
 * Composes the 🎯 最終解盤 fluent paragraph for one flight — the same three-depth
 * reading rendered as natural prose with concrete domain phrases and citations, e.g.
 * 「今年，子女、下屬或合夥人會為你在財利與現金收入上帶來利益（年子女化祿入年財帛），
 *   過程多透過合約簽署或長輩主管的背書而順利推進（大限父母），最終成果沉澱於
 *   你的人脈財庫（本命兄弟）。」
 * @returns {string|null} null when the flight has no target or no frame applies.
 */
export function composeFinalParagraph(chart, { fromIndex, key, star, toIndex }) {
  if (toIndex === null || toIndex === undefined) return null;
  const src = palaceNamesAt(chart, fromIndex);
  const tgt = palaceNamesAt(chart, toIndex);
  const frame = KEY_FRAME[key];
  const srcA = PALACE_ASPECT[src.yearly];
  const tgtA = PALACE_ASPECT[tgt.yearly];
  if (!frame || !srcA || !tgtA) return null;

  if (toIndex === fromIndex) {
    return `今年，${srcA.actor}的能量自聚本宮（年${src.yearly}化${key}入本宮），` +
      `${KEY_NOUN[key]}不假外求，成敗皆繫於${srcA.field}自身（本命${src.natal}）。`;
  }

  const parts = [
    frame[0].replace('{A}', srcA.actor).replace('{F}', tgtA.field) +
      `（年${src.yearly}化${key}入年${tgt.yearly}）`,
  ];
  const chanA = tgt.decadal ? PALACE_ASPECT[tgt.decadal] : null;
  if (chanA) {
    parts.push(frame[1].replace('{C}', chanA.channel) + `（大限${tgt.decadal}）`);
  }
  const poolA = PALACE_ASPECT[tgt.natal];
  if (poolA) {
    parts.push(frame[2].replace('{P}', poolA.pool) + `（本命${tgt.natal}）`);
  }
  return parts.join('，') + '。';
}

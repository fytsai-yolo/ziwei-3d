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

// 古籍輯錄 — classical one-liners attached to detected 格局, quoted from the common
// circulating editions of 紫微斗數全書 (骨髓賦/太微賦). Hand-curated: only lines famous
// enough to be quoted with confidence are included; each entry cites its source in
// `ref` and pairs the quote with a modern gloss. Anything less certain stays out —
// the KB's provenance labels are only worth what this restraint buys them.
export const CLASSICS = [
  {
    id: 'gu-ji-yue-tong-liang',
    match: { patternId: 'ji-yue-tong-liang' },
    text: '「機月同梁作吏人」。古謂此格宜任事於官府文職，今解為適合公教、行政與大機構幕僚，以穩健規劃見長。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-yang-liang-chang-lu',
    match: { patternId: 'yang-liang-chang-lu' },
    text: '「陽梁昌祿，臚傳第一名」。古指科舉高中之象，今解為考試、學術、資格認證與公職晉身之利。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-ri-zhao-lei-men',
    match: { patternId: 'ri-zhao-lei-men' },
    text: '「日照雷門，富貴榮華」。太陽卯宮乘旺而升，古許其貴顯；今解為聲望與舞台隨歷練而升，屬愈晚愈顯之格。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-ri-yue-bing-ming',
    match: { patternId: 'ri-yue-bing-ming' },
    text: '「日月並明，佐九重於堯殿」。古謂日月皆旺可輔君王，今解為表裡俱佳、可居要職輔佐核心之格局。',
    source: '古籍',
    ref: '太微賦',
    weight: 3
  },
  {
    id: 'gu-shi-zhong-yin-yu',
    match: { patternId: 'shi-zhong-yin-yu' },
    text: '「子午巨門，石中隱玉」。玉藏石中，須琢而後現：其才不在初見，經磨練與時間方顯大器，中晚年愈發。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-ma-tou-dai-jian',
    match: { patternId: 'ma-tou-dai-jian' },
    text: '「馬頭帶箭，威鎮邊疆」。古指武將戍邊之榮，今解為離鄉開創、於競爭前線建功之格，安逸反失其鋒。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-lu-ma-jiao-chi',
    match: { patternId: 'lu-ma-jiao-chi' },
    text: '「祿馬最喜交馳」。祿逢天馬，動中生財：古許發於遠郡，今解為外地、外務、流動性事業最能生利。',
    source: '古籍',
    ref: '太微賦',
    weight: 3
  },
  {
    id: 'gu-fu-xiang-chao-yuan',
    match: { patternId: 'fu-xiang-chao-yuan' },
    text: '「府相同來會命宮，全家食祿」。二星拱命，古謂衣祿豐足庇及家人；今解為職涯有靠、生計穩固之格。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-jun-chen-qing-hui',
    match: { patternId: 'jun-chen-qing-hui' },
    text: '「輔弼同宮，一呼百諾居上品」。紫微得輔弼，古許統眾之貴；會照亦吉，今解為天生統御調度之才。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-ling-tan',
    match: { patternId: 'ling-tan' },
    text: '「貪鈴並守，將相之名」。鈴貪相激而暴發，古許將相之貴；今解為爆發力極強，宜乘勢而起、忌得志而驕。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-yang-tuo-jia-ji',
    match: { patternId: 'yang-tuo-jia-ji' },
    text: '「羊陀夾忌為敗局」。生年忌受羊陀夾制，古以為敗；今解為該宮之事多受牽制內耗，宜守勢化解、不宜強行。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
  {
    id: 'gu-ming-lu-an-lu',
    match: { patternId: 'ming-lu-an-lu' },
    text: '「明祿暗祿，錦上添花」。明處之祿又得暗合之祿相濟，古許富貴加等；今解為檯面資源之外多隱性奧援。',
    source: '古籍',
    ref: '骨髓賦',
    weight: 3
  },
];

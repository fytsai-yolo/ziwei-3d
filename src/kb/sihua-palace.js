// 生年四化入十二宮 — palace-level readings of where the birth-year transformation
// lands (independent of which star carries it). Complements sihua.js (star-level).
// Hand-authored 2026-07-09 (Gemini unavailable); reviewed against standard modern usage.
export const SIHUA_PALACE = [
  // ===== 化祿：資源、機遇、緣分所在 =====
  {
    id: 'birth-lu-minggong',
    match: { mutagen: '祿', palaceName: '命宮' },
    text: '生年祿入命宮，天生帶財緣與人緣，一生機遇自來，樂觀而有福蔭。唯福從己出，須防安逸自足而少了衝勁。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-xiongdi',
    match: { mutagen: '祿', palaceName: '兄弟' },
    text: '生年祿入兄弟宮，與同儕手足緣厚，合作有利，現金流動順暢。兄弟朋友是資源所在，宜厚待平輩之誼。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-fuqi',
    match: { mutagen: '祿', palaceName: '夫妻' },
    text: '生年祿入夫妻宮，感情緣分深厚，配偶多助力，婚後運勢漸開。異性緣佳，惟緣厚亦須經營，勿視為理所當然。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-zinv',
    match: { mutagen: '祿', palaceName: '子女' },
    text: '生年祿入子女宮，子女緣佳、晚輩得力，合夥新創之事多有善果。生活富情趣，人生後段愈見豐盈。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-caibo',
    match: { mutagen: '祿', palaceName: '財帛' },
    text: '生年祿入財帛宮，正財緣厚，取財有道，一生用度不虞匱乏。財來自能力與緣分，宜取之有節、營之有方。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-jie',
    match: { mutagen: '祿', palaceName: '疾厄' },
    text: '生年祿入疾厄宮，體質有福，心寬體泰，逢病多有轉機。唯祿主口福享受，須防飲食安逸積累之疾。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-qianyi',
    match: { mutagen: '祿', palaceName: '遷移' },
    text: '生年祿入遷移宮，出外得利，貴人多在遠方，離鄉發展機遇更豐。動則生財，宜多外出走動、開拓外緣。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-puyi',
    match: { mutagen: '祿', palaceName: '僕役' },
    text: '生年祿入僕役宮，交遊廣闊且多得友助，客戶群眾是財源所在。人脈即錢脈，惟施受宜平衡，防為友破費。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-guanlu',
    match: { mutagen: '祿', palaceName: '官祿' },
    text: '生年祿入官祿宮，事業運強，職場機遇源源不絕，適合以事業成就人生。工作即福田，愈投入愈見回報。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-tianzhai',
    match: { mutagen: '祿', palaceName: '田宅' },
    text: '生年祿入田宅宮，家業有成，不動產緣佳，家庭氣氛豐足和樂。守成聚財之格，置產是最合宜的聚富方式。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-fude',
    match: { mutagen: '祿', palaceName: '福德' },
    text: '生年祿入福德宮，天生福澤深厚，懂得生活享受，心境常保寬裕。福至心靈財自來，惟防流於逸樂而志短。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-lu-fumu',
    match: { mutagen: '祿', palaceName: '父母' },
    text: '生年祿入父母宮，長輩緣厚，多得父母師長庇蔭，與官方文書之事有利。敬上得福，靠山穩固。',
    source: '現代通行',
    weight: 3
  },

  // ===== 化權：主導、擴張、勞而有成 =====
  {
    id: 'birth-quan-minggong',
    match: { mutagen: '權', palaceName: '命宮' },
    text: '生年權入命宮，個性強勢有主見，天生領導慾與掌控力，能開創局面。唯權在己身，須防固執專斷、與人爭鋒。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-xiongdi',
    match: { mutagen: '權', palaceName: '兄弟' },
    text: '生年權入兄弟宮，兄弟朋友中多強人，平輩具實力亦多主導你。合作能成大事，惟主導權之爭宜先講明。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-fuqi',
    match: { mutagen: '權', palaceName: '夫妻' },
    text: '生年權入夫妻宮，配偶能幹強勢，婚姻中對方多居主導。得能者為伴是助力，惟家內須學會協商而非爭勝。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-zinv',
    match: { mutagen: '權', palaceName: '子女' },
    text: '生年權入子女宮，子女晚輩優秀有主見，管教宜疏不宜堵。合夥事業對方居強勢，出外驛動力強。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-caibo',
    match: { mutagen: '權', palaceName: '財帛' },
    text: '生年權入財帛宮，掌財有能，敢賺敢用，善於以錢滾錢做大格局。財務主導權在握，惟防擴張過速、以財逞強。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-jie',
    match: { mutagen: '權', palaceName: '疾厄' },
    text: '生年權入疾厄宮，體力旺盛耐操耐勞，但易勞碌過度、硬撐成疾。身體是本錢亦是戰場，宜定期保養勿逞強。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-qianyi',
    match: { mutagen: '權', palaceName: '遷移' },
    text: '生年權入遷移宮，出外能掌局面，在外地與外場合愈見能耐，宜向外開疆闢土。外緣強勢，出門自帶氣場。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-puyi',
    match: { mutagen: '權', palaceName: '僕役' },
    text: '生年權入僕役宮，交友圈多有力人士，群眾中易居要位，亦易受強勢朋友左右。善用人脈之力，勿為其所制。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-guanlu',
    match: { mutagen: '權', palaceName: '官祿' },
    text: '生年權入官祿宮，事業心重，職場企圖與執行力俱強，宜掌實權居要職。以事業立身之格，成就自不待言。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-tianzhai',
    match: { mutagen: '權', palaceName: '田宅' },
    text: '生年權入田宅宮，旺家業，置產魄力大，家中多由己作主。不動產可成事業版圖，惟防為家宅之事強勢生波。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-fude',
    match: { mutagen: '權', palaceName: '福德' },
    text: '生年權入福德宮，精神力強、志氣高，閒不下來，享受也要有掌控感。心志堅韌是福，惟防慾望驅使身心俱疲。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-quan-fumu',
    match: { mutagen: '權', palaceName: '父母' },
    text: '生年權入父母宮，父母師長威嚴強勢，管教多要求；與公家機關文書之事具分量。敬而不畏，方得長輩之力。',
    source: '現代通行',
    weight: 3
  },

  // ===== 化科：名聲、貴人、平順 =====
  {
    id: 'birth-ke-minggong',
    match: { mutagen: '科', palaceName: '命宮' },
    text: '生年科入命宮，氣質斯文，名聲在外，一生多貴人適時相扶。遇難呈祥之格，惟好名亦須防愛面子誤事。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-xiongdi',
    match: { mutagen: '科', palaceName: '兄弟' },
    text: '生年科入兄弟宮，兄弟朋友多文雅之士，平輩即貴人，急時多有周轉之助。同儕情誼細水長流。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-fuqi',
    match: { mutagen: '科', palaceName: '夫妻' },
    text: '生年科入夫妻宮，配偶溫文有涵養，感情細膩平順，婚姻是名聲與助力之所在。相敬如賓，情長而穩。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-zinv',
    match: { mutagen: '科', palaceName: '子女' },
    text: '生年科入子女宮，子女晚輩秀氣聰穎、知書達禮，教養順遂。合夥重信譽，桃花屬清雅型。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-caibo',
    match: { mutagen: '科', palaceName: '財帛' },
    text: '生年科入財帛宮，財源平穩，量入為出，錢財多與名聲專業相連。細水長流之財，急難時常有貴人濟助。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-jie',
    match: { mutagen: '科', palaceName: '疾厄' },
    text: '生年科入疾厄宮，逢病得良醫，健康之事多有貴人指引，病情多能化險為夷。身心平和，養生重於治病。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-qianyi',
    match: { mutagen: '科', palaceName: '遷移' },
    text: '生年科入遷移宮，出外有名聲、得體面，外地多遇貴人，旅途平安順遂。名聲行於外，形象是最好的名片。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-puyi',
    match: { mutagen: '科', palaceName: '僕役' },
    text: '生年科入僕役宮，交友重質不重量，朋友多屬清流雅士，群眾間口碑良好。君子之交，急時見真情。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-guanlu',
    match: { mutagen: '科', palaceName: '官祿' },
    text: '生年科入官祿宮，事業以名聲專業取勝，職場形象佳，考試升遷多順遂。適合學術、文職與講究信譽之業。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-tianzhai',
    match: { mutagen: '科', palaceName: '田宅' },
    text: '生年科入田宅宮，家風清雅，居家環境重質感，家宅平安少紛擾。置產穩健保值，門第有聲望。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-fude',
    match: { mutagen: '科', palaceName: '福德' },
    text: '生年科入福德宮，心性平和，重精神生活與品味，福分清雅綿長。知足常樂之格，修養即是最大的福田。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ke-fumu',
    match: { mutagen: '科', palaceName: '父母' },
    text: '生年科入父母宮，父母師長明理有涵養，多得長輩提攜；文書考試之事平順有利。家教即底蘊。',
    source: '現代通行',
    weight: 3
  },

  // ===== 化忌：執著、虧欠、課題所在 =====
  {
    id: 'birth-ji-minggong',
    match: { mutagen: '忌', palaceName: '命宮' },
    text: '生年忌入命宮，一生課題繫於自身，個性執著、易鑽牛角尖，凡事親力親為而多勞。忌是欠，欠自己一份釋懷。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-xiongdi',
    match: { mutagen: '忌', palaceName: '兄弟' },
    text: '生年忌入兄弟宮，與手足同儕緣分深卻多糾葛，易為平輩付出操心，現金流亦須謹慎。之間帳目宜清。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-fuqi',
    match: { mutagen: '忌', palaceName: '夫妻' },
    text: '生年忌入夫妻宮，感情執著深刻，婚姻是一生的功課，聚少離多或多磨合。用情深不是錯，學會給彼此空間。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-zinv',
    match: { mutagen: '忌', palaceName: '子女' },
    text: '生年忌入子女宮，為子女晚輩操心多，合夥之事多牽絆，付出常在這一線。緣深責重，教養宜寬嚴有度。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-caibo',
    match: { mutagen: '忌', palaceName: '財帛' },
    text: '生年忌入財帛宮，一生與錢財糾纏，賺錢辛勞、在意得失，財務是主要課題。宜正財穩取，最忌投機與借貸糾葛。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-jie',
    match: { mutagen: '忌', palaceName: '疾厄' },
    text: '生年忌入疾厄宮，健康是一生功課，體質有其罩門，易積勞成疾。病符所在即警鐘，養生保健須及早而持恆。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-qianyi',
    match: { mutagen: '忌', palaceName: '遷移' },
    text: '生年忌入遷移宮，出外多勞碌波折，外緣多考驗，人生課題常在他鄉與外務。出門宜謹慎規劃，忌意氣遠行。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-puyi',
    match: { mutagen: '忌', palaceName: '僕役' },
    text: '生年忌入僕役宮，為朋友客戶多付出而少回報，交友是課題所在，易遇損友拖累。擇友宜嚴，財勿輕借。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-guanlu',
    match: { mutagen: '忌', palaceName: '官祿' },
    text: '生年忌入官祿宮，對事業執著投入，工作勞心勞力，職場即道場。敬業是福也是絆，宜防過勞與職務糾紛。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-tianzhai',
    match: { mutagen: '忌', palaceName: '田宅' },
    text: '生年忌入田宅宮，為家宅家人操勞，家運多承擔，不動產之事須格外謹慎。守家是天職，置產務必量力。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-fude',
    match: { mutagen: '忌', palaceName: '福德' },
    text: '生年忌入福德宮，思慮多、心難閒，易自尋煩惱，福分要靠修心而得。課題在心不在境，靜坐運動皆是解方。',
    source: '現代通行',
    weight: 3
  },
  {
    id: 'birth-ji-fumu',
    match: { mutagen: '忌', palaceName: '父母' },
    text: '生年忌入父母宮，與父母長輩緣深責重，多有虧欠感或代溝，文書契約之事宜細審。孝親是課題，溝通是解答。',
    source: '現代通行',
    weight: 3
  },
];

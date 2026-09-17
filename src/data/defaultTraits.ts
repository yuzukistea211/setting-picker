import { Dataset } from '../types';

export const DEFAULT_DATASET: Dataset = {
  version: 1,
  updatedAt: Date.now(),
  axes: [
    { id: 'axis-social', name: '社交需求' },
    { id: 'axis-interaction', name: '人際互動' },
    { id: 'axis-cognition', name: '思考方式' },
    { id: 'axis-emotion', name: '情緒調節' },
    { id: 'axis-values', name: '價值觀' },
    { id: 'axis-self', name: '自我認知' },
    { id: 'axis-defense', name: '防衛機制' },
    { id: 'axis-stress', name: '壓力反應' },
  ],
  traits: [
    // 社交需求
    {
      id: 'trait-social-1',
      name: '情感孤島傾向',
      axis: '社交需求',
      description: '習慣維持心理與物理上的獨處空間，對親密接觸有本能的警惕與距離感。',
      baseWeight: 10,
    },
    {
      id: 'trait-social-2',
      name: '高度依附渴望',
      axis: '社交需求',
      description: '強烈渴望穩固且排他的深刻羈絆，對被忽視或冷落有高敏感度。',
      baseWeight: 10,
    },
    {
      id: 'trait-social-3',
      name: '選擇性深度聯結',
      axis: '社交需求',
      description: '拒絕泛泛之交的無效社交，只願意將精力投入極少數精神高度共鳴的對象。',
      baseWeight: 10,
    },
    {
      id: 'trait-social-4',
      name: '社交過載防衛',
      axis: '社交需求',
      description: '社交耐受度較低，在群體環境中精力消耗迅速，需要長時間閉門充電。',
      baseWeight: 10,
    },

    // 人際互動
    {
      id: 'trait-interaction-1',
      name: '儀式化疏離',
      axis: '人際互動',
      description: '待人彬彬有禮、舉止得體，但始終築起不可逾越的客套屏障，不許任何人涉足真實內心。',
      baseWeight: 10,
    },
    {
      id: 'trait-interaction-2',
      name: '攻擊性討好',
      axis: '人際互動',
      description: '透過主動照顧、過度給予來確立不可或缺的支配地位，夾帶隱微的道德索償。',
      baseWeight: 10,
    },
    {
      id: 'trait-interaction-3',
      name: '邊界防禦過敏',
      axis: '人際互動',
      description: '對他人的越界探問或介入極度敏感，會立即發出冷淡或帶刺的拒絕信號。',
      baseWeight: 10,
    },
    {
      id: 'trait-interaction-4',
      name: '溫和鈍感',
      axis: '人際互動',
      description: '面對他人的攻擊、冷嘲或微妙情緒不易受到刺痛，呈現隨和而難以被激怒的恆定狀態。',
      baseWeight: 10,
    },

    // 思考方式
    {
      id: 'trait-cognition-1',
      name: '結構化偏執',
      axis: '思考方式',
      description: '思考極度追求邏輯閉環、條理與因果鏈條，對模糊、混亂與未知事物具備低容忍度。',
      baseWeight: 10,
    },
    {
      id: 'trait-cognition-2',
      name: '懷疑論批判',
      axis: '思考方式',
      description: '下意識質疑既有權威、表面現象與理所當然的說法，慣於尋找邏輯漏洞與底層動機。',
      baseWeight: 10,
    },
    {
      id: 'trait-cognition-3',
      name: '直覺先驗導向',
      axis: '思考方式',
      description: '習慣仰賴快速的直覺感應與情緒共鳴做出判斷，事後才補全理性解釋。',
      baseWeight: 10,
    },
    {
      id: 'trait-cognition-4',
      name: '聯想發散跳躍',
      axis: '思考方式',
      description: '思維路徑跳躍且具跨維度聯想能力，容易從微小事物推演至宏大宏觀概念。',
      baseWeight: 10,
    },

    // 情緒調節
    {
      id: 'trait-emotion-1',
      name: '情感隔離壓抑',
      axis: '情緒調節',
      description: '遭遇強烈情緒衝擊時本能切斷感受開關，用冷酷客觀的事實處理代替情緒宣洩。',
      baseWeight: 10,
    },
    {
      id: 'trait-emotion-2',
      name: '易感型共情過載',
      axis: '情緒調節',
      description: '鏡像神經元極度敏感，能瞬間浸泡在他人的喜怒哀樂中，自我與外界情緒邊界模糊。',
      baseWeight: 10,
    },
    {
      id: 'trait-emotion-3',
      name: '延遲爆發體質',
      axis: '情緒調節',
      description: '衝突當下維持平靜或忍耐，負面情緒在體內沉澱發酵，於數週或數月後因微小導火線徹底爆發。',
      baseWeight: 10,
    },
    {
      id: 'trait-emotion-4',
      name: '黑色幽默自嘲',
      axis: '情緒調節',
      description: '用辛辣、荒誕、犬儒的笑話來解構自身的苦難與困境，藉由滑稽化來緩解內心創痛。',
      baseWeight: 10,
    },

    // 價值觀
    {
      id: 'trait-values-1',
      name: '絕對實用主義',
      axis: '價值觀',
      description: '以效能、成本與實質產出為唯一衡量標準，拒絕為無實用價值的感性情懷買單。',
      baseWeight: 10,
    },
    {
      id: 'trait-values-2',
      name: '潔癖式道德律',
      axis: '價值觀',
      description: '擁有極高標準的道德純潔要求，對背叛、說謊、妥協有近乎宗教式的嚴格苛求。',
      baseWeight: 10,
    },
    {
      id: 'trait-values-3',
      name: '自主至上信條',
      axis: '價值觀',
      description: '視個體自由與獨立自主為不可讓渡的底線，極端厭惡被他人主宰或被迫隨波逐流。',
      baseWeight: 10,
    },
    {
      id: 'trait-values-4',
      name: '契約重於情理',
      axis: '價值觀',
      description: '恪守約定與規章秩序，認為明確的規則才是維繫社會運轉的最優解，排斥因人設事。',
      baseWeight: 10,
    },

    // 自我認知
    {
      id: 'trait-self-1',
      name: '冒牌者症候群',
      axis: '自我認知',
      description: '無論取得多大成就，內心總深信自己只是靠運氣或欺騙，時刻提防自己被識破真面目。',
      baseWeight: 10,
    },
    {
      id: 'trait-self-2',
      name: '全能自戀補償',
      axis: '自我認知',
      description: '為掩飾深層脆弱而建構出強大自信的假象，無法承受任何形式的公開挫折或批評。',
      baseWeight: 10,
    },
    {
      id: 'trait-self-3',
      name: '工具化自我異化',
      axis: '自我認知',
      description: '將自己視為達成目的的精準機器，漠視身體與心理發出的疲憊哀鳴，只追求功能完整。',
      baseWeight: 10,
    },
    {
      id: 'trait-self-4',
      name: '堅定核心自尊',
      axis: '自我認知',
      description: '對自我價值有穩定而堅韌的認同，外界評價難以動搖其內在基石。',
      baseWeight: 10,
    },

    // 防衛機制
    {
      id: 'trait-defense-1',
      name: '理智化昇華',
      axis: '防衛機制',
      description: '面對痛苦時轉化為學術討論或抽象哲學探索，用繁瑣理論架構將真實感受高閣束之。',
      baseWeight: 10,
    },
    {
      id: 'trait-defense-2',
      name: '投射性認同',
      axis: '防衛機制',
      description: '下意識引導對方的言行來印證自己內心的負面預設（例如挑釁對方發怒以證實對方討厭自己）。',
      baseWeight: 10,
    },
    {
      id: 'trait-defense-3',
      name: '退行依賴',
      axis: '防衛機制',
      description: '遭遇重大挫折時退回孩童般的任性或無助狀態，被動期待他人出面收拾殘局。',
      baseWeight: 10,
    },
    {
      id: 'trait-defense-4',
      name: '否認反向形成',
      axis: '防衛機制',
      description: '在意識層面表現出與潛意識欲望完全相反的過激態度（如內心恐懼卻展現出過度狂妄）。',
      baseWeight: 10,
    },

    // 壓力反應
    {
      id: 'trait-stress-1',
      name: '戰鬥性亢奮',
      axis: '壓力反應',
      description: '逆境與高壓能瞬間激發其腎上腺素，進入高專注、強攻擊性的應戰狀態。',
      baseWeight: 10,
    },
    {
      id: 'trait-stress-2',
      name: '凍結假死',
      axis: '壓力反應',
      description: '過載威脅下大腦與行動陷入麻痺呆滯，出現暫時性的記憶空白與決策癱瘓。',
      baseWeight: 10,
    },
    {
      id: 'trait-stress-3',
      name: '強迫性重複勞作',
      axis: '壓力反應',
      description: '焦慮時藉由反覆打掃、整理文件、瘋狂健身等機械式動作來奪回對失控環境的掌控感。',
      baseWeight: 10,
    },
    {
      id: 'trait-stress-4',
      name: '逃避解離',
      axis: '壓力反應',
      description: '在極限痛苦或威脅中意識抽離軀體，如第三人旁觀者般觀看自己的遭遇，感受不到真實肉體痛感。',
      baseWeight: 10,
    },
  ],

  cooccurrenceRules: [
    // Positive co-occurrences
    {
      id: 'co-1',
      traitAId: 'trait-social-1', // 情感孤島傾向
      traitBId: 'trait-interaction-1', // 儀式化疏離
      weight: 6,
      intensityModifiers: {
        '強烈': 2,
        '極端': 4,
        '輕微': -1,
      },
    },
    {
      id: 'co-2',
      traitAId: 'trait-cognition-1', // 結構化偏執
      traitBId: 'trait-values-4', // 契約重於情理
      weight: 5,
      intensityModifiers: {
        '強烈': 2,
        '極端': 3,
      },
    },
    {
      id: 'co-3',
      traitAId: 'trait-cognition-1', // 結構化偏執
      traitBId: 'trait-defense-1', // 理智化昇華
      weight: 6,
      intensityModifiers: {
        '極端': 3,
      },
    },
    {
      id: 'co-4',
      traitAId: 'trait-values-1', // 絕對實用主義
      traitBId: 'trait-self-3', // 工具化自我異化
      weight: 7,
      intensityModifiers: {
        '強烈': 3,
        '極端': 4,
      },
    },
    {
      id: 'co-5',
      traitAId: 'trait-social-4', // 社交過載防衛
      traitBId: 'trait-interaction-3', // 邊界防禦過敏
      weight: 5,
    },
    {
      id: 'co-6',
      traitAId: 'trait-cognition-2', // 懷疑論批判
      traitBId: 'trait-interaction-1', // 儀式化疏離
      weight: 4,
    },
    {
      id: 'co-7',
      traitAId: 'trait-emotion-4', // 黑色幽默自嘲
      traitBId: 'trait-self-1', // 冒牌者症候群
      weight: 4,
    },
    {
      id: 'co-8',
      traitAId: 'trait-stress-3', // 強迫性重複勞作
      traitBId: 'trait-cognition-1', // 結構化偏執
      weight: 6,
    },
    {
      id: 'co-9',
      traitAId: 'trait-stress-1', // 戰鬥性亢奮
      traitBId: 'trait-values-3', // 自主至上信條
      weight: 4,
    },

    // Negative co-occurrences (tend to repel)
    {
      id: 'co-neg-1',
      traitAId: 'trait-social-1', // 情感孤島傾向
      traitBId: 'trait-social-2', // 高度依附渴望
      weight: -7,
      intensityModifiers: {
        '強烈': -3,
        '極端': -5,
      },
    },
    {
      id: 'co-neg-2',
      traitAId: 'trait-cognition-1', // 結構化偏執
      traitBId: 'trait-cognition-3', // 直覺先驗導向
      weight: -5,
    },
    {
      id: 'co-neg-3',
      traitAId: 'trait-emotion-1', // 情感隔離壓抑
      traitBId: 'trait-emotion-2', // 易感型共情過載
      weight: -6,
      intensityModifiers: {
        '強烈': -2,
        '極端': -4,
      },
    },
    {
      id: 'co-neg-4',
      traitAId: 'trait-interaction-4', // 溫和鈍感
      traitBId: 'trait-interaction-3', // 邊界防禦過敏
      weight: -6,
    },
    {
      id: 'co-neg-5',
      traitAId: 'trait-self-4', // 堅定核心自尊
      traitBId: 'trait-self-1', // 冒牌者症候群
      weight: -7,
    },
    {
      id: 'co-neg-6',
      traitAId: 'trait-stress-1', // 戰鬥性亢奮
      traitBId: 'trait-stress-2', // 凍結假死
      weight: -7,
    },
  ],

  softExclusions: [
    {
      id: 'soft-1',
      traitAId: 'trait-social-1', // 情感孤島傾向
      traitBId: 'trait-social-2', // 高度依附渴望
      penaltyMultiplier: 0.15,
      note: '矛盾型依附（恐懼-逃避型）：內心極度渴望親密羈絆，但親密感一旦逼近便會觸發劇烈恐慌而逃向孤島。',
    },
    {
      id: 'soft-2',
      traitAId: 'trait-emotion-1', // 情感隔離壓抑
      traitBId: 'trait-emotion-2', // 易感型共情過載
      penaltyMultiplier: 0.2,
      note: '防禦性共情超載：平時極度依賴理智隔離防線，但特定錨點被觸動時共情堤防會瞬間潰堤。',
    },
    {
      id: 'soft-3',
      traitAId: 'trait-interaction-1', // 儀式化疏離
      traitBId: 'trait-interaction-2', // 攻擊性討好
      penaltyMultiplier: 0.25,
      note: '計算型交際面具：以熱切討好姿態掌控大局與人際走向，骨子裡卻冷眼旁觀、不帶任何真實情感投入。',
    },
    {
      id: 'soft-4',
      traitAId: 'trait-self-1', // 冒牌者症候群
      traitBId: 'trait-self-2', // 全能自戀補償
      penaltyMultiplier: 0.2,
      note: '自戀與自卑的一體兩面：在自負的全能幻想與隨時可能暴露的冒牌恐懼之間劇烈震盪。',
    },
    {
      id: 'soft-5',
      traitAId: 'trait-values-1', // 絕對實用主義
      traitBId: 'trait-values-2', // 潔癖式道德律
      penaltyMultiplier: 0.1,
      note: '矛盾的道德功利主義：自有一套嚴苛到近乎病態的個人準則，但行事手段卻毫無禁忌地追求極致效能。',
    },
    {
      id: 'soft-6',
      traitAId: 'trait-defense-1', // 理智化昇華
      traitBId: 'trait-defense-3', // 退行依賴
      penaltyMultiplier: 0.2,
      note: '成人假面與幼態回溯：在常態下是用理論裝甲包裹的成熟學者，在獨處或崩潰時瞬間退回幼態求救。',
    },
  ],

  hardExclusions: [
    {
      id: 'hard-1',
      traitAId: 'trait-self-4', // 堅定核心自尊
      traitBId: 'trait-self-2', // 全能自戀補償
      reason: '核心自尊建立在健康真實的自我接納之上，與建立在病態防禦補償的全能自戀在心理架構上直接互斥。',
    },
    {
      id: 'hard-2',
      traitAId: 'trait-interaction-4', // 溫和鈍感
      traitBId: 'trait-interaction-3', // 邊界防禦過敏
      reason: '神經系統的鈍感遲緩與極度高敏多疑的邊界防衛，屬於不可兼容的神經互動基質。',
    },
    {
      id: 'hard-3',
      traitAId: 'trait-stress-1', // 戰鬥性亢奮
      traitBId: 'trait-stress-2', // 凍結假死
      reason: '中樞交感神經高亢狂熱與副交感神經背側迷走重度抑制假死無法在同一生理壓力反應下共存。',
    },
  ],
};

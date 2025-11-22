// 卡牌数据库 - 服务器端权威数据源
class CardDatabase {
  constructor() {
    // 卡牌数据（简化版，实际应从JSON文件加载）
    this.cards = {
      'gongsunli_003': {
        card_name: '公孙离',
        max_health: 600,
        attack: 600,
        armor: 150,
        crit_rate: 0.30,
        crit_damage: 1.30,
        dodge_rate: 0.30
      },
      'lan_002': {
        card_name: '澜',
        max_health: 700,
        attack: 400,
        armor: 250,
        crit_rate: 0.10,
        crit_damage: 1.30
      },
      'duoliya_001': {
        card_name: '朵莉亚',
        max_health: 900,
        attack: 300,
        armor: 300,
        crit_rate: 0.05,
        crit_damage: 1.30
      }
    };
  }
  
  getCard(cardId) {
    const baseCard = this.cards[cardId];
    if (!baseCard) {
      console.error('未找到卡牌:', cardId);
      return null;
    }
    // 返回副本，避免污染原始数据
    return JSON.parse(JSON.stringify(baseCard));
  }
}

module.exports = CardDatabase;

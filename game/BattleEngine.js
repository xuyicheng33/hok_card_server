// 战斗计算引擎 - 服务器端权威计算
const SkillCalculator = require('./SkillCalculator');

class BattleEngine {
  constructor(roomId, gameState) {
    this.roomId = roomId;
    this.state = gameState;
    this.skillCalculator = new SkillCalculator(this);
  }
  
  // 查找卡牌
  findCard(cardId) {
    // 在蓝方查找
    let card = this.state.blueCards.find(c => c.id === cardId);
    if (card) return card;
    
    // 在红方查找
    card = this.state.redCards.find(c => c.id === cardId);
    return card;
  }
  
  // 🎲 计算攻击（权威）
  calculateAttack(attackerId, targetId) {
    const attacker = this.findCard(attackerId);
    const target = this.findCard(targetId);
    
    if (!attacker || !target) {
      console.error('卡牌未找到:', attackerId, targetId);
      return null;
    }
    
    // 计算基础伤害
    const baseDamage = Math.max(0, attacker.attack - target.armor);
    
    // 🎲 暴击判定（服务器端权威）
    const isCritical = Math.random() < attacker.crit_rate;
    let finalDamage = baseDamage;
    
    if (isCritical) {
      finalDamage = Math.floor(baseDamage * attacker.crit_damage);
    }
    
    // 🎲 闪避判定（公孙离）
    let isDodged = false;
    if (target.card_name === '公孙离' && target.dodge_rate) {
      isDodged = Math.random() < target.dodge_rate;
    }
    
    const actualDamage = isDodged ? 0 : finalDamage;
    
    // 应用伤害
    target.health -= actualDamage;
    target.health = Math.max(0, target.health);
    
    const result = {
      attacker_id: attackerId,
      target_id: targetId,
      damage: actualDamage,
      is_critical: isCritical,
      is_dodged: isDodged,
      target_health: target.health,
      target_dead: target.health <= 0
    };
    
    console.log(`[战斗计算] ${attacker.card_name} -> ${target.card_name}: ${actualDamage}伤害 (暴击:${isCritical}, 闪避:${isDodged})`);
    
    return result;
  }
  
  // 🎮 计算技能（完整版 - 使用SkillCalculator）
  calculateSkill(casterId, skillName, params) {
    console.log('[BattleEngine] 计算技能:', casterId, skillName, params);
    
    // 使用SkillCalculator进行完整的技能计算
    const result = this.skillCalculator.executeSkill(casterId, skillName, params);
    
    if (result && result.success) {
      console.log('[BattleEngine] 技能计算成功:', result.effect_type);
    } else {
      console.error('[BattleEngine] 技能计算失败:', result ? result.error : '未知错误');
    }
    
    return result;
  }
  
  // 获取当前游戏状态
  getState() {
    return this.state;
  }
}

module.exports = BattleEngine;

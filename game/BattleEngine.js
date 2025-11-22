// 战斗计算引擎 - 服务器端权威计算
class BattleEngine {
  constructor(roomId, gameState) {
    this.roomId = roomId;
    this.state = gameState;
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
  
  // 🎮 计算技能（简化版）
  calculateSkill(casterId, skillName, targetIds) {
    const caster = this.findCard(casterId);
    
    if (!caster) {
      console.error('施法者未找到:', casterId);
      return null;
    }
    
    const results = [];
    
    for (const targetId of targetIds) {
      const target = this.findCard(targetId);
      if (!target) continue;
      
      // 简化的技能伤害计算
      let damage = 200; // 默认技能伤害
      
      // 暴击判定
      if (Math.random() < caster.crit_rate) {
        damage = Math.floor(damage * caster.crit_damage);
      }
      
      target.health -= damage;
      target.health = Math.max(0, target.health);
      
      results.push({
        target_id: targetId,
        damage: damage,
        target_health: target.health
      });
    }
    
    console.log(`[技能计算] ${caster.card_name} 使用 ${skillName}`);
    
    return {
      caster_id: casterId,
      skill_name: skillName,
      results: results
    };
  }
  
  // 获取当前游戏状态
  getState() {
    return this.state;
  }
}

module.exports = BattleEngine;

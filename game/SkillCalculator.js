// 技能计算器 - 服务器端权威技能效果计算
class SkillCalculator {
  constructor(battleEngine) {
    this.engine = battleEngine;
    this.state = battleEngine.state;
  }

  // 查找卡牌
  findCard(cardId) {
    return this.engine.findCard(cardId);
  }

  // 获取所有敌方卡牌
  getEnemyCards(isHost) {
    return isHost ? this.state.redCards : this.state.blueCards;
  }

  // 获取所有友方卡牌
  getAllyCards(isHost) {
    return isHost ? this.state.blueCards : this.state.redCards;
  }

  // ==================== 8个英雄技能实现 ====================

  // 1. 朵莉亚 - 人鱼之赐 (治疗)
  calculateDuoliyaSkill(casterId, targetId) {
    const caster = this.findCard(casterId);
    const target = this.findCard(targetId);

    if (!caster || !target) {
      return { success: false, error: '施法者或目标未找到' };
    }

    const healAmount = 130;
    const oldHealth = target.health;
    target.health = Math.min(target.max_health, target.health + healAmount);
    const actualHeal = target.health - oldHealth;

    console.log(`[朵莉亚技能] ${target.card_name} 恢复${actualHeal}生命值`);

    return {
      success: true,
      effect_type: 'heal',
      caster_id: casterId,
      target_id: targetId,
      heal_amount: actualHeal,
      target_health: target.health
    };
  }

  // 2. 澜 - 鲨之猎刃 (攻击力增加)
  calculateLanSkill(casterId) {
    const caster = this.findCard(casterId);

    if (!caster) {
      return { success: false, error: '施法者未找到' };
    }

    const attackBuff = 100;
    const oldAttack = caster.attack;
    caster.attack += attackBuff;

    console.log(`[澜技能] 攻击力 ${oldAttack} → ${caster.attack}`);

    return {
      success: true,
      effect_type: 'attack_buff',
      caster_id: casterId,
      old_attack: oldAttack,
      new_attack: caster.attack,
      buff_amount: attackBuff
    };
  }

  // 3. 公孙离 - 晚云落 (暴击率增加+溢出转换)
  calculateGongsunliSkill(casterId) {
    const caster = this.findCard(casterId);

    if (!caster) {
      return { success: false, error: '施法者未找到' };
    }

    const critRateBuff = 0.40;
    const oldCritRate = caster.crit_rate;
    const oldCritDamage = caster.crit_damage;

    let newCritRate = oldCritRate + critRateBuff;
    let overflow = 0;
    let critDamageBonus = 0;

    // 处理暴击率溢出（公孙离特有）
    if (newCritRate > 1.0) {
      overflow = newCritRate - 1.0;
      newCritRate = 1.0;
      // 溢出按2:1转换为暴击效果
      critDamageBonus = overflow / 2.0;
    }

    caster.crit_rate = newCritRate;

    // 应用暴击效果加成
    if (critDamageBonus > 0) {
      caster.crit_damage = Math.min(2.0, oldCritDamage + critDamageBonus);
    }

    console.log(`[公孙离技能] 暴击率 ${(oldCritRate*100).toFixed(1)}% → ${(newCritRate*100).toFixed(1)}%, 暴击效果 ${(oldCritDamage*100).toFixed(1)}% → ${(caster.crit_damage*100).toFixed(1)}%`);

    return {
      success: true,
      effect_type: 'crit_buff',
      caster_id: casterId,
      old_crit_rate: oldCritRate,
      new_crit_rate: newCritRate,
      old_crit_damage: oldCritDamage,
      new_crit_damage: caster.crit_damage,
      overflow: overflow,
      crit_damage_bonus: critDamageBonus
    };
  }

  // 4. 孙尚香 - 红莲爆弹 (减护甲+真实伤害)
  calculateSunshangxiangSkill(casterId, targetId) {
    const caster = this.findCard(casterId);
    const target = this.findCard(targetId);

    if (!caster || !target) {
      return { success: false, error: '施法者或目标未找到' };
    }

    // 减少护甲
    const armorReduction = 60;
    const oldArmor = target.armor;
    target.armor = Math.max(0, target.armor - armorReduction);
    const actualArmorReduction = oldArmor - target.armor;

    // 真实伤害
    const trueDamage = 75;
    const oldHealth = target.health;
    target.health = Math.max(0, target.health - trueDamage);
    const actualDamage = oldHealth - target.health;

    console.log(`[孙尚香技能] ${target.card_name} 护甲-${actualArmorReduction}, 受到${actualDamage}真实伤害`);

    return {
      success: true,
      effect_type: 'true_damage_and_armor_reduction',
      caster_id: casterId,
      target_id: targetId,
      armor_reduction: actualArmorReduction,
      true_damage: actualDamage,
      target_health: target.health,
      target_armor: target.armor,
      target_dead: target.health <= 0
    };
  }

  // 5. 瑶 - 鹿灵守心 (护盾+暴击率+护甲增加)
  calculateYaoSkill(casterId, targetId) {
    const caster = this.findCard(casterId);
    const target = this.findCard(targetId);

    if (!caster || !target) {
      return { success: false, error: '施法者或目标未找到' };
    }

    // 护盾：150 + 瑶当前生命值的8%
    const shieldAmount = 150 + Math.floor(caster.health * 0.08);
    target.shield = (target.shield || 0) + shieldAmount;

    // 暴击率+5%
    const critRateBuff = 0.05;
    const oldCritRate = target.crit_rate;
    target.crit_rate = Math.min(1.0, target.crit_rate + critRateBuff);

    // 护甲+20
    const armorBuff = 20;
    const oldArmor = target.armor;
    target.armor += armorBuff;

    console.log(`[瑶技能] ${target.card_name} 获得${shieldAmount}护盾, 暴击率+${critRateBuff*100}%, 护甲+${armorBuff}`);

    return {
      success: true,
      effect_type: 'shield_and_buff',
      caster_id: casterId,
      target_id: targetId,
      shield_amount: shieldAmount,
      crit_rate_buff: critRateBuff,
      armor_buff: armorBuff,
      target_shield: target.shield,
      old_crit_rate: oldCritRate,
      new_crit_rate: target.crit_rate,
      old_armor: oldArmor,
      new_armor: target.armor
    };
  }

  // 6. 大乔 - 沧海之曜 (AOE真实伤害)
  calculateDaqiaoSkill(casterId, isHost) {
    const caster = this.findCard(casterId);

    if (!caster) {
      return { success: false, error: '施法者未找到' };
    }

    const enemyCards = this.getEnemyCards(isHost);
    const damageResults = [];

    // 计算伤害：(已损生命值+攻击力)/5
    const lostHealth = caster.max_health - caster.health;
    const baseDamage = Math.floor((lostHealth + caster.attack) / 5);

    // 对每个敌人造成伤害
    for (const enemy of enemyCards) {
      if (enemy && enemy.health > 0) {
        let finalDamage = baseDamage;
        let isCrit = false;

        // 暴击判定
        if (Math.random() < caster.crit_rate) {
          isCrit = true;
          finalDamage = Math.floor(baseDamage * caster.crit_damage);
        }

        const oldHealth = enemy.health;
        enemy.health = Math.max(0, enemy.health - finalDamage);
        const actualDamage = oldHealth - enemy.health;

        damageResults.push({
          target_id: enemy.id,
          target_name: enemy.card_name,
          damage: actualDamage,
          is_critical: isCrit,
          target_health: enemy.health,
          target_dead: enemy.health <= 0
        });
      }
    }

    console.log(`[大乔技能] AOE伤害${baseDamage}, 命中${damageResults.length}个目标`);

    return {
      success: true,
      effect_type: 'aoe_true_damage',
      caster_id: casterId,
      base_damage: baseDamage,
      results: damageResults
    };
  }

  // 7. 少司缘 - 两同心 (治疗或伤害，基于偷取点数)
  calculateShaosiyuanSkill(casterId, targetId, isAlly) {
    const caster = this.findCard(casterId);
    const target = this.findCard(targetId);

    if (!caster || !target) {
      return { success: false, error: '施法者或目标未找到' };
    }

    const stolenPoints = Math.min(4, caster.stolen_points || 0);

    if (isAlly) {
      // 缘起（生）：治疗
      const healAmount = 100 + stolenPoints * 40;
      const oldHealth = target.health;
      target.health = Math.min(target.max_health, target.health + healAmount);
      const actualHeal = target.health - oldHealth;

      console.log(`[少司缘技能-治疗] ${target.card_name} 恢复${actualHeal}生命值 (偷取点数:${stolenPoints})`);

      return {
        success: true,
        effect_type: 'shaosiyuan_heal',
        caster_id: casterId,
        target_id: targetId,
        heal_amount: actualHeal,
        stolen_points: stolenPoints,
        target_health: target.health
      };
    } else {
      // 缘灭（灭）：真实伤害
      let damage = 150 + stolenPoints * 50;
      let isCrit = false;

      // 暴击判定
      if (Math.random() < caster.crit_rate) {
        isCrit = true;
        damage = Math.floor(damage * caster.crit_damage);
      }

      const oldHealth = target.health;
      target.health = Math.max(0, target.health - damage);
      const actualDamage = oldHealth - target.health;

      console.log(`[少司缘技能-伤害] ${target.card_name} 受到${actualDamage}真实伤害 (偷取点数:${stolenPoints})`);

      return {
        success: true,
        effect_type: 'shaosiyuan_damage',
        caster_id: casterId,
        target_id: targetId,
        damage: actualDamage,
        stolen_points: stolenPoints,
        is_critical: isCrit,
        target_health: target.health,
        target_dead: target.health <= 0
      };
    }
  }

  // 8. 杨玉环 - 惊鸿曲 (根据生命值AOE伤害或治疗)
  calculateYangyuhuanSkill(casterId, isHost) {
    const caster = this.findCard(casterId);

    if (!caster) {
      return { success: false, error: '施法者未找到' };
    }

    // 标记技能已使用（用于被动）
    caster.skill_used = true;

    const healthPercentage = caster.health / caster.max_health;
    const isHighHealth = healthPercentage >= 0.5;

    if (isHighHealth) {
      // 生命值≥50%：AOE伤害
      const lostHealth = caster.max_health - caster.health;
      const baseDamage = Math.floor(0.3 * caster.attack + 0.2 * lostHealth);

      const enemyCards = this.getEnemyCards(isHost);
      const damageResults = [];

      for (const enemy of enemyCards) {
        if (enemy && enemy.health > 0) {
          let finalDamage = baseDamage;
          let isCrit = false;

          // 暴击判定
          if (Math.random() < caster.crit_rate) {
            isCrit = true;
            finalDamage = Math.floor(baseDamage * caster.crit_damage);
          }

          const oldHealth = enemy.health;
          enemy.health = Math.max(0, enemy.health - finalDamage);
          const actualDamage = oldHealth - enemy.health;

          damageResults.push({
            target_id: enemy.id,
            target_name: enemy.card_name,
            damage: actualDamage,
            is_critical: isCrit,
            target_health: enemy.health,
            target_dead: enemy.health <= 0
          });
        }
      }

      console.log(`[杨玉环技能-伤害] AOE伤害${baseDamage}, 命中${damageResults.length}个目标`);

      return {
        success: true,
        effect_type: 'yangyuhuan_damage',
        caster_id: casterId,
        base_damage: baseDamage,
        is_high_health: true,
        results: damageResults
      };
    } else {
      // 生命值<50%：AOE治疗
      const healAmount = Math.floor(0.3 * caster.attack + 0.2 * caster.health);

      const allyCards = this.getAllyCards(isHost);
      const healResults = [];

      for (const ally of allyCards) {
        if (ally && ally.health > 0) {
          const oldHealth = ally.health;
          ally.health = Math.min(ally.max_health, ally.health + healAmount);
          const actualHeal = ally.health - oldHealth;

          healResults.push({
            target_id: ally.id,
            target_name: ally.card_name,
            heal_amount: actualHeal,
            target_health: ally.health
          });
        }
      }

      console.log(`[杨玉环技能-治疗] AOE治疗${healAmount}, 治疗${healResults.length}个目标`);

      return {
        success: true,
        effect_type: 'yangyuhuan_heal',
        caster_id: casterId,
        base_heal: healAmount,
        is_high_health: false,
        results: healResults
      };
    }
  }

  // ==================== 技能执行入口 ====================

  executeSkill(casterId, skillName, params) {
    const caster = this.findCard(casterId);

    if (!caster) {
      console.error('[技能计算] 施法者未找到:', casterId);
      return { success: false, error: '施法者未找到' };
    }

    console.log(`[技能计算] ${caster.card_name} 使用 ${skillName}`);

    // 根据施法者名称调用对应技能
    try {
      switch (caster.card_name) {
        case '朵莉亚':
          return this.calculateDuoliyaSkill(casterId, params.target_id);
        case '澜':
          return this.calculateLanSkill(casterId);
        case '公孙离':
          return this.calculateGongsunliSkill(casterId);
        case '孙尚香':
          return this.calculateSunshangxiangSkill(casterId, params.target_id);
        case '瑶':
          return this.calculateYaoSkill(casterId, params.target_id);
        case '大乔':
          return this.calculateDaqiaoSkill(casterId, params.is_host);
        case '少司缘':
          return this.calculateShaosiyuanSkill(casterId, params.target_id, params.is_ally);
        case '杨玉环':
          return this.calculateYangyuhuanSkill(casterId, params.is_host);
        default:
          console.error('[技能计算] 未知英雄:', caster.card_name);
          return { success: false, error: '未知英雄' };
      }
    } catch (error) {
      console.error('[技能计算错误]', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SkillCalculator;

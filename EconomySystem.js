/**
 * EconomySystem.js - ユーザー別プロファイル＆トークン経済システム（日本語対応）
 * 
 * 1. お子さまのユーザー名ログインとプロファイル切り替え
 * 2. ユーザーごとの独立したスターコイン・習熟度・学習元帳
 * 3. 単元・ステージの再挑戦に対応（初回クリアのみポイント加算）
 */

import { FULL_CURRICULUM_DAG } from './CurriculumData.js';

export const MASTERY_UNLOCK_THRESHOLD = 0.85;
export const SAMPLE_KNOWLEDGE_DAG = FULL_CURRICULUM_DAG;

export function evaluateDAGProgression(dagGraph = SAMPLE_KNOWLEDGE_DAG, playerMasteryMap = {}) {
  const clearedNodes = [];
  const availableNodes = [];
  const lockedNodes = [];

  dagGraph.forEach((node) => {
    const selfMastery = playerMasteryMap[node.id] || 0;

    if (selfMastery >= MASTERY_UNLOCK_THRESHOLD) {
      clearedNodes.push({ ...node, status: 'CLEARED', mastery: selfMastery });
      return;
    }

    const prereqs = node.prerequisites || [];
    const allPrereqsMet = prereqs.every((prereqId) => {
      const prereqMastery = playerMasteryMap[prereqId] || 0;
      return prereqMastery >= MASTERY_UNLOCK_THRESHOLD;
    });

    if (allPrereqsMet || prereqs.length === 0) {
      availableNodes.push({ ...node, status: 'AVAILABLE', mastery: selfMastery });
    } else {
      const unmetPrereqs = prereqs.filter((id) => (playerMasteryMap[id] || 0) < MASTERY_UNLOCK_THRESHOLD);
      lockedNodes.push({ ...node, status: 'LOCKED', mastery: selfMastery, unmetPrereqs });
    }
  });

  return {
    clearedNodes,
    availableNodes,
    lockedNodes,
    availableNodeIds: availableNodes.map((n) => n.id)
  };
}

export function calculateDynamicPoints({
  base = 100,
  bloomDepth = 1.0,
  accuracy = 1.0,
  streakCount = 0
} = {}) {
  const B = Math.max(0, base);
  const C_depth = Math.min(2.5, Math.max(1.0, bloomDepth));
  const A_score = Math.min(1.0, Math.max(0.0, accuracy));
  const S_multi = Math.min(2.0, Math.max(1.0, 1.0 + streakCount * 0.1));

  const finalPoints = Math.round(B * C_depth * A_score * S_multi);

  return {
    finalPoints,
    breakdown: {
      base: B,
      bloomDepth: Number(C_depth.toFixed(2)),
      accuracy: Number(A_score.toFixed(2)),
      streakMultiplier: Number(S_multi.toFixed(2)),
      formula: `${B} × ${C_depth.toFixed(1)} × ${A_score.toFixed(2)} × ${S_multi.toFixed(1)}`
    }
  };
}

export const SHOP_CATALOG = {
  currency: 'STAR_COINS',
  categories: [
    {
      id: 'skins',
      name: 'ぼうけんマップのきせかえ',
      items: [
        {
          id: 'skin_nebula_aurora',
          title: 'オーロラの光',
          description: '冒険マップが、緑と青にきらめくオーロラカラーになるよ。',
          price: 600,
          icon: '🌌',
          type: 'SKIN'
        },
        {
          id: 'skin_cyber_neon',
          title: 'ネオンフェスティバル',
          description: '冒険マップが、紫と青に光る特別カラーになるよ。',
          price: 1200,
          icon: '✨',
          type: 'SKIN'
        }
      ]
    },
    {
      id: 'badges',
      name: 'がんばりバッジ',
      items: [
        {
          id: 'badge_kanji_master',
          title: '漢字・ことば名人（国語）',
          description: 'プロフィールの横に、漢字名人のしるしを表示できるよ。',
          price: 300,
          icon: '🎴',
          type: 'BADGE'
        },
        {
          id: 'badge_kuku_master',
          title: '九九マスター（算数）',
          description: 'プロフィールの横に、九九マスターのしるしを表示できるよ。',
          price: 300,
          icon: '⚡',
          type: 'BADGE'
        },
        {
          id: 'badge_ratio_alchemist',
          title: '割合ぴったり名人（算数）',
          description: 'プロフィールの横に、割合名人のしるしを表示できるよ。',
          price: 300,
          icon: '⚖️',
          type: 'BADGE'
        },
        {
          id: 'badge_prefecture_pilot',
          title: '日本地図マスター（社会）',
          description: 'プロフィールの横に、日本地図マスターのしるしを表示できるよ。',
          price: 300,
          icon: '🗾',
          type: 'BADGE'
        }
      ]
    },
    {
      id: 'items',
      name: 'おたすけアイテム',
      items: [
        {
          id: 'item_challenge_ticket',
          title: '制限時間延長チケット × 3',
          description: 'ゲームの残り時間を30秒ふやせるよ。',
          price: 150,
          icon: '🎟️',
          type: 'CONSUMABLE',
          bundleQuantity: 3
        },
        {
          id: 'item_hint_radar',
          title: 'きらきらヒント',
          description: '答えを考える手がかりを1回だけ光らせるよ。',
          price: 100,
          icon: '📡',
          type: 'CONSUMABLE',
          bundleQuantity: 1
        }
      ]
    }
  ]
};

export class EconomyManager {
  constructor(defaultUserName = 'まなびくん') {
    this.storageKey = 'GALAXY_ECONOMY_MULTIUSER_V1';
    this.defaultUserName = String(defaultUserName || '').trim() || 'まなびくん';
    this.loadState();
  }

  loadState() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this.currentUser = data.currentUser || this.defaultUserName;
          this.users = data.users || {};
          if (!this.users[this.currentUser]) {
            this.initNewUser(this.currentUser);
          }
          return;
        } catch (e) {
          console.error('Failed to parse multi-user economy state:', e);
        }
      }
    }

    this.currentUser = this.defaultUserName;
    this.users = {};
    this.initNewUser(this.currentUser);
    this.saveState();
  }

  initNewUser(userName) {
    this.users[userName] = {
      name: userName,
      starCoins: 500,
      streak: 3,
      clearedNodes: {},
      clearedStages: {},
      playerMastery: {},
      achievements: [],
      inventory: [],
      ledger: [
        {
          transactionId: `TX-INIT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'SYSTEM_GRANT',
          amount: 500,
          balanceAfter: 500,
          description: `${userName}さんへ、はじめてのお祝いコイン！`
        }
      ]
    };
  }

  get activeUser() {
    if (!this.users[this.currentUser]) {
      this.initNewUser(this.currentUser);
    }
    if (!this.users[this.currentUser].clearedStages) {
      this.users[this.currentUser].clearedStages = {};
    }
    if (!Array.isArray(this.users[this.currentUser].achievements)) {
      this.users[this.currentUser].achievements = [];
    }
    if (!Array.isArray(this.users[this.currentUser].inventory)) {
      this.users[this.currentUser].inventory = [];
    }
    const normalizedInventory = [];
    this.users[this.currentUser].inventory.forEach(entry => {
      const catalogItem = this.getCatalogItem(entry.itemId);
      if (!Number.isFinite(Number(entry.quantity))) {
        entry.quantity = catalogItem?.type === 'CONSUMABLE' ? Number(catalogItem.bundleQuantity || 1) : 1;
      }
      entry.quantity = Math.max(0, Math.floor(Number(entry.quantity)));
      entry.type ||= catalogItem?.type || 'SPECIAL';
      const previous = normalizedInventory.find(candidate => candidate.itemId === entry.itemId);
      if (previous && catalogItem?.type === 'CONSUMABLE') previous.quantity += entry.quantity;
      else if (!previous) normalizedInventory.push(entry);
    });
    this.users[this.currentUser].inventory = normalizedInventory;
    return this.users[this.currentUser];
  }

  get starCoins() { return this.activeUser.starCoins; }
  set starCoins(val) { this.activeUser.starCoins = val; }

  get streak() { return this.activeUser.streak; }
  set streak(val) { this.activeUser.streak = val; }

  get playerMastery() { return this.activeUser.playerMastery; }
  set playerMastery(val) { this.activeUser.playerMastery = val; }

  get inventory() { return this.activeUser.inventory; }
  set inventory(val) { this.activeUser.inventory = val; }

  get ledger() { return this.activeUser.ledger; }
  set ledger(val) { this.activeUser.ledger = val; }

  get clearedNodes() { return this.activeUser.clearedNodes; }
  get clearedStages() { return this.activeUser.clearedStages || {}; }
  get achievements() { return this.activeUser.achievements || []; }

  getCatalogItem(itemId) {
    for (const category of SHOP_CATALOG.categories) {
      const item = category.items.find(candidate => candidate.id === itemId);
      if (item) return item;
    }
    return null;
  }

  getInventoryEntry(itemId) {
    return this.inventory.find(entry => entry.itemId === itemId) || null;
  }

  getItemQuantity(itemId) {
    return Math.max(0, Number(this.getInventoryEntry(itemId)?.quantity || 0));
  }

  ownsItem(itemId) {
    const item = this.getCatalogItem(itemId);
    const entry = this.getInventoryEntry(itemId);
    return Boolean(item && entry && (item.type !== 'CONSUMABLE' || this.getItemQuantity(itemId) > 0));
  }

  getEquippedItem(type) {
    const normalizedType = String(type || '').toUpperCase();
    const entry = this.inventory.find(candidate => {
      const item = this.getCatalogItem(candidate.itemId);
      return candidate.equipped === true && item?.type === normalizedType;
    });
    const item = entry ? this.getCatalogItem(entry.itemId) : null;
    return item ? { ...item, ...entry } : null;
  }

  equipItem(itemId) {
    const item = this.getCatalogItem(itemId);
    if (!item || !['SKIN', 'BADGE'].includes(item.type)) return { success: false, message: 'このアイテムは装備できません。' };
    const entry = this.getInventoryEntry(itemId);
    if (!entry) return { success: false, message: '先にショップで交換してね。' };
    this.inventory.forEach(candidate => {
      if (this.getCatalogItem(candidate.itemId)?.type === item.type) candidate.equipped = candidate.itemId === itemId;
    });
    this.saveState();
    return { success: true, item, entry };
  }

  consumeItem(itemId, quantity = 1) {
    const item = this.getCatalogItem(itemId);
    const requested = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!item || item.type !== 'CONSUMABLE') return { success: false, message: 'このアイテムは使用できません。' };
    const entry = this.getInventoryEntry(itemId);
    if (!entry || this.getItemQuantity(itemId) < requested) return { success: false, message: 'このアイテムを持っていません。' };
    entry.quantity -= requested;
    this.ledger.unshift({
      transactionId: `TX-USE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ITEM_USE',
      amount: 0,
      balanceAfter: this.starCoins,
      description: `「${item.title}」を使用`
    });
    this.saveState();
    return { success: true, item, remainingQuantity: entry.quantity };
  }

  isStageCleared(nodeId, stageNum) {
    return !!(this.clearedStages[nodeId] && this.clearedStages[nodeId][stageNum]);
  }

  getClearedStagesCount(nodeId) {
    if (!this.clearedStages[nodeId]) return 0;
    return Object.keys(this.clearedStages[nodeId]).length;
  }

  recordStageClear(nodeId, stageNum, accuracy = 1.0) {
    const normalizedAccuracy = Number(accuracy);
    if (!nodeId || !Number.isFinite(normalizedAccuracy) || normalizedAccuracy <= 0) {
      return {
        isFirstClear: false,
        pointsEarned: 0,
        breakdown: null,
        newBalance: this.starCoins,
        rejected: true,
        reason: 'STAGE_NOT_CLEARED',
        unlockedOverview: evaluateDAGProgression(FULL_CURRICULUM_DAG, this.playerMastery)
      };
    }
    if (!this.activeUser.clearedStages) {
      this.activeUser.clearedStages = {};
    }
    if (!this.activeUser.clearedStages[nodeId]) {
      this.activeUser.clearedStages[nodeId] = {};
    }
    this.activeUser.clearedStages[nodeId][stageNum] = {
      clearedAt: new Date().toISOString(),
      accuracy: normalizedAccuracy
    };
    this.saveState();
    return this.awardNodeClear(nodeId, normalizedAccuracy);
  }

  saveState() {
    const payload = {
      currentUser: this.currentUser,
      users: this.users
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ECONOMY_STATE_CHANGED', { detail: payload }));
    }
  }

  // お子さまの名前ログイン・切り替え
  loginUser(userName) {
    const trimmed = (userName || '').trim();
    if (!trimmed) return false;

    this.currentUser = trimmed;
    if (!this.users[this.currentUser]) {
      this.initNewUser(this.currentUser);
    }
    this.saveState();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('USER_PROFILE_CHANGED', { detail: { userName: this.currentUser, profile: this.activeUser } }));
    }
    return true;
  }

  getUserList() {
    return Object.keys(this.users);
  }

  awardGraduationCertificate(certificate) {
    if (!certificate?.id || this.achievements.some(item => item.id === certificate.id)) {
      return { awarded: false, certificate: this.achievements.find(item => item.id === certificate?.id) || null };
    }
    this.activeUser.achievements.push(certificate);
    this.starCoins += Number(certificate.rewardCoins) || 0;
    this.inventory.push({
      itemId: certificate.id,
      title: certificate.title,
      certificateNumber: certificate.certificateNumber,
      purchasedAt: certificate.issuedAt
    });
    this.ledger.unshift({
      transactionId: `TX-GRADUATION-${Date.now()}`,
      timestamp: certificate.issuedAt,
      type: 'ELEMENTARY_GRADUATION_REWARD',
      amount: Number(certificate.rewardCoins) || 0,
      balanceAfter: this.starCoins,
      description: `1〜6年生のチャレンジを全部クリア！「${certificate.title}」のお祝い`
    });
    this.saveState();
    return { awarded: true, certificate };
  }

  // ステージクリア処理（初回クリアのみポイント加算・重複挑戦はスコア更新のみ）
  awardNodeClear(nodeId, accuracy = 1.0) {
    const node = FULL_CURRICULUM_DAG.find((n) => n.id === nodeId) || {
      bloomDepth: 1.5,
      name: '学びの星'
    };

    const isFirstClear = !this.clearedNodes[nodeId] || !this.clearedNodes[nodeId].rewarded;
    this.playerMastery[nodeId] = Math.max(this.playerMastery[nodeId] || 0, accuracy);

    let pointsAwarded = 0;
    let breakdown = null;

    if (isFirstClear && accuracy >= MASTERY_UNLOCK_THRESHOLD) {
      const calc = calculateDynamicPoints({
        base: 100,
        bloomDepth: node.bloomDepth || 1.2,
        accuracy: accuracy,
        streakCount: this.streak
      });

      pointsAwarded = calc.finalPoints;
      breakdown = calc.breakdown;
      this.streak++;
      this.starCoins += pointsAwarded;

      this.clearedNodes[nodeId] = {
        rewarded: true,
        bestAccuracy: accuracy,
        clearedAt: new Date().toISOString()
      };

      const record = {
        transactionId: `TX-REWARD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'STAGE_CLEAR_REWARD',
        amount: pointsAwarded,
        balanceAfter: this.starCoins,
        description: `「${node.name}」をはじめてクリア！`
      };
      this.ledger.unshift(record);
    } else {
      // 復習（重複挑戦）：ポイントは加算せず習熟度のみ更新
      this.clearedNodes[nodeId] = {
        rewarded: true,
        bestAccuracy: Math.max(this.clearedNodes[nodeId]?.bestAccuracy || 0, accuracy),
        clearedAt: new Date().toISOString()
      };
    }

    this.saveState();

    return {
      isFirstClear,
      pointsEarned: pointsAwarded,
      breakdown: breakdown,
      newBalance: this.starCoins,
      unlockedOverview: evaluateDAGProgression(FULL_CURRICULUM_DAG, this.playerMastery)
    };
  }

  purchaseItem(itemId) {
    const targetItem = this.getCatalogItem(itemId);

    if (!targetItem) return { success: false, message: 'このアイテムは見つかりませんでした。' };
    if (targetItem.type !== 'CONSUMABLE' && this.ownsItem(itemId)) return { success: false, message: 'このアイテムはもう持っているよ。' };
    if (this.starCoins < targetItem.price) return { success: false, message: 'コインがもう少し必要だよ！' };

    this.starCoins -= targetItem.price;
    const purchasedAt = new Date().toISOString();
    let inventoryEntry = this.getInventoryEntry(targetItem.id);
    if (targetItem.type === 'CONSUMABLE' && inventoryEntry) {
      inventoryEntry.quantity += Number(targetItem.bundleQuantity || 1);
      inventoryEntry.purchasedAt = purchasedAt;
    } else {
      inventoryEntry = {
        itemId: targetItem.id,
        title: targetItem.title,
        type: targetItem.type,
        quantity: Number(targetItem.bundleQuantity || 1),
        equipped: ['SKIN', 'BADGE'].includes(targetItem.type),
        purchasedAt
      };
      if (inventoryEntry.equipped) {
        this.inventory.forEach(candidate => {
          if (this.getCatalogItem(candidate.itemId)?.type === targetItem.type) candidate.equipped = false;
        });
      }
      this.inventory.push(inventoryEntry);
    }

    const record = {
      transactionId: `TX-BUY-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'SHOP_PURCHASE',
      amount: -targetItem.price,
      balanceAfter: this.starCoins,
      description: `「${targetItem.title}」${targetItem.type === 'CONSUMABLE' ? ` × ${targetItem.bundleQuantity || 1}` : ''}と交換`
    };

    this.ledger.unshift(record);
    this.saveState();
    return { success: true, item: targetItem, inventoryEntry, newBalance: this.starCoins };
  }
}

export const ELEMENTARY_GRADUATION_ACHIEVEMENT_ID = 'ELEMENTARY_GRADUATION_CERTIFICATE';
export const ELEMENTARY_GRADUATION_REWARD_COINS = 1000;

export function calculateGradeProgress(nodes = [], clearedStages = {}, getMaxStages = () => 0) {
  return [1, 2, 3, 4, 5, 6].map((grade) => {
    const gradeNodes = nodes.filter(node => Number(node.grade) === grade);
    let totalStages = 0;
    let clearedStageCount = 0;
    for (const node of gradeNodes) {
      const maxStages = Math.max(0, Number(getMaxStages(node)) || 0);
      totalStages += maxStages;
      const records = clearedStages[node.id] || {};
      for (let stage = 1; stage <= maxStages; stage += 1) {
        if (records[stage]) clearedStageCount += 1;
      }
    }
    const completionRate = totalStages > 0 ? clearedStageCount / totalStages : 0;
    return {
      grade,
      nodeCount: gradeNodes.length,
      totalStages,
      clearedStages: clearedStageCount,
      completionRate,
      completed: totalStages > 0 && clearedStageCount === totalStages
    };
  });
}

export function isElementaryCourseComplete(gradeProgress = []) {
  return gradeProgress.length === 6 && gradeProgress.every(item => item.completed && item.totalStages > 0);
}

export function createGraduationCertificate({ userId, learnerName, gradeProgress, issuedAt = new Date().toISOString() }) {
  if (!isElementaryCourseComplete(gradeProgress)) return null;
  const completedStages = gradeProgress.reduce((sum, item) => sum + item.clearedStages, 0);
  const identity = `${userId || 'local'}|${learnerName || '学習者'}|${issuedAt}|${completedStages}`;
  return {
    id: ELEMENTARY_GRADUATION_ACHIEVEMENT_ID,
    title: '小学校課程修了証',
    learnerName: learnerName || '学習者',
    issuedAt,
    completedStages,
    certificateNumber: `PSES-${new Date(issuedAt).getUTCFullYear()}-${stableHash(identity)}`,
    rewardCoins: ELEMENTARY_GRADUATION_REWARD_COINS
  };
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

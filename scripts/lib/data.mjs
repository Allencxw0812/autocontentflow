/**
 * 数据读写工具 — 操作 tools.json / scenarios.json
 */
import fs from 'node:fs';
import { TOOLS_FILE, SCENARIOS_FILE, STALENESS_DAYS } from '../config.mjs';

export function readJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

export function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function loadTools() {
  return readJSON(TOOLS_FILE).tools;
}

export function saveTools(tools) {
  writeJSON(TOOLS_FILE, { tools });
}

export function loadScenarios() {
  return readJSON(SCENARIOS_FILE);
}

export function saveScenarios(data) {
  writeJSON(SCENARIOS_FILE, data);
}

/** 查找过期工具（updatedAt 超过阈值）*/
export function findStaleTools(daysThreshold = STALENESS_DAYS) {
  const tools = loadTools();
  const now = Date.now();
  const threshold = daysThreshold * 86400_000;

  return tools
    .map((t) => {
      const age = now - new Date(t.updatedAt).getTime();
      return { ...t, _ageDays: Math.round(age / 86400_000) };
    })
    .filter((t) => t._ageDays > daysThreshold)
    .sort((a, b) => b._ageDays - a._ageDays);
}

/** 查找过期场景 */
export function findStaleScenarios(daysThreshold = STALENESS_DAYS) {
  const { scenarios } = loadScenarios();
  const now = Date.now();
  const threshold = daysThreshold * 86400_000;

  return scenarios
    .map((s) => {
      const age = now - new Date(s.updatedAt).getTime();
      return { ...s, _ageDays: Math.round(age / 86400_000) };
    })
    .filter((s) => s._ageDays > daysThreshold)
    .sort((a, b) => b._ageDays - a._ageDays);
}

/** 获取工具分类统计 */
export function getCategoryStats() {
  const tools = loadTools();
  const stats = {};
  for (const t of tools) {
    for (const cat of t.category) {
      stats[cat] = (stats[cat] || 0) + 1;
    }
  }
  return stats;
}

/** 计算综合评分 */
export function computeOverallRating(rating) {
  return (
    Math.round(((rating.coreAdvantage + rating.easeOfUse + rating.chineseFriendly) / 3) * 10) / 10
  );
}

import type { Tool, Scenario, Role, ToolsData, ScenariosData } from '../types/index';
import toolsData from '../data/tools.json';
import scenariosData from '../data/scenarios.json';

const typedToolsData = toolsData as ToolsData;
const typedScenariosData = scenariosData as ScenariosData;

/** 获取所有工具 */
export function getAllTools(): Tool[] {
  return typedToolsData.tools;
}

/** 根据slug获取工具 */
export function getToolBySlug(slug: string): Tool | undefined {
  return typedToolsData.tools.find((t) => t.slug === slug);
}

/** 根据ID获取工具 */
export function getToolById(id: string): Tool | undefined {
  return typedToolsData.tools.find((t) => t.id === id);
}

/** 获取同类工具（排除自身） */
export function getSimilarTools(toolId: string): Tool[] {
  const tool = getToolById(toolId);
  if (!tool) return [];
  return tool.similarTools
    .map((id) => getToolById(id))
    .filter((t): t is Tool => t !== undefined);
}

/** 获取工具的适用场景对象 */
export function getToolScenarios(toolId: string): Scenario[] {
  const tool = getToolById(toolId);
  if (!tool) return [];
  return tool.applicableScenarios
    .map((id) => getScenarioById(id))
    .filter((s): s is Scenario => s !== undefined);
}

/** 获取所有场景 */
export function getAllScenarios(): Scenario[] {
  return typedScenariosData.scenarios;
}

/** 根据slug获取场景 */
export function getScenarioBySlug(slug: string): Scenario | undefined {
  return typedScenariosData.scenarios.find((s) => s.slug === slug);
}

/** 根据ID获取场景 */
export function getScenarioById(id: string): Scenario | undefined {
  return typedScenariosData.scenarios.find((s) => s.id === id);
}

/** 根据角色获取场景列表 */
export function getScenariosByRole(roleId: string): Scenario[] {
  return typedScenariosData.scenarios.filter((s) => s.role === roleId);
}

/** 获取所有角色 */
export function getAllRoles(): Role[] {
  return typedScenariosData.roles;
}

/** 根据ID获取角色 */
export function getRoleById(id: string): Role | undefined {
  return typedScenariosData.roles.find((r) => r.id === id);
}

/** 获取免费替代数据 */
export function getFreeAlternatives(): Array<{ paidTool: Tool; freeTool: Tool; note: string }> {
  const result: Array<{ paidTool: Tool; freeTool: Tool; note: string }> = [];
  for (const tool of typedToolsData.tools) {
    if (tool.freeAlternativeTo.length > 0) {
      for (const paidToolId of tool.freeAlternativeTo) {
        const paidTool = getToolById(paidToolId);
        if (paidTool) {
          result.push({
            paidTool,
            freeTool: tool,
            note: `${tool.name}可替代${paidTool.name}`,
          });
        }
      }
    }
  }
  return result;
}

/** 获取关联场景对象列表 */
export function getRelatedScenarios(scenarioId: string): Scenario[] {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return [];
  return scenario.relatedScenarios
    .map((id) => getScenarioById(id))
    .filter((s): s is Scenario => s !== undefined);
}

/** 按分类获取免费替代方案 */
export function getFreeAlternativesByCategory(): Record<string, Array<{ paidTool: Tool; freeTool: Tool; note: string }>> {
  const alts = getFreeAlternatives();
  const grouped: Record<string, Array<{ paidTool: Tool; freeTool: Tool; note: string }>> = {};
  for (const alt of alts) {
    const cat = alt.freeTool.category[0] || 'other';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(alt);
  }
  return grouped;
}

/** 分类名称映射 */
export const categoryNames: Record<string, string> = {
  'ai-chat': 'AI对话',
  'ai-image': 'AI绘画',
  'ai-writing': 'AI写作',
  'ai-code': 'AI编程',
  'ai-video': 'AI视频',
  'ai-audio': 'AI音频',
  'ai-productivity': 'AI办公',
  'other': '其他',
};

/** 从URL中提取域名，用于favicon加载 */
export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/** 获取工具的本地图标路径 */
export function getToolIcon(toolId: string): string {
  return `/icons/${toolId}.png`;
}

/** 获取工具的后备favicon URL（加载失败时回退用） */
export function getToolFavicon(toolUrl: string, size: number = 64): string {
  const domain = getDomainFromUrl(toolUrl);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

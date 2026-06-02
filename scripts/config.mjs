/**
 * 自动化运营系统 — 全局配置
 */

export const ROOT = new URL('..', import.meta.url).pathname;

export const DATA_DIR = `${ROOT}src/data/`;
export const TOOLS_FILE = `${DATA_DIR}tools.json`;
export const SCENARIOS_FILE = `${DATA_DIR}scenarios.json`;
export const ICONS_DIR = `${ROOT}public/icons/`;

/** 内容过期阈值（天）*/
export const STALENESS_DAYS = 90;

/** 爬虫请求间隔（ms），避免被封 */
export const CRAWL_DELAY_MS = 2000;

/** 爬虫超时（ms）*/
export const CRAWL_TIMEOUT_MS = 15000;

/** Claude 模型 */
export const CLAUDE_MODEL = 'claude-sonnet-4-6';

/** 单次 AI 调用最大工具数 */
export const AI_BATCH_SIZE = 3;

/** 工具分类名映射 */
export const CATEGORY_NAMES = {
  'ai-chat': 'AI对话',
  'ai-image': 'AI绘画',
  'ai-writing': 'AI写作',
  'ai-code': 'AI编程',
  'ai-video': 'AI视频',
  'ai-audio': 'AI音频',
  'ai-translation': 'AI翻译',
  'ai-voice': 'AI语音',
  'ai-productivity': 'AI办公',
};

/** 需要监控变更的关键指标 */
export const MONITOR_FIELDS = [
  'pricingDetail',    // 价格变化
  'freeQuota',        // 免费额度变化
  'needsVPN',         // 翻墙要求变化
  'chineseSupport',   // 中文支持变化
];

/** 爬虫目标：工具官网关键页面 */
export const CRAWL_TARGETS = [
  { selector: 'title', field: 'pageTitle' },
  { selector: 'meta[name="description"]', field: 'metaDescription', attr: 'content' },
];

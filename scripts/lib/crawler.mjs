/**
 * 网页爬虫 — 抓取工具官网信息并检测变更
 */
import { CRAWL_DELAY_MS, CRAWL_TIMEOUT_MS, MONITOR_FIELDS } from '../config.mjs';
import { loadTools } from './data.mjs';

/** 带超时的 fetch */
async function fetchWithTimeout(url, timeoutMs = CRAWL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-Website-Crawler/1.0 (content monitoring bot)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** 从 HTML 中提取文本（去掉标签）*/
function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** 提取 meta 标签内容 */
function extractMeta(html, name) {
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  if (!match) {
    // 尝试 property 属性 (OG tags)
    const ogRegex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i');
    const ogMatch = html.match(ogRegex);
    return ogMatch ? ogMatch[1] : null;
  }
  return match[1];
}

/** 抓取单个工具页面，提取关键信息 */
async function crawlToolPage(url) {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { error: `HTTP ${res.status}`, url };

    const html = await res.text();
    const title = extractMeta(html, 'title') || stripTags(html.match(/<title>([^<]+)<\/title>/)?.[1] || '');

    return {
      url,
      title: title?.slice(0, 200),
      description: extractMeta(html, 'description')?.slice(0, 500) || null,
      finalUrl: res.url, // 跟随重定向后的最终 URL
      status: res.status,
    };
  } catch (err) {
    return { error: err.message, url };
  }
}

/** 对比爬取结果与现有数据，生成变更报告 */
function diffToolData(tool, crawlResult) {
  const changes = [];

  // URL 是否变化
  if (crawlResult.finalUrl && crawlResult.finalUrl !== tool.url) {
    // 只记录域名级别的变化
    try {
      const oldDomain = new URL(tool.url).hostname;
      const newDomain = new URL(crawlResult.finalUrl).hostname;
      if (oldDomain !== newDomain) {
        changes.push({ field: 'url', old: tool.url, new: crawlResult.finalUrl, severity: 'high' });
      }
    } catch { /* ignore invalid URLs */ }
  }

  // 检查网站是否可访问
  if (crawlResult.error) {
    changes.push({ field: '_accessibility', old: 'ok', new: `error: ${crawlResult.error}`, severity: 'high' });
  }

  return changes;
}

/**
 * 主函数：爬取所有工具并检测变更
 * @returns {Object} 变更报告
 */
export async function crawlAndDetectChanges() {
  const tools = loadTools();
  const results = {
    crawledAt: new Date().toISOString(),
    totalTools: tools.length,
    checked: 0,
    errors: 0,
    changes: [],
    details: [],
  };

  for (const tool of tools) {
    console.log(`  [${results.checked + 1}/${tools.length}] 检查: ${tool.name} (${tool.url})`);

    const crawlResult = await crawlToolPage(tool.url);
    results.details.push({ toolId: tool.id, ...crawlResult });

    if (crawlResult.error) {
      results.errors++;
      console.log(`    ⚠️  错误: ${crawlResult.error}`);
    }

    const changes = diffToolData(tool, crawlResult);
    if (changes.length > 0) {
      results.changes.push({ toolId: tool.id, toolName: tool.name, changes });
      for (const c of changes) {
        console.log(`    🔄 变更: ${c.field} [${c.severity}]`);
      }
    }

    results.checked++;

    // 请求间隔
    if (results.checked < tools.length) {
      await new Promise((r) => setTimeout(r, CRAWL_DELAY_MS));
    }
  }

  return results;
}

/**
 * 生成变更报告的 Markdown 摘要
 */
export function formatCrawlReport(results) {
  const lines = [
    `## 🔍 工具网站变更检测报告`,
    `> 检测时间: ${results.crawledAt}`,
    `> 检测工具: ${results.checked}/${results.totalTools} | 错误: ${results.errors} | 变更: ${results.changes.length}`,
    ``,
  ];

  if (results.changes.length === 0) {
    lines.push('✅ 未检测到变更。');
    lines.push('');
  } else {
    lines.push('### 变更明细');
    lines.push('');
    lines.push('| 工具 | 字段 | 严重度 |');
    lines.push('|------|------|--------|');
    for (const change of results.changes) {
      for (const c of change.changes) {
        const emoji = c.severity === 'high' ? '🔴' : '🟡';
        lines.push(`| ${change.toolName} | ${c.field} | ${emoji} ${c.severity} |`);
      }
    }
    lines.push('');
  }

  // 错误列表
  if (results.errors > 0) {
    lines.push('### ⚠️ 访问错误');
    lines.push('');
    for (const d of results.details) {
      if (d.error) {
        lines.push(`- **${d.toolId}**: ${d.error} (${d.url})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

#!/usr/bin/env node
/**
 * 自动化运营编排脚本
 *
 * Usage:
 *   node scripts/ops.mjs check    # 检查内容新鲜度
 *   node scripts/ops.mjs refresh  # AI 批量刷新过期内容
 *   node scripts/ops.mjs crawl    # 爬取工具官网检测变更
 *   node scripts/ops.mjs report   # 生成完整运营周报
 *
 * Options:
 *   --json    输出 JSON 格式（供 CI 消费）
 *   --dry-run 模拟运行，不实际修改文件
 *   --tools   仅处理工具
 *   --scenarios 仅处理场景
 */

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = `${__dirname}/../reports/`;

import {
  loadTools, saveTools, loadScenarios, saveScenarios,
  findStaleTools, findStaleScenarios, getCategoryStats,
} from './lib/data.mjs';
import { crawlAndDetectChanges, formatCrawlReport } from './lib/crawler.mjs';
import { batchGenerateReviews, generateOpsAdvice } from './lib/ai.mjs';
import { STALENESS_DAYS, MONITOR_FIELDS } from './config.mjs';

// Ensure reports directory
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Parse args
const args = process.argv.slice(2);
const command = args[0];
const flags = {
  json: args.includes('--json'),
  dryRun: args.includes('--dry-run'),
  toolsOnly: args.includes('--tools'),
  scenariosOnly: args.includes('--scenarios'),
};

function log(msg) {
  if (!flags.json) console.log(msg);
}

function output(data) {
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ─── check: 内容新鲜度检查 ────────────────────────────────

async function checkFreshness() {
  log('🔍 正在检查内容新鲜度...\n');

  const staleTools = flags.scenariosOnly ? [] : findStaleTools(STALENESS_DAYS);
  const staleScenarios = flags.toolsOnly ? [] : findStaleScenarios(STALENESS_DAYS);

  if (!flags.json) {
    log(`📊 内容新鲜度报告`);
    log(`> 过期阈值: ${STALENESS_DAYS} 天 | 生成时间: ${new Date().toISOString()}`);
    log('');

    if (staleTools.length === 0 && staleScenarios.length === 0) {
      log('✅ 所有内容都很新鲜，无需更新！');
    }

    if (staleTools.length > 0) {
      log(`⚠️  过期工具: ${staleTools.length} 个`);
      log('| 工具 | ID | 最后更新 | 已过期天数 |');
      log('|------|-----|---------|-----------|');
      for (const t of staleTools) {
        log(`| ${t.name} | ${t.id} | ${t.updatedAt} | ${t._ageDays} 天 |`);
      }
      log('');
    }

    if (staleScenarios.length > 0) {
      log(`⚠️  过期场景: ${staleScenarios.length} 个`);
      log('| 场景 | ID | 最后更新 | 已过期天数 |');
      log('|------|-----|---------|-----------|');
      for (const s of staleScenarios) {
        log(`| ${s.name} | ${s.id} | ${s.updatedAt} | ${s._ageDays} 天 |`);
      }
      log('');
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    staleDaysThreshold: STALENESS_DAYS,
    staleTools: staleTools.map(({ name, id, updatedAt, _ageDays }) => ({ name, id, updatedAt, _ageDays })),
    staleScenarios: staleScenarios.map(({ name, id, updatedAt, _ageDays }) => ({ name, id, updatedAt, _ageDays })),
    totalStale: staleTools.length + staleScenarios.length,
  };

  // Write report to file
  const reportPath = `${REPORTS_DIR}freshness-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  log(`\n📄 报告已保存: ${reportPath}`);

  output(report);
  return report;
}

// ─── refresh: AI 批量刷新 ──────────────────────────────────

async function refreshContent() {
  if (flags.dryRun) {
    log('🏃 DRY RUN — 仅模拟，不实际修改文件\n');
  }

  const staleTools = flags.scenariosOnly ? [] : findStaleTools(STALENESS_DAYS);
  const staleScenarios = flags.toolsOnly ? [] : findStaleScenarios(STALENESS_DAYS);

  log('🤖 AI 批量刷新过期内容');
  log(`> 过期工具: ${staleTools.length} | 过期场景: ${staleScenarios.length}`);
  log('');

  const results = { tools: [], scenarios: [], refreshedAt: new Date().toISOString(), dryRun: flags.dryRun };

  // Refresh stale tools
  if (staleTools.length > 0) {
    log('📝 正在刷新工具评测...\n');
    const reviewResults = await batchGenerateReviews(staleTools);
    results.tools = reviewResults;

    if (!flags.dryRun) {
      // Apply results back to tools.json
      const allTools = loadTools();
      for (const r of reviewResults) {
        if (!r.success) continue;
        const tool = allTools.find((t) => t.id === r.toolId);
        if (tool) {
          Object.assign(tool, {
            description: r.review.description || tool.description,
            pricingDetail: r.review.pricingDetail || tool.pricingDetail,
            rating: r.review.rating || tool.rating,
            review: r.review.review || tool.review,
            tags: r.review.tags || tool.tags,
            updatedAt: new Date().toISOString().split('T')[0],
          });
        }
      }
      saveTools(allTools);
      log('\n✅ 已更新 tools.json');
    }
  }

  // Refresh stale scenarios (generate ops advice based on scenario analysis)
  if (staleScenarios.length > 0) {
    log('\n📝 正在更新场景数据...\n');
    if (!flags.dryRun) {
      const data = loadScenarios();
      for (const s of staleScenarios) {
        const scenario = data.scenarios.find((sc) => sc.id === s.id);
        if (scenario) {
          scenario.updatedAt = new Date().toISOString().split('T')[0];
        }
      }
      saveScenarios(data);
      results.scenarios = staleScenarios.map((s) => ({
        scenarioId: s.id,
        name: s.name,
        updated: true,
      }));
      log('✅ 已更新 scenarios.json');
    }
  }

  const resultPath = `${REPORTS_DIR}refresh-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), 'utf-8');
  log(`\n📄 刷新结果已保存: ${resultPath}`);

  output(results);
  return results;
}

// ─── crawl: 爬取工具官网检测变更 ────────────────────────────

async function crawlTools() {
  log('🌐 正在爬取工具官网检测变更...\n');

  const results = await crawlAndDetectChanges();
  const report = formatCrawlReport(results);

  if (!flags.json) {
    console.log(report);
  }

  const reportPath = `${REPORTS_DIR}crawl-${new Date().toISOString().split('T')[0]}.md`;
  fs.writeFileSync(reportPath, report, 'utf-8');
  log(`📄 爬取报告已保存: ${reportPath}`);

  output(results);
  return results;
}

// ─── report: 综合运营周报 ──────────────────────────────────

async function generateWeeklyReport() {
  log('📊 正在生成综合运营周报...\n');

  // Gather all data
  const staleTools = findStaleTools(STALENESS_DAYS);
  const staleScenarios = findStaleScenarios(STALENESS_DAYS);
  const categoryStats = getCategoryStats();
  const tools = loadTools();
  const { scenarios, roles } = loadScenarios();

  const totalTools = tools.length;
  const totalScenarios = scenarios.length;
  const staleCount = staleTools.length + staleScenarios.length;
  const healthScore = Math.round((1 - staleCount / (totalTools + totalScenarios)) * 100);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTools,
      totalScenarios,
      totalRoles: roles.length,
      staleContent: staleCount,
      contentHealthScore: healthScore,
    },
    categoryDistribution: categoryStats,
    staleDetails: {
      tools: staleTools.map(({ name, id, _ageDays }) => ({ name, id, _ageDays })),
      scenarios: staleScenarios.map(({ name, id, _ageDays }) => ({ name, id, _ageDays })),
    },
    recentUpdates: [...tools]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(({ name, id, updatedAt }) => ({ name, id, updatedAt })),
  };

  if (!flags.json) {
    log('═══════════════════════════════════════');
    log('  📊 运营周报');
    log('═══════════════════════════════════════');
    log(`  生成时间: ${report.generatedAt}`);
    log(`  内容健康度: ${healthScore}% (${staleCount}/${totalTools + totalScenarios} 过期)`);
    log('');
    log('  📦 内容概览:');
    log(`    工具: ${totalTools} | 场景: ${totalScenarios} | 角色: ${roles.length}`);
    log('');
    log('  📊 分类分布:');
    for (const [cat, count] of Object.entries(categoryStats)) {
      log(`    ${cat}: ${count}`);
    }
    log('');
    log('  🔄 最近更新:');
    for (const u of report.recentUpdates) {
      log(`    - ${u.name} (${u.updatedAt})`);
    }
    log('');
    log('═══════════════════════════════════════');
  }

  const reportPath = `${REPORTS_DIR}weekly-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  log(`📄 周报已保存: ${reportPath}`);

  output(report);
  return report;
}

// ─── Main ──────────────────────────────────────────────────

const COMMANDS = {
  check: checkFreshness,
  refresh: refreshContent,
  crawl: crawlTools,
  report: generateWeeklyReport,
};

async function main() {
  if (!command || !COMMANDS[command]) {
    console.log('Usage: node scripts/ops.mjs <check|refresh|crawl|report> [--json] [--dry-run] [--tools|--scenarios]');
    console.log('');
    console.log('Commands:');
    console.log('  check    Check content freshness');
    console.log('  refresh  AI batch refresh stale content reviews');
    console.log('  crawl    Crawl tool websites to detect changes');
    console.log('  report   Generate comprehensive weekly ops report');
    console.log('');
    console.log('Options:');
    console.log('  --json        Output JSON format (for CI consumption)');
    console.log('  --dry-run     Simulate without modifying files');
    console.log('  --tools       Only process tools');
    console.log('  --scenarios   Only process scenarios');
    process.exit(1);
  }

  try {
    await COMMANDS[command]();
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    if (!flags.json) console.error(err.stack);
    process.exit(1);
  }
}

main();

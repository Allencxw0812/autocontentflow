#!/usr/bin/env node
/**
 * 公众号文章 ↔ 网站工具 联动管理
 *
 * Usage:
 *   node scripts/wechat.mjs scan              # 扫描参考文章，智能匹配工具
 *   node scripts/wechat.mjs bind <文章> <工具ID> # 绑定文章到工具
 *   node scripts/wechat.mjs unbind <工具ID>    # 清除工具的文章链接
 *   node scripts/wechat.mjs list              # 列出所有工具的绑定状态
 *   node scripts/wechat.mjs deploy            # 一键提交推送部署
 */

import { loadTools, saveTools } from './lib/data.mjs';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BRAIN_DIR = path.resolve('../brain/AI工具实战课');
const ROOT = path.resolve('.');

function log(msg) { console.log(msg); }

// ─── 工具关键词映射（用于自动匹配） ─────────────────────────

const TOOL_KEYWORDS = {
  'kimi': ['kimi', '长文本', '长文档'],
  'deepseek': ['deepseek', '深度求索', 'deepthink', '深度思考', '推理'],
  'doubao': ['豆包'],
  'wenxin': ['文心一言', '文心'],
  'chatgpt': ['chatgpt', 'gpt', 'openai'],
  'jimeng': ['即梦', '绘画', '出图'],
  'tongyi-wanxiang': ['通义万相', '通义', '阿里'],
  'midjourney': ['midjourney', 'mj'],
  'wps-ai': ['wps', 'ppt', '演示'],
  'jianying': ['剪映', '剪辑'],
  'deepl': ['deepl', '翻译'],
  'feishu-minutes': ['飞书妙记', '飞书', '妙记', '会议记录'],
  'caiyun-translation': ['彩云小译', '彩云'],
  'xunfei-hearing': ['讯飞听见', '讯飞', '语音转文字'],
  'bi-ge': ['必剪', 'b站'],
  'kimi-ai-ppt': ['kimi ppt', 'ppt助手'],
  'gamma': ['gamma'],
  'notion-ai': ['notion'],
  'kling': ['可灵', '视频生成'],
  'yuanbao': ['元宝', '腾讯混元'],
  'tongyi-qianwen': ['通义千问', '千问'],
  'claude': ['claude', 'claude'],
  'gemini': ['gemini', '谷歌'],
  'mita-ai-search': ['秘塔', '秘塔ai', '法律', '搜索'],
  'suno': ['suno', '音乐', '作曲'],
  'canva-ai': ['canva', '设计'],
  'tencent-docs-ai': ['腾讯文档'],
  'cursor': ['cursor', '编程'],
  'meitu-ai': ['美图', '修图'],
  'tiangong-ai-search': ['天工', '天工ai'],
  'haimian-music': ['海绵音乐', '海绵'],
};

// ─── 扫描参考文章 ──────────────────────────────────────────

function scanArticles() {
  if (!fs.existsSync(BRAIN_DIR)) {
    console.log('⚠️  参考目录不存在: ' + BRAIN_DIR);
    return [];
  }

  const files = fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const articles = [];

  for (const f of files) {
    const content = fs.readFileSync(path.join(BRAIN_DIR, f), 'utf-8');
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    const title = frontmatter ? (frontmatter[1].match(/title:\s*(.+)/) || [])[1] : f;

    // 尝试匹配工具
    const lowerContent = content.toLowerCase();
    const matchedTools = [];

    for (const [toolId, keywords] of Object.entries(TOOL_KEYWORDS)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        matchedTools.push(toolId);
      }
    }

    articles.push({
      file: f,
      title: title || f.replace('.md', ''),
      matchedTools: [...new Set(matchedTools)],
    });
  }

  return articles;
}

// ─── scan 命令 ─────────────────────────────────────────────

function cmdScan() {
  const articles = scanArticles();
  const tools = loadTools();

  console.log(`📚 参考文章: ${articles.length} 篇\n`);

  // 显示匹配结果
  for (const a of articles) {
    const toolNames = a.matchedTools.map(id => {
      const t = tools.find(tool => tool.id === id);
      return t ? t.name : id;
    });

    console.log(`  ${a.title}`);
    if (toolNames.length > 0) {
      console.log(`    🔗 匹配工具: ${toolNames.join(', ')}`);
      console.log(`    💡 绑定命令: node scripts/wechat.mjs bind "${a.file}" ${a.matchedTools[0]}`);
    } else {
      console.log(`    ⚠️  未匹配到工具，建议手动绑定`);
    }
    console.log('');
  }
}

// ─── bind 命令 ─────────────────────────────────────────────

function cmdBind(articleFile, toolId) {
  if (!articleFile || !toolId) {
    console.error('❌ 用法: node scripts/wechat.mjs bind <文章文件名> <工具ID>');
    return;
  }

  const tools = loadTools();
  const tool = tools.find(t => t.id === toolId);
  if (!tool) {
    console.error(`❌ 工具不存在: ${toolId}`);
    console.log('可用: ' + tools.map(t => t.id).join(', '));
    return;
  }

  // 读取文章信息
  let articleTitle = '';
  const articlePath = path.join(BRAIN_DIR, articleFile);
  if (fs.existsSync(articlePath)) {
    const content = fs.readFileSync(articlePath, 'utf-8');
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    articleTitle = fm ? (fm[1].match(/title:\s*(.+)/) || [])[1] : articleFile;
  }

  // 公众号文章URL（用户需要手动填入实际链接）
  const url = process.env.WECHAT_URL || '#';

  // 清除旧的 # 占位链接
  tool.articles = tool.articles.filter(a => a.url !== '#');
  tool.articles.push({
    title: articleTitle || `${tool.name}使用指南`,
    url: url === '#' ? undefined : url,
  });

  saveTools(tools);
  console.log(`✅ 已绑定: ${tool.name} ← 《${articleTitle}》`);
  if (url === '#') {
    console.log('⚠️  请设置文章URL: WECHAT_URL=https://mp.weixin.qq.com/s/xxx node scripts/wechat.mjs bind ...');
  }
}

// ─── unbind 命令 ───────────────────────────────────────────

function cmdUnbind(toolId) {
  const tools = loadTools();
  const tool = tools.find(t => t.id === toolId);
  if (!tool) {
    console.error(`❌ 工具不存在: ${toolId}`);
    return;
  }

  tool.articles = [];
  saveTools(tools);
  console.log(`✅ 已清除 ${tool.name} 的所有文章链接`);
}

// ─── list 命令 ─────────────────────────────────────────────

function cmdList() {
  const tools = loadTools();
  const linked = tools.filter(t => t.articles?.some(a => a.url && a.url !== '#'));
  const empty = tools.filter(t => !t.articles?.some(a => a.url && a.url !== '#'));

  console.log(`📊 文章绑定概况\n`);
  console.log(`  ✅ 已绑定: ${linked.length}/${tools.length}`);
  console.log(`  ❌ 待绑定: ${empty.length}/${tools.length}\n`);

  if (linked.length > 0) {
    console.log('=== 已绑定 ===');
    for (const t of linked) {
      for (const a of t.articles) {
        console.log(`  ${t.name} → ${a.title}  ${a.url !== '#' ? '🔗' : '⚠️'}`);
      }
    }
    console.log('');
  }

  console.log('=== 待绑定 ===');
  console.log(empty.map(t => `  ${t.id} | ${t.name}`).join('\n'));
  console.log(`\n💡 运行 node scripts/wechat.mjs scan 查看可匹配的文章`);
}

// ─── deploy 命令 ────────────────────────────────────────────

function cmdDeploy() {
  console.log('🚀 构建并部署...\n');

  try {
    console.log('1/3 构建...');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

    console.log('\n2/3 提交...');
    execSync('git add -A', { cwd: ROOT });
    const status = execSync('git status --short', { cwd: ROOT, encoding: 'utf-8' });
    if (status.trim()) {
      const today = new Date().toISOString().split('T')[0];
      execSync(`git commit -m "update: article bindings ${today}"`, { cwd: ROOT });
    } else {
      console.log('   (无变更，跳过)');
    }

    console.log('\n3/3 推送...');
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });

    console.log('\n✅ 部署完成！');
    console.log('📍 https://allencxw0812.github.io/autocontentflow/');
  } catch (err) {
    console.error(`\n❌ 部署失败: ${err.message}`);
  }
}

// ─── Main ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

const COMMANDS = {
  scan: cmdScan,
  bind: () => cmdBind(args[1], args[2]),
  unbind: () => cmdUnbind(args[1]),
  list: cmdList,
  deploy: cmdDeploy,
};

async function main() {
  if (!cmd || !COMMANDS[cmd]) {
    console.log('Usage: node scripts/wechat.mjs <scan|bind|unbind|list|deploy>');
    console.log('');
    console.log('公众号 ↔ 网站 联动管理工具');
    console.log('');
    console.log('Commands:');
    console.log('  scan                 扫描参考文章，智能匹配工具');
    console.log('  bind <文章.md> <工具ID>  绑定文章到工具');
    console.log('  unbind <工具ID>       清除工具的文章链接');
    console.log('  list                 列出所有工具的绑定状态');
    console.log('  deploy               一键构建+提交+推送部署');
    process.exit(1);
  }

  try {
    await COMMANDS[cmd]();
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();

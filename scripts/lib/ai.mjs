/**
 * DeepSeek API 调用封装 — AI 生成评测内容
 * DeepSeek 使用 OpenAI 兼容格式
 */
import { AI_MODEL, AI_API_URL, AI_BATCH_SIZE } from '../config.mjs';

function getApiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('缺少 DEEPSEEK_API_KEY 环境变量');
  return key;
}

/** 调用 DeepSeek API（OpenAI 兼容格式） */
export async function callAI({ system, messages, maxTokens = 4096, temperature = 0.7 }) {
  const apiKey = getApiKey();

  // 将 system prompt 合并到 messages 数组（OpenAI 格式）
  const fullMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const body = {
    model: AI_MODEL,
    messages: fullMessages,
    max_tokens: maxTokens,
    temperature,
  };

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API 错误 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * 为指定工具生成评测文案
 * @param {Object} tool - 工具对象
 * @param {Object} crawlInfo - 爬虫信息（可选）
 * @returns {Object} 生成的评测内容
 */
export async function generateToolReview(tool, crawlInfo = null) {
  const toolSummary = JSON.stringify({
    name: tool.name,
    tagline: tool.tagline,
    description: tool.description,
    pricing: tool.pricing,
    pricingDetail: tool.pricingDetail,
    category: tool.category,
    platforms: tool.platforms,
    currentRating: tool.rating,
    currentReview: tool.review,
    crawlInfo: crawlInfo
      ? { title: crawlInfo.title, description: crawlInfo.description }
      : undefined,
  }, null, 2);

  const system = `你是AI工具评测专家，为中文用户撰写AI工具评测。

评测要求：
1. 语言口语化、接地气，像朋友推荐而非官方文档
2. 突出对普通用户最实用的信息
3. 评价客观，优点和缺点都要提
4. 评分1-5分，精确到0.5
5. 输出必须是合法JSON，不要包含markdown代码块标记`;

  const prompt = `请为以下AI工具生成更新后的评测，返回JSON：

{
  "description": "工具简介（80-150字，突出核心卖点和适用人群）",
  "pricingDetail": "价格描述（一句话，包含免费版和付费版信息）",
  "rating": {
    "coreAdvantage": 数字(1-5),
    "easeOfUse": 数字(1-5),
    "chineseFriendly": 数字(1-5)
  },
  "review": {
    "coreAdvantage": "核心优势（1-2句话，讲清楚这个工具最厉害的地方）",
    "painPoints": "痛点（1-2句话，用起来哪里不爽）",
    "targetUsers": "适合人群（1句话，谁用最合适）"
  },
  "tags": ["标签数组，3-5个中文标签"]
}

工具信息：
${toolSummary}

只返回JSON，不要其他内容。`;

  console.log(`  🤖 正在为 ${tool.name} 生成评测...`);
  const result = await callAI({
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 2048,
  });

  // 解析 JSON（处理可能的 markdown 代码块）
  let jsonStr = result.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\n/, '').replace(/\n```$/, '');
  }
  return JSON.parse(jsonStr);
}

/**
 * 批量生成工具评测
 * @param {Array} tools - 需要更新的工具数组
 * @returns {Array<{toolId: string, review: Object}>}
 */
export async function batchGenerateReviews(tools) {
  const results = [];

  for (let i = 0; i < tools.length; i += AI_BATCH_SIZE) {
    const batch = tools.slice(i, i + AI_BATCH_SIZE);
    console.log(`\n📝 批次 ${Math.floor(i / AI_BATCH_SIZE) + 1}/${Math.ceil(tools.length / AI_BATCH_SIZE)}`);

    const batchResults = await Promise.allSettled(
      batch.map((tool) => generateToolReview(tool))
    );

    for (let j = 0; j < batch.length; j++) {
      const r = batchResults[j];
      if (r.status === 'fulfilled') {
        results.push({ toolId: batch[j].id, review: r.value, success: true });
        console.log(`  ✅ ${batch[j].name} 生成成功`);
      } else {
        results.push({ toolId: batch[j].id, error: r.reason.message, success: false });
        console.log(`  ❌ ${batch[j].name} 生成失败: ${r.reason.message}`);
      }
    }
  }

  return results;
}

/**
 * 生成运营建议（基于搜索数据）
 * @param {Array} searchStats - 搜索统计数据
 */
export async function generateOpsAdvice(searchStats) {
  const system = `你是AI工具网站运营顾问。基于用户搜索数据分析内容缺口和选题方向。`;

  const prompt = `基于以下搜索数据分析，给出3-5条运营建议（选题方向、工具推荐、内容优化等）。

搜索数据（top 关键词及频次）：
${JSON.stringify(searchStats, null, 2)}

返回JSON格式：
{
  "advice": [
    {
      "priority": "high|mid",
      "title": "建议标题",
      "rationale": "依据",
      "action": "具体行动"
    }
  ],
  "summary": "一句话总结当前运营状况"
}`;

  console.log('  🤖 正在生成运营建议...');
  const result = await callAI({
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 2048,
  });

  let jsonStr = result.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\n/, '').replace(/\n```$/, '');
  }
  return JSON.parse(jsonStr);
}

/**
 * 生成工具对比文章大纲
 * @param {Array} toolNames - 需要对比的工具名数组
 */
export async function generateComparisonOutline(toolNames) {
  const system = `你是AI工具评测专家，擅长撰写工具对比文章。`;

  const prompt = `为以下工具对比文章生成大纲（用于SEO长尾关键词页面）：

对比工具：${toolNames.join(' vs ')}

返回JSON：
{
  "title": "对比文章标题（含SEO关键词）",
  "seoDescription": "SEO描述（120-150字）",
  "sections": [
    { "heading": "章节标题", "content": "2-3句话内容概述" }
  ],
  "verdict": "一句话对比结论"
}`;

  console.log(`  🤖 正在生成 ${toolNames.join(' vs ')} 对比大纲...`);
  const result = await callAI({
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 2048,
  });

  let jsonStr = result.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\n/, '').replace(/\n```$/, '');
  }
  return JSON.parse(jsonStr);
}

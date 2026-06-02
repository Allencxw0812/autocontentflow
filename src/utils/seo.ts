import type { Tool, Scenario, JsonLdSoftwareApplication, JsonLdHowTo, JsonLdItemList } from '../types/index';

const SITE_URL = 'https://ai-website.pages.dev';

/** 生成工具页面的JSON-LD（SoftwareApplication） */
export function generateToolJsonLd(tool: Tool): JsonLdSoftwareApplication {
  const priceMap: Record<string, string> = {
    free: '0',
    freemium: '0',
    paid: '1',
  };

  const avgRating = (
    (tool.rating.coreAdvantage + tool.rating.easeOfUse + tool.rating.chineseFriendly) /
    3
  ).toFixed(1);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.slug}`,
    applicationCategory: tool.category.join(', '),
    operatingSystem: tool.platforms.join(', '),
    offers: {
      '@type': 'Offer',
      price: priceMap[tool.pricing] || '0',
      priceCurrency: 'CNY',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      bestRating: '5',
      ratingCount: '1',
    },
  };
}

/** 生成场景页面的JSON-LD（HowTo） */
export function generateScenarioJsonLd(scenario: Scenario): JsonLdHowTo {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: scenario.name,
    description: scenario.description,
    step: scenario.workflow.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.description,
    })),
  };
}

/** 生成列表页的JSON-LD（ItemList） */
export function generateItemListJsonLd(
  items: Array<{ name: string; slug: string }>,
  basePath: string
): JsonLdItemList {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `${SITE_URL}${basePath}/${item.slug}`,
    })),
  };
}

/** 生成网站首页的JSON-LD（WebSite） */
export function generateWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '普通人AI实战笔记',
    url: SITE_URL,
    description: '帮你找到真正好用的AI工具。按场景找工具、真实评测、免费替代。',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

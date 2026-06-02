// ============ 枚举 ============

export type PricingType = 'free' | 'freemium' | 'paid';
export type ChineseSupportLevel = 'native' | 'partial' | 'none';
export type Platform = 'web' | 'ios' | 'android' | 'windows' | 'mac';
export type CategoryId = 'ai-chat' | 'ai-image' | 'ai-writing' | 'ai-code' | 'ai-video' | 'ai-audio' | 'ai-productivity';

// ============ 工具相关 ============

export interface Article {
  title: string;
  url: string;
}

export interface ToolRating {
  coreAdvantage: number;
  easeOfUse: number;
  chineseFriendly: number;
}

export interface ToolReview {
  coreAdvantage: string;
  painPoints: string;
  targetUsers: string;
}

export interface TutorialStep {
  step: number;
  title: string;
  content: string;
  prompt?: string;       // 可复制提示词
  tips?: string[];       // 使用技巧
  link?: {               // 跳转链接
    label: string;
    url: string;
  };
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string;
  url: string;
  pricing: PricingType;
  pricingDetail?: string;
  category: CategoryId[];
  tags: string[];
  chineseSupport: ChineseSupportLevel;
  needsVPN: boolean;
  freeQuota: boolean;
  platforms: Platform[];
  rating: ToolRating;
  review: ToolReview;
  tutorial?: TutorialStep[];
  similarTools: string[];
  applicableScenarios: string[];
  freeAlternativeTo: string[];
  articles?: Article[];
  publishedAt: string;
  updatedAt: string;
}

export interface ToolsData {
  tools: Tool[];
}

// ============ 场景相关 ============

export interface Role {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  toolId: string;
}

export interface ComparisonItem {
  toolId: string;
  coreAdvantage: string;
  easeOfUse: string;
  freeQuota: string;
}

export interface CaseStudy {
  title: string;
  summary: string;
  url: string;
}

export interface FreeAlternative {
  paidToolId: string;
  freeToolId: string;
  note: string;
}

export interface ScenarioSEO {
  title: string;
  description: string;
}

export interface Scenario {
  id: string;
  name: string;
  slug: string;
  role: string;
  icon: string;
  tagline: string;
  description: string;
  coverImage?: string;
  workflow: WorkflowStep[];
  tools: string[];
  comparison?: ComparisonItem[];
  pitfalls?: string[];
  caseStudy?: CaseStudy;
  freeAlternatives?: FreeAlternative[];
  relatedScenarios: string[];
  articles?: Article[];
  seo: ScenarioSEO;
  publishedAt: string;
  updatedAt: string;
}

export interface ScenariosData {
  scenarios: Scenario[];
  roles: Role[];
}

// ============ 页面Props ============

export interface PageMeta {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
}

// ============ JSON-LD ============

export interface JsonLdSoftwareApplication {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    bestRating: string;
    ratingCount: string;
  };
}

export interface JsonLdHowTo {
  '@context': 'https://schema.org';
  '@type': 'HowTo';
  name: string;
  description: string;
  step: Array<{
    '@type': 'HowToStep';
    name: string;
    text: string;
  }>;
}

export interface JsonLdItemList {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    url: string;
  }>;
}

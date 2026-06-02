/** 格式化日期为中文格式 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/** 生成星级HTML（使用Unicode星号） */
export function formatRating(rating: number): string {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return '★'.repeat(full) + (hasHalf ? '☆' : '') + '☆'.repeat(empty);
}

/** 格式化价格标签 */
export function formatPricing(pricing: string): { label: string; color: string } {
  switch (pricing) {
    case 'free':
      return { label: '免费', color: 'text-green-700 bg-green-50 border-green-200' };
    case 'freemium':
      return { label: '免费增值', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    case 'paid':
      return { label: '付费', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    default:
      return { label: '未知', color: 'text-gray-700 bg-gray-50 border-gray-200' };
  }
}

/** 格式化中文支持等级 */
export function formatChineseSupport(level: string): { label: string; color: string } {
  switch (level) {
    case 'native':
      return { label: '原生中文', color: 'text-green-600 bg-green-50' };
    case 'partial':
      return { label: '部分支持', color: 'text-yellow-600 bg-yellow-50' };
    case 'none':
      return { label: '不支持', color: 'text-red-600 bg-red-50' };
    default:
      return { label: '未知', color: 'text-gray-600 bg-gray-50' };
  }
}

/** 计算综合评分 */
export function getOverallRating(rating: { coreAdvantage: number; easeOfUse: number; chineseFriendly: number }): number {
  return Math.round(((rating.coreAdvantage + rating.easeOfUse + rating.chineseFriendly) / 3) * 10) / 10;
}

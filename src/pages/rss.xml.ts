import { getAllTools, getAllScenarios } from '../utils/data';

export const GET = () => {
  const SITE_URL = 'https://allencxw0812.github.io/autocontentflow';
  const SITE_TITLE = '普通人AI实战笔记';
  const SITE_DESC = '帮你找到真正好用的AI工具。按场景找工具、真实评测、免费替代。';

  const tools = getAllTools();
  const scenarios = getAllScenarios();

  // Merge all items as feed entries
  const items = [
    ...tools.map((t) => ({
      title: `${t.name} — ${t.tagline}`,
      link: `${SITE_URL}/tools/${t.slug}`,
      description: t.description,
      pubDate: new Date(t.updatedAt).toUTCString(),
      category: t.category.join(', '),
    })),
    ...scenarios.map((s) => ({
      title: `${s.name} — ${s.tagline}`,
      link: `${SITE_URL}/scenarios/${s.slug}`,
      description: s.description,
      pubDate: new Date(s.updatedAt).toUTCString(),
      category: s.role,
    })),
  ].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items.map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <category>${escapeXml(item.category)}</category>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

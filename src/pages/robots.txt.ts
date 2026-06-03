// Dynamic robots.txt generation
export const GET = () => {
  const SITE_URL = 'https://allencxw0812.github.io/autocontentflow';

  const robotsTxt = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${SITE_URL}/sitemap-index.xml

# Crawl-delay
Crawl-delay: 10

# Private/admin pages
Disallow: /admin/*
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};

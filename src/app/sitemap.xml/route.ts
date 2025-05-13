
import { getAllNewsArticles } from '@/lib/data';
import type { NewsArticle } from '@/lib/types';

const URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

function generateSiteMap(articles: NewsArticle[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <!-- Add the homepage -->
     <url>
       <loc>${URL}</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <!-- Add other static pages if any, e.g., /faq, /terms -->
      <url>
       <loc>${URL}/faq</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>monthly</changefreq>
       <priority>0.5</priority>
     </url>
      <url>
       <loc>${URL}/terms</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>monthly</changefreq>
       <priority>0.5</priority>
     </url>
     ${articles
       .map(({ id, publishedDate }) => {
         return `
       <url>
           <loc>${`${URL}/article/${id}`}</loc>
           <lastmod>${publishedDate || new Date().toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

export async function GET() {
  const articles = await getAllNewsArticles();
  const body = generateSiteMap(articles);

  return new Response(body, {
    status: 200,
    headers: {
      'Cache-control': 'public, s-maxage=86400, stale-while-revalidate', // Cache for 1 day
      'content-type': 'application/xml',
    },
  });
}

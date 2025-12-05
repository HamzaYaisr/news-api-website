const BACKEND = "https://news-backend-teal.vercel.app";

const sources = [
  { url: `https://newsapi.org/v2/top-headlines?country=us`, tag: 'world' },
  { url: `https://newsapi.org/v2/top-headlines?country=gb`, tag: 'world' },
  { url: `https://newsapi.org/v2/top-headlines?category=business`, tag: 'business' },
  { url: `https://newsapi.org/v2/top-headlines?category=technology`, tag: 'technology' },
  { url: `https://newsapi.org/v2/top-headlines?category=sports`, tag: 'sports' },
  { url: `https://newsapi.org/v2/top-headlines?category=entertainment`, tag: 'entertainment' },
  { url: `https://newsapi.org/v2/top-headlines?category=science`, tag: 'science' },
  { url: `https://newsapi.org/v2/top-headlines?category=health`, tag: 'health' },
  { url: `https://newsapi.org/v2/everything?q=world&sortBy=publishedAt&pageSize=50`, tag: 'world' },
];

let allArticles = [];
let carouselInterval = null;

async function fetchAllNews() {
  try {
    const requests = sources.map(s => 
      fetch(`${BACKEND}/api/news?endpoint=${encodeURIComponent(s.url)}`)
        .then(r => r.json())
        .then(json => ({ json, tag: s.tag }))
        .catch(() => ({ json: null, tag: s.tag }))
    );

    const results = await Promise.all(requests);

    let combined = [];
    results.forEach(r => {
      if (r.json && Array.isArray(r.json.articles)) {
        combined = combined.concat(r.json.articles.map(a => ({ ...a, _category: r.tag })));
      }
    });

    const seen = new Set();
    const unique = [];
    for (const art of combined) {
      const key = `${art.title}__${(art.source && art.source.name) || ''}`;
      if (!seen.has(key) && art.title) {
        seen.add(key);
        unique.push(art);
      }
    }

    unique.sort(() => Math.random() - 0.5);
    allArticles = unique;

    renderArticles(allArticles);
    setupNavHandlers();

  } catch (err) {
    console.error('Failed to fetch news:', err);
    document.body.innerHTML = '<p style="padding:20px;">Failed to load news.</p>';
  }
}

// rest of your rendering & nav code stays the same...

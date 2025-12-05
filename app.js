const BACKEND = "https://news-backend-teal.vercel.app";

// List of news sources with category tags
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

// Fetch all news via Vercel backend
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

    // Deduplicate articles
    const seen = new Set();
    const unique = [];
    for (const art of combined) {
      const key = `${art.title}__${(art.source && art.source.name) || ''}`;
      if (!seen.has(key) && art.title) {
        seen.add(key);
        unique.push(art);
      }
    }

    // Shuffle for variety
    unique.sort(() => Math.random() - 0.5);
    allArticles = unique;

    renderArticles(allArticles);
    setupNavHandlers();

  } catch (err) {
    console.error('Failed to fetch news:', err);
    document.body.innerHTML = '<p style="padding:20px;">Failed to load news.</p>';
  }
}

// Render articles (carousel + featured + grid)
function renderArticles(articles) {
  // Clear old carousel interval
  if (carouselInterval) clearInterval(carouselInterval);

  // --- Carousel ---
  const carousel = document.getElementById('carousel');
  const carouselSlides = articles.slice(0, 5);
  if (carouselSlides.length === 0) {
    carousel.innerHTML = `<div class="slide active"><img src="https://via.placeholder.com/800x400"><div class="info"><h2>No articles</h2><p>No data</p></div></div>`;
  } else {
    carousel.innerHTML = carouselSlides.map((article, i) => `
      <div class="slide ${i === 0 ? 'active' : ''}">
        <img src="${article.urlToImage || 'https://via.placeholder.com/800x400'}" alt="">
        <div class="info">
          <h2>${article.title}</h2>
          <p>${article.description || ''}</p>
        </div>
      </div>
    `).join('');

    // Autoplay carousel
    let current = 0;
    const slides = document.querySelectorAll('.carousel .slide');
    if (slides.length > 1) {
      carouselInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
      }, 4000);
    }
  }

  // --- Featured ---
  const featured = document.getElementById('featured');
  const featuredItems = articles.slice(5, 9);
  featured.innerHTML = featuredItems.map(article => `
    <div class="card" onclick="window.open('${article.url}','_blank')">
      <img src="${article.urlToImage || 'https://via.placeholder.com/600x300'}" alt="">
      <div class="info">
        <h2>${article.title}</h2>
        <p>${article.description || ''}</p>
      </div>
    </div>
  `).join('') || `<p style="margin:20px;">No featured articles for this category.</p>`;

  // --- Grid ---
  const grid = document.getElementById('newsGrid');
  grid.innerHTML = articles.slice(9).map(article => `
    <div class="card" onclick="window.open('${article.url}','_blank')">
      <img src="${article.urlToImage || 'https://via.placeholder.com/400x200'}" alt="">
      <div class="info">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
      </div>
    </div>
  `).join('') || `<p style="margin:20px;">No articles in this category.</p>`;
}

// Setup nav links to filter categories
function setupNavHandlers() {
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = a.getAttribute('data-category') || 'all';

      // Highlight active link
      navLinks.forEach(x => x.classList.remove('active'));
      a.classList.add('active');

      if (cat === 'all') {
        renderArticles(allArticles);
        document.getElementById('carousel').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (cat === 'featured') {
        document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Filter by _category
      const filtered = allArticles.filter(art => art._category === cat);

      // Fallback: keyword search if nothing found
      renderArticles(filtered.length ? filtered : allArticles.filter(art => {
        const txt = `${art.title || ''} ${art.description || ''} ${art.content || ''}`.toLowerCase();
        return txt.includes(cat);
      }));

      document.getElementById('newsGrid').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// Initial fetch
fetchAllNews();

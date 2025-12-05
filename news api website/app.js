const API_KEY = 'a55b03c0e7214ce48d4fca65895850ee';

// list of endpoints with an associated category tag
const sources = [
  { url: `https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`, tag: 'world' },
  { url: `https://newsapi.org/v2/top-headlines?country=gb&apiKey=${API_KEY}`, tag: 'world' },
  { url: `https://newsapi.org/v2/top-headlines?category=business&apiKey=${API_KEY}`, tag: 'business' },
  { url: `https://newsapi.org/v2/top-headlines?category=technology&apiKey=${API_KEY}`, tag: 'technology' },
  { url: `https://newsapi.org/v2/top-headlines?category=sports&apiKey=${API_KEY}`, tag: 'sports' },
  { url: `https://newsapi.org/v2/top-headlines?category=entertainment&apiKey=${API_KEY}`, tag: 'entertainment' },
  { url: `https://newsapi.org/v2/top-headlines?category=science&apiKey=${API_KEY}`, tag: 'science' },
  { url: `https://newsapi.org/v2/top-headlines?category=health&apiKey=${API_KEY}`, tag: 'health' },
  { url: `https://newsapi.org/v2/everything?q=world&sortBy=publishedAt&pageSize=50&apiKey=${API_KEY}`, tag: 'world' },
];

let allArticles = []; // global store of articles (tagged)
let carouselInterval = null;

async function fetchAllNews() {
  try {
    // fetch each source and tag articles with the source tag
    const requests = sources.map(s => fetch(s.url).then(r => r.json()).then(json => ({ json, tag: s.tag })).catch(e => ({ json: null, tag: s.tag })));
    const results = await Promise.all(requests);

    let combined = [];
    results.forEach(r => {
      if (r.json && Array.isArray(r.json.articles)) {
        // tag each article with category
        const tagged = r.json.articles.map(a => ({ ...a, _category: r.tag }));
        combined = combined.concat(tagged);
      }
    });

    // dedupe by title + source.name (safer)
    const seen = new Set();
    const unique = [];
    for (const art of combined) {
      const key = `${art.title}__${(art.source && art.source.name) || ''}`;
      if (!seen.has(key) && art.title) {
        seen.add(key);
        unique.push(art);
      }
    }

    // shuffle for variety
    unique.sort(() => Math.random() - 0.5);

    allArticles = unique; // store globally
    console.log('Total articles stored:', allArticles.length);

    // render initial home (all)
    renderArticles(allArticles);
    setupNavHandlers(); // attach nav handlers after we have data
  } catch (err) {
    console.error('Failed to fetch news:', err);
    document.body.innerHTML = '<p style="padding:20px;">Failed to load news.</p>';
  }
}

function renderArticles(articles) {
  // clear old interval if any
  if (carouselInterval) {
    clearInterval(carouselInterval);
    carouselInterval = null;
  }

  // --- Carousel (first 5 items) ---
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

    // autoplay
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

  // --- Featured (next 4 stories) ---
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

  // --- Grid News (remaining stories) ---
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

// attach handlers to nav links so they filter and scroll
function setupNavHandlers() {
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = a.getAttribute('data-category') || 'all';

      // highlight active link (simple)
      navLinks.forEach(x => x.classList.remove('active'));
      a.classList.add('active');

      if (cat === 'all') {
        renderArticles(allArticles);
        // scroll to top / carousel
        document.getElementById('carousel').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (cat === 'featured') {
        // scroll down to featured section, keep displayed articles (do nothing special)
        document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // filter by category tag stored on articles
      const filtered = allArticles.filter(art => {
        // Some articles were tagged 'world' but might also be relevant to others; match by _category
        return art._category === cat;
      });

      // If filtered is empty, try fuzzy match by title/content keywords as fallback
      if (filtered.length === 0) {
        const fallback = allArticles.filter(art => {
          const txt = `${art.title || ''} ${art.description || ''} ${art.content || ''}`.toLowerCase();
          return txt.includes(cat);
        });
        renderArticles(fallback.length ? fallback : []);
      } else {
        renderArticles(filtered);
      }

      // scroll to grid so user sees the results
      document.getElementById('newsGrid').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// initial fetch
fetchAllNews();

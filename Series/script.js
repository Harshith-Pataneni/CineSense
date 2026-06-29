
const API_KEY = '695f58d4f7262f94456eb8863dfacbde';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';

const platforms = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Prime Video' },
  { id: 122, name: 'Hotstar' },
  { id: 237, name: 'SonyLIV' },
  { id: 232, name: 'Zee5' }
];

let genres = [];
let selectedGenres = new Set();
let selectedPlatforms = new Set();

const genreGrid = document.getElementById('genreGrid');
const platformGrid = document.getElementById('platformGrid');
const showResultsBtn = document.getElementById('showResultsBtn');
const seriesList = document.getElementById('seriesList');


function renderGenres() {
  genreGrid.innerHTML = genres.map((genre) => {
    const active = selectedGenres.has(genre.id) ? 'active' : '';
    return `<button class="genre-item ${active}" data-id="${genre.id}">${genre.name}</button>`;
  }).join('');

  document.querySelectorAll('.genre-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      if (selectedGenres.has(id)) {
        selectedGenres.delete(id);
        btn.classList.remove('active');
      } else {
        selectedGenres.add(id);
        btn.classList.add('active');
      }
    });
  });
}

function renderPlatforms() {
  platformGrid.innerHTML = platforms.map((platform) => {
    const active = selectedPlatforms.has(platform.id) ? 'active' : '';
    return `<button class="platform-item ${active}" data-id="${platform.id}">${platform.name}</button>`;
  }).join('');

  document.querySelectorAll('.platform-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      if (selectedPlatforms.has(id)) {
        selectedPlatforms.delete(id);
        btn.classList.remove('active');
      } else {
        selectedPlatforms.add(id);
        btn.classList.add('active');
      }
    });
  });
}

async function fetchGenres() {
  try {
    const response = await fetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=en`);
    const data = await response.json();
    genres = data.genres;
    renderGenres();
  } catch (error) {
    console.error('Error fetching genres:', error);
  }
}

async function fetchSeriesForPlatform(platformId) {
  const genreIds = Array.from(selectedGenres).join(',');
  const promises = [];

  if (platformId === 122) {
    const providers = [122, 315];
    providers.forEach((provider) => {
      for (let page = 1; page <= 10; page++) {
        const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}${genreIds ? `&with_genres=${genreIds}` : ''}&with_watch_providers=${provider}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
        promises.push(fetch(url).then((res) => res.json()).then((data) => data.results || []));
      }
    });
  } else {
    for (let page = 1; page <= 10; page++) {
      const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}${genreIds ? `&with_genres=${genreIds}` : ''}&with_watch_providers=${platformId}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
      promises.push(fetch(url).then((res) => res.json()).then((data) => data.results || []));
    }
  }

  const allResults = await Promise.all(promises);
  const combined = allResults.flat();
  const unique = combined.filter((item, index, self) => self.findIndex((show) => show.id === item.id) === index);
  return { platformId, results: unique.slice(0, 80) };
}

function displaySeries(platformResults) {
  seriesList.innerHTML = '';

  if (platformResults.length === 0 || platformResults.every((p) => p.results.length === 0)) {
    seriesList.innerHTML = '<p class="hint">Please select at least one platform.</p>';
    return;
  }

  platformResults.forEach(({ platformId, results }) => {
    const platform = platforms.find((p) => p.id === platformId);
    if (results.length > 0) {
      const section = document.createElement('div');
      section.className = 'platform-section';
      section.style.marginBottom = '60px';
      section.innerHTML = `
        <h2 class="platform-title" style="text-align: center; margin-bottom: 20px;">${platform.name}</h2>
        <div style="height: 500px; overflow-y: auto; overflow-x: hidden;">
          <div class="cards-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;">
            ${results.map((show) => `
              <div class="series-card">
                <img class="series-poster" src="${show.poster_path ? IMAGE_BASE_URL + show.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${show.name}">
                <div class="series-info">
                  <h3 class="series-title">${show.name}</h3>
                  <p class="series-year">${show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A'}</p>
                  <p class="series-rating">⭐ ${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      seriesList.appendChild(section);
    }
  });
}

async function showResults() {
  if (selectedPlatforms.size === 0) {
    seriesList.innerHTML = '<p class="hint">Please select at least one platform.</p>';
    return;
  }

  seriesList.innerHTML = '<p class="hint">Loading...</p>';

  try {
    const promises = Array.from(selectedPlatforms).map(fetchSeriesForPlatform);
    const results = await Promise.all(promises);
    displaySeries(results);
  } catch (error) {
    console.error('Error fetching series:', error);
    seriesList.innerHTML = '<p class="hint">Error loading series. Please try again.</p>';
  }
}

showResultsBtn.addEventListener('click', showResults);
fetchGenres();
renderPlatforms();
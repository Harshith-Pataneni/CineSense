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
const movieList = document.getElementById('movieList');
const pickRandomBtn = document.getElementById('pickRandomBtn');
const randomMovieModal = document.getElementById('randomMovieModal');
const closeModal = document.getElementById('closeModal');
const reRandomizeBtn = document.getElementById('reRandomizeBtn');
const randomMoviesContainer = document.getElementById('randomMoviesContainer');

let allFilteredMovies = []; // Store all filtered movies for random selection

function injectModalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .modal {
      position: fixed;
      inset: 0;
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      padding: 20px;
      overflow: auto;
    }

    .modal-content {
      position: relative;
      width: min(90%, 1080px);
      max-width: 1080px;
      max-height: 88vh;
      background: #121212;
      color: #f5f5f5;
      border-radius: 18px;
      padding: 26px 24px 20px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-content h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #fff;
    }

    .close-btn {
      position: absolute;
      top: 18px;
      right: 18px;
      font-size: 28px;
      color: #ccc;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .close-btn:hover {
      color: #fff;
    }

    .platform-recommendations {
      display: flex;
      gap: 18px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
    }

    .platform-recommendations::-webkit-scrollbar {
      height: 8px;
    }

    .platform-recommendations::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.24);
      border-radius: 999px;
    }

    .platform-section {
      flex: 0 0 280px;
      min-width: 280px;
      background: #212d3f;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .platform-name {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }

    .random-movie-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .random-movie-card img {
      width: 100%;
      height: auto;
      border-radius: 12px;
      object-fit: cover;
      min-height: 320px;
      background: #222;
    }

    .random-movie-card h4 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.3;
      color: #fff;
    }

    .random-movie-card p {
      margin: 0;
      color: #ccc;
      font-size: 0.94rem;
    }

    .modal-actions {
      display: flex;
      justify-content: center;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .modal-content {
      animation: modalFade 0.25s ease-out both;
    }

    @keyframes modalFade {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

async function fetchGenres() {
  try {
    const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en`);
    const data = await response.json();
    genres = data.genres;
    renderGenres();
  } catch (error) {
    console.error('Error fetching genres:', error);
  }
}

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

async function fetchMoviesForPlatform(platformId) {
  const genreIds = Array.from(selectedGenres).join(',');
  const genreParam = genreIds ? `&with_genres=${genreIds}` : '';
  let promises = [];

  if (platformId === 122 || platformId === 315) {
    const providers = [122, 315];
    providers.forEach(provider => {
      for (let page = 1; page <= 10; page++) {
        const movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}${genreParam}&with_watch_providers=${provider}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
        promises.push(fetch(movieUrl).then(res => res.json()).then(data => data.results || []));

        const tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_watch_providers=${provider}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
        promises.push(fetch(tvUrl).then(res => res.json()).then(data => data.results || []));
      }
    });
  } else {
    for (let page = 1; page <= 10; page++) {
      const movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}${genreParam}&with_watch_providers=${platformId}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
      promises.push(fetch(movieUrl).then(res => res.json()).then(data => data.results || []));

      const tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_watch_providers=${platformId}&watch_region=IN&sort_by=popularity.desc&vote_count.gte=10&page=${page}`;
      promises.push(fetch(tvUrl).then(res => res.json()).then(data => data.results || []));
    }
  }

  const allResults = await Promise.all(promises);
  const combined = allResults.flat();
  const unique = combined.filter((item, index, self) => self.findIndex(m => m.id === item.id) === index);
  return { platformId, results: unique.slice(0, 80) };
}

async function showResults() {
  if (selectedPlatforms.size === 0) {
    movieList.innerHTML = '<p class="hint">Please select at least one platform.</p>';
    allFilteredMovies = [];
    return;
  }

  movieList.innerHTML = '<p class="hint">Loading...</p>';

  try {
    const promises = Array.from(selectedPlatforms).map(fetchMoviesForPlatform);
    const results = await Promise.all(promises);
    allFilteredMovies = results.flatMap(({ platformId, results }) => 
      results.map(movie => ({ ...movie, platformId }))
    ); // Store all movies with platform
    displayMovies(results);
  } catch (error) {
    console.error('Error fetching movies:', error);
    movieList.innerHTML = '<p class="hint">Error loading movies. Please try again.</p>';
    allFilteredMovies = [];
  }
}

function displayMovies(platformResults) {
  movieList.innerHTML = '';

  platformResults.forEach(({ platformId, results }) => {
    const platform = platforms.find(p => p.id === platformId);
    if (results.length > 0) {
      const section = document.createElement('div');
      section.className = 'platform-section';
      section.style.marginBottom = '60px';
      section.innerHTML = `
        <h2 class="platform-title" style="text-align: center; margin-bottom: 20px;">${platform.name}</h2>
        <div style="height: 500px; overflow-y: auto; overflow-x: hidden;">
          <div class="cards-container" style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${results.map(item => `
              <div class="movie-card">
                <img class="movie-poster" src="${item.poster_path ? IMAGE_BASE_URL + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${item.title || item.name}">
                <div class="movie-info">
                  <h3 class="movie-title">${item.title || item.name}</h3>
                  <p class="movie-year">${item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A'}</p>
                  <p class="movie-rating">⭐ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      movieList.appendChild(section);
    }
  });

  if (movieList.innerHTML === '') {
    movieList.innerHTML = '<p class="hint">No movies found for selected criteria.</p>';
  }
}

// Weighted random selection function
function getWeightedRandomItems(items, count) {
  if (items.length === 0) return [];

  // Calculate weights based on vote_average and popularity
  const weightedItems = items.map(item => {
    const rating = item.vote_average || 0;
    const popularity = item.popularity || 0;
    const weight = rating * 0.7 + popularity * 0.3; // Bias towards higher rating
    return { item, weight: Math.max(weight, 0.1) }; // Minimum weight
  });

  const selected = [];
  const available = [...weightedItems];

  for (let i = 0; i < Math.min(count, items.length); i++) {
    const totalWeight = available.reduce((sum, { weight }) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < available.length; j++) {
      random -= available[j].weight;
      if (random <= 0) {
        selected.push(available[j].item);
        available.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

// Function to get random movies
async function getRandomMovies() {
  let platformsToFetch = selectedPlatforms.size > 0 ? selectedPlatforms : new Set(platforms.map(p => p.id));

  try {
    const promises = Array.from(platformsToFetch).map(fetchMoviesForPlatform);
    const results = await Promise.all(promises);
    const allMovies = results.flatMap(({ platformId, results }) => 
      results.map(movie => ({ ...movie, platformId }))
    );

    if (allMovies.length === 0) {
      return []; // Will show "No movies found for selected filters"
    }

    // Group by platform
    const moviesByPlatform = {};
    allMovies.forEach(movie => {
      if (!moviesByPlatform[movie.platformId]) {
        moviesByPlatform[movie.platformId] = [];
      }
      moviesByPlatform[movie.platformId].push(movie);
    });

    const recommendations = [];
    for (const platformId of platformsToFetch) {
      const platformMovies = moviesByPlatform[platformId] || [];
      if (platformMovies.length > 0) {
        const selected = getWeightedRandomItems(platformMovies, 1);
        recommendations.push(...selected);
      }
    }
    return recommendations;
  } catch (error) {
    console.error('Error fetching movies for random:', error);
    return [];
  }
}


// Display random movies in modal
function displayRandomMovies(movies) {
  randomMoviesContainer.innerHTML = '';

  if (movies.length === 0) {
    randomMoviesContainer.innerHTML = '<p>No movies found for selected filters.</p>';
    return;
  }

  const groupedByPlatform = {};
  movies.forEach(movie => {
    const platformId = movie.platformId || 'unknown';
    if (!groupedByPlatform[platformId]) {
      groupedByPlatform[platformId] = [];
    }
    groupedByPlatform[platformId].push(movie);
  });

  const recommendationsWrapper = document.createElement('div');
  recommendationsWrapper.className = 'platform-recommendations';

  Object.keys(groupedByPlatform).forEach(platformId => {
    const platform = platforms.find(p => p.id === Number(platformId));
    const platformName = platform ? platform.name : 'Recommended';
    const movie = groupedByPlatform[platformId][0];

    const section = document.createElement('div');
    section.className = 'platform-section';
    section.innerHTML = `
      <div class="platform-name">${platformName}</div>
      <div class="random-movie-card">
        <img src="${movie.poster_path ? IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${movie.title || movie.name}">
        <h4>${movie.title || movie.name}</h4>
        <p>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
      </div>
    `;
    recommendationsWrapper.appendChild(section);
  });

  randomMoviesContainer.appendChild(recommendationsWrapper);
}

// Get platform name for a movie
function getPlatformNameForMovie(movie) {
  if (movie.platformId) {
    const platform = platforms.find(p => p.id === movie.platformId);
    return platform ? platform.name : 'Unknown';
  }
  return 'Popular Movies';
}

// Open modal and show random movies
async function openRandomModal() {
  const movies = await getRandomMovies();
  displayRandomMovies(movies);
  randomMovieModal.style.display = 'block';
}

// Close modal
function closeRandomModal() {
  randomMovieModal.style.display = 'none';
}

// Re-randomize
async function reRandomize() {
  const movies = await getRandomMovies();
  displayRandomMovies(movies);
}

showResultsBtn.addEventListener('click', showResults);
pickRandomBtn.addEventListener('click', openRandomModal);
closeModal.addEventListener('click', closeRandomModal);
reRandomizeBtn.addEventListener('click', reRandomize);

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  if (event.target === randomMovieModal) {
    closeRandomModal();
  }
});

injectModalStyles();
fetchGenres();
renderPlatforms();
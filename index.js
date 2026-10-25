const NASA_API_KEY = "DEMO_KEY";
const NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";
const LAUNCHES_URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10";
const PLANETS_URL = "https://solar-system-opendata-proxy.vercel.app/api/planets";
const AU_KM = 149597870.7;
const EARTH_MASS = 5.97237e24;
const PLANET_ORDER = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];
const PLANET_COLORS = {
  mercury: "#eab308",
  venus: "#f97316",
  earth: "#3b82f6",
  mars: "#ef4444",
  jupiter: "#fb923c",
  saturn: "#facc15",
  uranus: "#06b6d4",
  neptune: "#2563eb",
};
const COUNTRY_NAMES = {
  USA: "USA",
  CHN: "China",
  RUS: "Russia",
  IND: "India",
  NZL: "New Zealand",
  GUF: "French Guiana",
  JPN: "Japan",
  KOR: "South Korea",
  ISR: "Israel",
  IRN: "Iran",
  AUS: "Australia",
  KAZ: "Kazakhstan",
  FRA: "France",
  GBR: "UK",
  BRA: "Brazil",
  ARE: "UAE",
};

let apodHdUrl = "";
let planetsData = [];
let selectedPlanet = null;

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const apodDateInput = document.getElementById("apod-date-input");
const apodDateLabel = document.querySelector("#apod-date-input + span");
const dateWrapper = document.querySelector(".date-input-wrapper");

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatPrettyDate(iso) {
  if (!iso) return "Unknown";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLongDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeUTC(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }) + " UTC";
}

function formatShortDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setDateDisplay(iso) {
  apodDateInput.value = iso;
  apodDateInput.max = todayISO();
  const pretty = formatPrettyDate(iso);
  if (apodDateLabel) apodDateLabel.textContent = pretty;
  if (dateWrapper) dateWrapper.setAttribute("data-date", pretty);
}

function superscript(value) {
  const map = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
    "-": "⁻",
  };
  return String(value)
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

function formatScientific(value, exponent) {
  if (value == null || exponent == null) return "N/A";
  return `${Number(value).toFixed(2)} × 10${superscript(exponent)}`;
}

function formatKm(km) {
  if (km == null || km === 0) return "N/A";
  if (Math.abs(km) >= 1000000) {
    return `${(km / 1000000).toFixed(1).replace(/\.0$/, "")}M km`;
  }
  return `${Math.round(km).toLocaleString()} km`;
}

function formatAU(km) {
  if (!km) return "N/A";
  return `${(km / AU_KM).toFixed(2)} AU`;
}

function formatPeriod(days) {
  if (!days) return "N/A";
  const abs = Math.abs(days);
  if (abs >= 365) {
    return `${(abs / 365.25).toFixed(1)} years`;
  }
  return `${Math.round(abs)} days`;
}

function formatHours(hours) {
  if (hours == null || hours === 0) return "N/A";
  const abs = Math.abs(hours);
  if (abs >= 48) {
    return `${(abs / 24).toFixed(1)} days`;
  }
  return `${abs.toFixed(1)} hours`;
}

function kelvinToC(kelvin) {
  if (kelvin == null) return "N/A";
  return `${Math.round(kelvin - 273.15)}°C`;
}

function youtubeEmbed(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
  );
  if (!match) return url;
  return `https://www.youtube.com/embed/${match[1]}`;
}

function countryName(code) {
  if (!code) return "Unknown";
  return COUNTRY_NAMES[code] || code;
}

function statusBadgeClass(abbrev) {
  const key = (abbrev || "").toLowerCase();
  if (key === "go" || key === "success") {
    return "bg-green-500/90 text-white";
  }
  if (key === "tbc") {
    return "bg-yellow-500/90 text-white";
  }
  if (key === "tbd" || key === "in flight") {
    return "bg-blue-500/90 text-white";
  }
  if (key === "hold" || key === "failure" || key === "partial failure") {
    return "bg-red-400 text-white";
  }
  return "bg-slate-700 text-white";
}

function featuredStatusClass(abbrev) {
  const key = (abbrev || "").toLowerCase();
  if (key === "go" || key === "success") {
    return "bg-green-500/20 text-green-400";
  }
  if (key === "tbc") {
    return "bg-yellow-500/20 text-yellow-400";
  }
  if (key === "tbd") {
    return "bg-blue-500/20 text-blue-400";
  }
  return "bg-slate-700/60 text-slate-300";
}

function daysUntilLaunch(iso) {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) {
    return { value: "TBD", label: "Launch Time" };
  }
  const diff = target.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days > 1) return { value: String(days), label: "Days Until Launch" };
  if (days === 1) return { value: "1", label: "Day Until Launch" };
  if (days === 0) return { value: "Today", label: "Launch Day" };
  return { value: "Soon", label: "Launch Window" };
}

function launchImage(launch) {
  if (typeof launch.image === "string" && launch.image) return launch.image;
  if (launch.image && launch.image.image_url) return launch.image.image_url;
  if (typeof launch.infographic === "string" && launch.infographic) {
    return launch.infographic;
  }
  if (
    launch.rocket &&
    launch.rocket.configuration &&
    launch.rocket.configuration.image_url
  ) {
    return launch.rocket.configuration.image_url;
  }
  return "./assets/images/launch-placeholder.png";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openSidebar() {
  sidebar.classList.add("sidebar-open");
  sidebarOverlay.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.remove("sidebar-open");
  sidebarOverlay.classList.add("hidden");
}

function showSection(sectionId) {
  document.querySelectorAll(".app-section").forEach((section) => {
    section.classList.add("hidden");
    section.classList.remove("min-h-screen");
  });
  const active = document.getElementById(sectionId);
  if (active) {
    active.classList.remove("hidden");
    active.classList.add("min-h-screen");
  }
  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.dataset.section === sectionId;
    link.classList.toggle("bg-blue-500/10", isActive);
    link.classList.toggle("text-blue-400", isActive);
    link.classList.toggle("text-slate-300", !isActive);
    link.classList.toggle("hover:bg-slate-800", !isActive);
  });
  closeSidebar();
}

function toggleHeart(button) {
  const icon = button.querySelector("i");
  if (!icon) return;
  const liked = icon.classList.contains("fas");
  icon.classList.toggle("fas", !liked);
  icon.classList.toggle("far", liked);
  icon.classList.toggle("text-red-400", !liked);
}

async function fetchApod(date) {
  const params = new URLSearchParams({ api_key: NASA_API_KEY });
  if (date) params.set("date", date);
  const response = await fetch(`${NASA_APOD_URL}?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || data.code || data.error) {
    throw new Error(data.msg || data.error || "Could not load NASA image");
  }
  return data;
}

function previousISO(iso) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() - 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

async function loadApod(date) {
  const loading = document.getElementById("apod-loading");
  const image = document.getElementById("apod-image");
  const container = document.getElementById("apod-image-container");
  const oldVideo = document.getElementById("apod-video");
  if (oldVideo) oldVideo.remove();
  loading.classList.remove("hidden");
  image.classList.add("hidden");
  const requested = date || todayISO();
  try {
    let data;
    try {
      data = await fetchApod(requested);
    } catch (firstError) {
      if (requested === todayISO()) {
        data = await fetchApod(previousISO(requested));
      } else {
        throw firstError;
      }
    }
    const iso = data.date || requested;
    setDateDisplay(iso);
    document.getElementById("apod-date").textContent =
      `Astronomy Picture of the Day - ${formatPrettyDate(iso)}`;
    document.getElementById("apod-title").textContent = data.title || "Untitled";
    document.getElementById("apod-date-detail").innerHTML =
      `<i class="far fa-calendar mr-2"></i>${iso}`;
    document.getElementById("apod-explanation").textContent =
      data.explanation || "No description available.";
    document.getElementById("apod-copyright").innerHTML = data.copyright
      ? `&copy; ${escapeHtml(data.copyright)}`
      : "&copy; NASA";
    document.getElementById("apod-date-info").textContent = iso;
    document.getElementById("apod-media-type").textContent =
      data.media_type === "video" ? "Video" : "Image";
    apodHdUrl = data.hdurl || data.url || "";
    if (data.media_type === "video") {
      const iframe = document.createElement("iframe");
      iframe.id = "apod-video";
      iframe.className = "w-full h-full";
      iframe.src = youtubeEmbed(data.url);
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      image.classList.add("hidden");
      container.appendChild(iframe);
    } else {
      image.src = data.url || "./assets/images/placeholder.webp";
      image.alt = data.title || "Astronomy Picture of the Day";
      image.classList.remove("hidden");
    }
  } catch (error) {
    document.getElementById("apod-title").textContent = "Unable to load APOD";
    document.getElementById("apod-explanation").textContent =
      error.message || "Please try another date.";
    image.src = "./assets/images/placeholder.webp";
    image.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
}

function renderFeaturedLaunch(launch) {
  const countdown = daysUntilLaunch(launch.net);
  const status = (launch.status && launch.status.abbrev) || "TBD";
  const image = launchImage(launch);
  const provider =
    (launch.launch_service_provider && launch.launch_service_provider.name) ||
    "Unknown";
  const rocket =
    (launch.rocket &&
      launch.rocket.configuration &&
      launch.rocket.configuration.name) ||
    "Unknown";
  const location =
    (launch.pad && launch.pad.location && launch.pad.location.name) ||
    (launch.pad && launch.pad.name) ||
    "Unknown";
  const country =
    launch.pad && launch.pad.location && launch.pad.location.country_code;
  const mission =
    (launch.mission && launch.mission.description) ||
    "No mission description available.";
  const detailsUrl = launch.url || launch.pad?.wiki_url || "#";
  document.getElementById("featured-launch").innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>
                Featured Launch
              </span>
              <span class="px-4 py-1.5 ${featuredStatusClass(status)} rounded-full text-sm font-semibold">
                ${escapeHtml(status)}
              </span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${escapeHtml(launch.name || "Upcoming Launch")}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2">
                <i class="fas fa-building"></i>
                <span>${escapeHtml(provider)}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-rocket"></i>
                <span>${escapeHtml(rocket)}</span>
              </div>
            </div>
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${escapeHtml(countdown.value)}</p>
                <p class="text-xs text-slate-400">${escapeHtml(countdown.label)}</p>
              </div>
            </div>
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-calendar"></i>
                  Launch Date
                </p>
                <p class="font-semibold">${escapeHtml(formatLongDate(launch.net))}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-clock"></i>
                  Launch Time
                </p>
                <p class="font-semibold">${escapeHtml(formatTimeUTC(launch.net))}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-map-marker-alt"></i>
                  Location
                </p>
                <p class="font-semibold text-sm">${escapeHtml(location)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-globe"></i>
                  Country
                </p>
                <p class="font-semibold">${escapeHtml(countryName(country))}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${escapeHtml(mission)}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <a href="${escapeHtml(detailsUrl)}" target="_blank" rel="noopener noreferrer" class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>
              View Full Details
            </a>
            <div class="icons self-end md:self-center">
              <button class="fav-btn px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                <i class="far fa-heart"></i>
              </button>
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                <i class="fas fa-bell"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="relative">
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(launch.name || "Launch")}" class="w-full h-full object-cover" onerror="this.src='./assets/images/launch-placeholder.png'">
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function launchCard(launch, index) {
  const status = (launch.status && launch.status.abbrev) || "TBD";
  const image = launchImage(launch);
  const provider =
    (launch.launch_service_provider && launch.launch_service_provider.name) ||
    "Unknown";
  const rocket =
    (launch.rocket &&
      launch.rocket.configuration &&
      launch.rocket.configuration.name) ||
    "Unknown";
  const pad =
    (launch.pad && launch.pad.name) ||
    (launch.pad && launch.pad.location && launch.pad.location.name) ||
    "Unknown";
  return `
    <div class="launch-card bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer" data-launch-index="${index}">
      <div class="relative h-48 overflow-hidden bg-slate-900/50">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(launch.name || "Launch")}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='./assets/images/launch-placeholder.png'">
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 ${statusBadgeClass(status)} backdrop-blur-sm rounded-full text-xs font-semibold">
            ${escapeHtml(status)}
          </span>
        </div>
      </div>
      <div class="p-5">
        <div class="mb-3">
          <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${escapeHtml(launch.name || "Upcoming Launch")}</h4>
          <p class="text-sm text-slate-400 flex items-center gap-2">
            <i class="fas fa-building text-xs"></i>
            ${escapeHtml(provider)}
          </p>
        </div>
        <div class="space-y-2 mb-4">
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-calendar text-slate-500 w-4"></i>
            <span class="text-slate-300">${escapeHtml(formatShortDate(launch.net))}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-clock text-slate-500 w-4"></i>
            <span class="text-slate-300">${escapeHtml(formatTimeUTC(launch.net))}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-rocket text-slate-500 w-4"></i>
            <span class="text-slate-300">${escapeHtml(rocket)}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
            <span class="text-slate-300 line-clamp-1">${escapeHtml(pad)}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
          <button class="details-btn flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">
            Details
          </button>
          <button class="fav-btn px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
            <i class="far fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function loadLaunches() {
  const grid = document.getElementById("launches-grid");
  try {
    const response = await fetch(LAUNCHES_URL);
    if (!response.ok) throw new Error("Could not load launches");
    const data = await response.json();
    const launches = data.results || [];
    const count = launches.length;
    document.getElementById("launches-count").textContent = `${count} Launches`;
    document.getElementById("launches-count-mobile").textContent = String(count);
    if (!launches.length) {
      document.getElementById("featured-launch").innerHTML =
        '<p class="text-slate-400">No upcoming launches found.</p>';
      grid.innerHTML = "";
      return;
    }
    renderFeaturedLaunch(launches[0]);
    grid.innerHTML = launches.map((launch, index) => launchCard(launch, index)).join("");
    grid.querySelectorAll(".launch-card").forEach((card) => {
      const index = Number(card.dataset.launchIndex);
      card.querySelector(".details-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        renderFeaturedLaunch(launches[index]);
        document.getElementById("featured-launch").scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      card.addEventListener("click", (event) => {
        if (event.target.closest(".fav-btn")) return;
        renderFeaturedLaunch(launches[index]);
        document.getElementById("featured-launch").scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  } catch (error) {
    document.getElementById("featured-launch").innerHTML =
      `<p class="text-red-400">${escapeHtml(error.message)}</p>`;
  }
}

function planetKey(planet) {
  return (planet.englishName || planet.id || "").toLowerCase();
}

function planetImage(planet) {
  const key = planetKey(planet);
  return `./assets/images/${key}.png`;
}

function typeBadgeClass(planet) {
  const key = planetKey(planet);
  const type = planet.type || "";
  if (key === "earth") return "bg-blue-500/50 text-blue-200";
  if (key === "mars") return "bg-red-500/50 text-red-200";
  if (key === "saturn") return "bg-yellow-500/50 text-yellow-200";
  if (type === "Gas Giant") return "bg-purple-500/50 text-purple-200";
  if (type === "Ice Giant") return "bg-cyan-500/50 text-cyan-200";
  return "bg-orange-500/50 text-orange-200";
}

function planetFacts(planet) {
  const moons = planet.moons ? planet.moons.length : 0;
  const facts = [];
  if (planet.description) {
    facts.push(planet.description.split(". ")[0] + ".");
  }
  facts.push(`Classified as a ${planet.type || planet.bodyType || "planet"}.`);
  facts.push(`Has ${moons} known moon${moons === 1 ? "" : "s"}.`);
  if (planet.gravity) {
    facts.push(`Surface gravity is ${Number(planet.gravity).toFixed(2)} m/s².`);
  }
  if (planet.axialTilt) {
    facts.push(`Axial tilt is ${Number(planet.axialTilt).toFixed(2)}°.`);
  }
  return facts.slice(0, 4);
}

function showPlanetDetails(planet) {
  selectedPlanet = planet;
  const key = planetKey(planet);
  const moons = planet.moons ? planet.moons.length : 0;
  document.getElementById("planet-detail-image").src = planetImage(planet);
  document.getElementById("planet-detail-image").alt = planet.englishName;
  document.getElementById("planet-detail-name").textContent = planet.englishName;
  document.getElementById("planet-detail-description").textContent =
    planet.description || "No description available.";
  document.getElementById("planet-distance").textContent = formatKm(
    planet.semimajorAxis
  );
  document.getElementById("planet-radius").textContent = planet.meanRadius
    ? `${Math.round(planet.meanRadius).toLocaleString()} km`
    : "N/A";
  document.getElementById("planet-mass").textContent = planet.mass
    ? `${formatScientific(planet.mass.massValue, planet.mass.massExponent)} kg`
    : "N/A";
  document.getElementById("planet-density").textContent = planet.density
    ? `${Number(planet.density).toFixed(2)} g/cm³`
    : "N/A";
  document.getElementById("planet-orbital-period").textContent = formatPeriod(
    planet.sideralOrbit
  );
  document.getElementById("planet-rotation").textContent = formatHours(
    planet.sideralRotation
  );
  document.getElementById("planet-moons").textContent = String(moons);
  document.getElementById("planet-gravity").textContent = planet.gravity
    ? `${Number(planet.gravity).toFixed(1)} m/s²`
    : "N/A";
  document.getElementById("planet-discoverer").textContent =
    planet.discoveredBy || "Known since antiquity";
  document.getElementById("planet-discovery-date").textContent =
    planet.discoveryDate || "Ancient";
  document.getElementById("planet-body-type").textContent =
    planet.bodyType || "Planet";
  document.getElementById("planet-volume").textContent = planet.vol
    ? `${formatScientific(planet.vol.volValue, planet.vol.volExponent)} km³`
    : "N/A";
  document.getElementById("planet-perihelion").textContent = formatKm(
    planet.perihelion
  );
  document.getElementById("planet-aphelion").textContent = formatKm(
    planet.aphelion
  );
  document.getElementById("planet-eccentricity").textContent =
    planet.eccentricity != null ? Number(planet.eccentricity).toFixed(4) : "N/A";
  document.getElementById("planet-inclination").textContent =
    planet.inclination != null
      ? `${Number(planet.inclination).toFixed(2)}°`
      : "N/A";
  document.getElementById("planet-axial-tilt").textContent =
    planet.axialTilt != null ? `${Number(planet.axialTilt).toFixed(2)}°` : "N/A";
  document.getElementById("planet-temp").textContent = kelvinToC(planet.avgTemp);
  document.getElementById("planet-escape").textContent = planet.escape
    ? `${(planet.escape / 1000).toFixed(1)} km/s`
    : "N/A";
  document.getElementById("planet-facts").innerHTML = planetFacts(planet)
    .map(
      (fact) => `
        <li class="flex items-start">
          <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
          <span class="text-slate-300">${escapeHtml(fact)}</span>
        </li>
      `
    )
    .join("");
  document.querySelectorAll(".planet-card").forEach((card) => {
    const active = card.dataset.planetId === key;
    card.style.borderColor = active ? PLANET_COLORS[key] : "#334155";
  });
}

function renderComparison(planets) {
  const tbody = document.getElementById("planet-comparison-tbody");
  tbody.innerHTML = planets
    .map((planet) => {
      const key = planetKey(planet);
      const moons = planet.moons ? planet.moons.length : 0;
      const massRatio = planet.mass
        ? (
            planet.mass.massValue *
            10 ** planet.mass.massExponent /
            EARTH_MASS
          ).toFixed(key === "earth" ? 3 : 3)
        : "N/A";
      const diameter = planet.meanRadius
        ? Math.round(planet.meanRadius * 2).toLocaleString()
        : "N/A";
      const highlight = key === "earth" ? " bg-blue-500/5" : "";
      return `
        <tr class="hover:bg-slate-800/30 transition-colors${highlight}">
          <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
            <div class="flex items-center space-x-2 md:space-x-3">
              <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${PLANET_COLORS[key]}"></div>
              <span class="font-semibold text-sm md:text-base whitespace-nowrap">${escapeHtml(planet.englishName)}</span>
            </div>
          </td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${(planet.semimajorAxis / AU_KM).toFixed(2)}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${diameter}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${massRatio}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${formatPeriod(planet.sideralOrbit)}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${moons}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
            <span class="px-2 py-1 rounded text-xs ${typeBadgeClass(planet)}">${escapeHtml(planet.type || "Planet")}</span>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadPlanets() {
  try {
    const response = await fetch(PLANETS_URL);
    if (!response.ok) throw new Error("Could not load planets");
    const data = await response.json();
    const bodies = (data.bodies || []).filter((body) => body.isPlanet);
    planetsData = PLANET_ORDER.map((name) =>
      bodies.find((body) => planetKey(body) === name)
    ).filter(Boolean);
    planetsData.forEach((planet) => {
      const card = document.querySelector(
        `.planet-card[data-planet-id="${planetKey(planet)}"]`
      );
      if (!card) return;
      const au = card.querySelector("p");
      if (au) au.textContent = formatAU(planet.semimajorAxis);
    });
    renderComparison(planetsData);
    const earth = planetsData.find((planet) => planetKey(planet) === "earth");
    if (earth) showPlanetDetails(earth);
  } catch (error) {
    document.getElementById("planet-detail-description").textContent =
      error.message;
  }
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showSection(link.dataset.section);
  });
});

sidebarToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("sidebar-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener("click", closeSidebar);

document.getElementById("load-date-btn").addEventListener("click", () => {
  loadApod(apodDateInput.value);
});

document.getElementById("today-apod-btn").addEventListener("click", () => {
  loadApod(todayISO());
});

apodDateInput.addEventListener("change", () => {
  setDateDisplay(apodDateInput.value);
});

document.getElementById("apod-full-btn").addEventListener("click", () => {
  if (apodHdUrl) window.open(apodHdUrl, "_blank", "noopener");
});

document.querySelectorAll(".planet-card").forEach((card) => {
  card.addEventListener("click", () => {
    const planet = planetsData.find(
      (item) => planetKey(item) === card.dataset.planetId
    );
    if (planet) showPlanetDetails(planet);
  });
});

document.getElementById("planet-learn-more").addEventListener("click", () => {
  const name = selectedPlanet
    ? selectedPlanet.englishName
    : document.getElementById("planet-detail-name").textContent;
  window.open(
    `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`,
    "_blank",
    "noopener"
  );
});

document.addEventListener("click", (event) => {
  const fav = event.target.closest(".fav-btn, #planet-fav-btn");
  if (fav) {
    event.stopPropagation();
    toggleHeart(fav);
  }
});

setDateDisplay(todayISO());
showSection("today-in-space");
loadApod(todayISO());
loadLaunches();
loadPlanets();

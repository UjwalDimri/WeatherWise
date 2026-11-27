
const searchForm = document.getElementById("weather-search");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const searchHint = document.getElementById("searchHint");

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const currentYear = document.getElementById("currentYear");

// Set the current year in the footer
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

// Let visitors switch between the first five forecast days and the full week.
const forecastRangeButtons = document.querySelectorAll("[data-forecast-range]");
const forecastCards = document.querySelectorAll("[data-forecast-index]");

forecastRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const visibleDays = Number(button.dataset.forecastRange);
    forecastRangeButtons.forEach((rangeButton) => {
      rangeButton.setAttribute("aria-pressed", String(rangeButton === button));
    });
    forecastCards.forEach((card) => {
      card.hidden = Number(card.dataset.forecastIndex) >= visibleDays;
    });
  });
});

// Mobile navigation
if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      menuToggle.textContent = "☰";
    });
  });
}

// Search Open-Meteo as the user types, with keyboard and pointer support.
if (searchForm && cityInput) {
  const suggestions = document.getElementById("locationSuggestions");
  const selectedLatitude = document.getElementById("selectedLatitude");
  const selectedLongitude = document.getElementById("selectedLongitude");
  const selectedAdmin1 = document.getElementById("selectedAdmin1");
  const selectedCountry = document.getElementById("selectedCountry");
  let debounceTimer;
  let activeRequest;
  let matches = [];
  let activeIndex = -1;

  const setHint = (message, isError = false) => {
    if (!searchHint) return;
    searchHint.textContent = message;
    searchHint.classList.toggle("search-error", isError);
  };

  const closeSuggestions = () => {
    if (!suggestions) return;
    suggestions.hidden = true;
    suggestions.setAttribute("aria-busy", "false");
    suggestions.replaceChildren();
    cityInput.setAttribute("aria-expanded", "false");
    cityInput.removeAttribute("aria-activedescendant");
    matches = [];
    activeIndex = -1;
  };

  const setActiveOption = (index) => {
    if (!suggestions || matches.length === 0) return;
    activeIndex = (index + matches.length) % matches.length;
    suggestions.querySelectorAll('[role="option"]').forEach((option, optionIndex) => {
      const isActive = optionIndex === activeIndex;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-selected", String(isActive));
    });
    const activeOption = suggestions.querySelector(`#location-option-${activeIndex}`);
    if (activeOption) {
      cityInput.setAttribute("aria-activedescendant", activeOption.id);
      activeOption.scrollIntoView({ block: "nearest" });
    }
  };

  const selectLocation = (location) => {
    const placeLabel = [location.name, location.admin1, location.country]
      .filter(Boolean)
      .join(", ");
    cityInput.value = location.name;
    if (selectedLatitude) selectedLatitude.value = location.latitude;
    if (selectedLongitude) selectedLongitude.value = location.longitude;
    if (selectedAdmin1) selectedAdmin1.value = location.admin1 || "";
    if (selectedCountry) selectedCountry.value = location.country || "";
    closeSuggestions();
    setHint(`Selected ${placeLabel}. Submit to continue.`);
  };

  const showSuggestions = (locations) => {
    if (!suggestions) return;
    suggestions.replaceChildren();
    matches = locations;
    activeIndex = -1;

    locations.forEach((location, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `location-option-${index}`;
      option.className = "suggestion-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");

      const name = document.createElement("span");
      name.className = "suggestion-name";
      name.textContent = location.name;
      const details = document.createElement("span");
      details.className = "suggestion-details";
      details.textContent = [location.admin1, location.country].filter(Boolean).join(", ");
      option.append(name, details);
      option.addEventListener("click", () => selectLocation(location));
      suggestions.append(option);
    });

    suggestions.hidden = locations.length === 0;
    cityInput.setAttribute("aria-expanded", String(locations.length > 0));
  };

  const fetchSuggestions = async (query) => {
    if (activeRequest) activeRequest.abort();
    const requestController = new AbortController();
    activeRequest = requestController;
    suggestions?.setAttribute("aria-busy", "true");
    setHint("Searching locations…");

    try {
      const response = await fetch(`/api/geocoding?name=${encodeURIComponent(query)}`, {
        signal: requestController.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Location search failed.");

      // Ignore a result if the user has typed something newer while it was loading.
      if (cityInput.value.trim() !== query) return;
      showSuggestions(Array.isArray(data.results) ? data.results : []);
      setHint(data.results?.length ? "Select a location from the suggestions." : "No matching locations found.", !data.results?.length);
    } catch (error) {
      if (error.name === "AbortError") return;
      if (cityInput.value.trim() === query) {
        closeSuggestions();
        setHint(error.message || "Could not load suggestions. Try again.", true);
      }
    } finally {
      if (activeRequest === requestController) {
        suggestions?.setAttribute("aria-busy", "false");
        activeRequest = null;
      }
    }
  };

  cityInput.addEventListener("input", () => {
    const query = cityInput.value.trim();
    clearTimeout(debounceTimer);
    if (activeRequest) activeRequest.abort();
    closeSuggestions();
    [selectedLatitude, selectedLongitude, selectedAdmin1, selectedCountry].forEach((field) => {
      if (field) field.value = "";
    });

    if (searchButton) {
      searchButton.disabled = false;
      searchButton.textContent = "Check Weather →";
    }

    if (query.length < 2) {
      closeSuggestions();
      setHint("Type at least 2 characters to search.");
      return;
    }
    if (query.length > 100) {
      closeSuggestions();
      setHint("Please enter a shorter city name.", true);
      return;
    }

    debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
  });

  cityInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setActiveOption(activeIndex + 1);
    } else if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setActiveOption(activeIndex < 0 ? matches.length - 1 : activeIndex - 1);
    } else if (event.key === "Enter" && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      selectLocation(matches[activeIndex]);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  document.addEventListener("click", (event) => {
    if (!searchForm.contains(event.target)) closeSuggestions();
  });

  searchForm.addEventListener("submit", (event) => {
    const city = cityInput.value.trim();

    if (!city) {
      event.preventDefault();
      setHint("Please enter a city name.", true);
      cityInput.focus();
      return;
    }

    if (city.length > 100) {
      event.preventDefault();
      setHint("Please enter a shorter city name.", true);
      cityInput.focus();
      return;
    }

    clearTimeout(debounceTimer);
    if (activeRequest) activeRequest.abort();
    closeSuggestions();
    cityInput.value = city;
    setHint(`Looking for weather in ${city}...`);

    if (searchButton) {
      searchButton.disabled = true;
      searchButton.textContent = "Searching...";
    }
  });

  cityInput.addEventListener("input", () => {
    searchHint.textContent = "Try searching for your city to get started.";

    if (searchButton) {
      searchButton.disabled = false;
      searchButton.textContent = "Check Weather →";
    }
  });
}


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

// Validate the city before submitting the form
if (searchForm && cityInput) {
  searchForm.addEventListener("submit", (event) => {
    const city = cityInput.value.trim();

    if (!city) {
      event.preventDefault();
      searchHint.textContent = "Please enter a city name.";
      cityInput.focus();
      return;
    }

    if (city.length > 100) {
      event.preventDefault();
      searchHint.textContent = "Please enter a shorter city name.";
      cityInput.focus();
      return;
    }

    cityInput.value = city;
    searchHint.textContent = `Looking for weather in ${city}...`;

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

# WeatherWise 🌦️

A DevOps-enabled weather forecast web application that retrieves real-time weather data from an external API and presents essential information — temperature, humidity, wind speed, conditions, and a 5–7 day forecast — through a simple, user-friendly interface.

This project is built for **CSDV2010P — DevOps Fundamentals and SCM**, B.Tech DevOps, Semester III, and demonstrates a full DevOps lifecycle: Git/GitHub workflow, automated testing, CI/CD, containerization, and cloud deployment — not just a working weather app.

## Team

| Student | SAP ID | Role |
|---|---|---|
| Ujwal Dimri | 590022777 | Full-Stack Developer, DevSecOps |Team Lead (Project Manager)
| Rahul Singh Garbyal | 590022432 | API Integration & DevOps |

## Features

- Search weather by city/location
- Current temperature, feels-like temperature, and weather condition
- Humidity, wind speed, and atmospheric conditions
- 5–7 day weather forecast
- Precipitation probability and sunrise/sunset timings (where supported by the API)
- Graceful error handling for invalid locations or API failures
- Data refresh on demand
- Responsive interface (desktop, tablet, mobile)
- Search history stored in MongoDB

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, EJS (server-rendered views) |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Weather Data | External Weather API |
| Version Control | Git |
| Repository | GitHub |
| CI/CD | GitHub Actions |
| Testing | Jest |
| Containerization | Docker |
| Deployment | Render / Railway |

## Project Structure

```
weatherwise/
├── .github/workflows/       # CI/CD pipeline definitions
├── public/                  # Static assets (CSS, client-side JS)
├── src/
│   ├── views/                # EJS templates (index, partials)
│   ├── routes/                # Express route handlers
│   ├── services/               # Weather API integration
│   ├── models/                  # Mongoose schemas
│   ├── config/                   # DB connection config
│   ├── scripts/                    # Standalone test/utility scripts
│   └── app.js                       # App entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local instance or MongoDB Atlas)
- A Weather API key (e.g. OpenWeatherMap)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/weatherwise.git
cd weatherwise

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# then fill in your WEATHER_API_KEY and MONGODB_URI in .env

# Run the app
npm start
```

The app will be available at `http://localhost:3000`.

### Environment Variables

| Variable | Description |
|---|---|
| `WEATHER_API_KEY` | API key for the external weather service |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Port for the Express server (default: 3000) |

## Running Tests

```bash
npm test
```

## Git & DevOps Workflow

This project follows a structured branching and CI/CD workflow:

**Feature Branch → Commit → Push → Pull Request → Review → Merge**

- Each team member works on separate feature branches — no direct commits to `main`.
- Pull Requests require review before merging.
- GitHub Actions automatically runs on every push/PR: installs dependencies, runs tests, performs code/security checks, and builds the Docker image.
- On merge to `main`, the app is containerized with Docker and deployed automatically to the hosting platform.
- API keys and secrets are managed via `.env` (local) and GitHub Secrets (CI/CD) — never committed to source control.
- Bugs and tasks are tracked via GitHub Issues.

## Deployment

The app is deployed at: `<add live URL here>`

## Individual Contribution

| Student | Contribution |
|---|---|
| Ujwal Dimri | Backend development (routes, EJS views), frontend (HTML/CSS/JS), MongoDB schema, API endpoints, error handling, DevSecOps (input sanitization, secrets hygiene), Docker setup |
| Rahul Singh Garbyal | Weather API integration, response parsing and error handling, Git/GitHub branching workflow, GitHub Actions CI/CD pipeline, Docker Compose, environment variables/secrets, deployment |

## Responsible Use of AI

AI tools used during development: ChatGPT, GitHub Copilot, Gemini, Claude — used for guidance on structure, debugging, and documentation. All core implementation and understanding is the team's own work.

## Future Enhancements

- Favorite/last-searched cities list
- Unit toggle (°C/°F)
- Caching recent API responses in MongoDB to reduce external API calls
- Basic rate-limiting middleware

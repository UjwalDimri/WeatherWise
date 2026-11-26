const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", "..", ".env");

// Read local settings from .env. Hosting services can set the same values
// directly in their environment, so those values are left alone.
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;

        // Split KEY=value at the first equals sign.
        const equalsSign = trimmedLine.indexOf("=");
        if (equalsSign === -1) continue;

        const key = trimmedLine.slice(0, equalsSign).trim();
        let value = trimmedLine.slice(equalsSign + 1).trim();

        // Remove optional quotes around a value, such as "my secret".
        if ((value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // A setting from the computer or hosting service takes precedence.
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

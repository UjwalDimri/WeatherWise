const crypto = require("node:crypto");

const COOKIE_NAME = "weatherwise_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "development-only-change-this-session-secret";

// Production must use a private secret from the hosting environment.
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production.");
}

function sign(payload) {
    // Attach a signature so a browser can't edit the session contents.
    return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function createSession(user) {
    // A session remembers who signed in and expires after seven days.
    const payload = Buffer.from(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    })).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

function readSession(req) {
    // Browsers send cookies in the Cookie request header.
    const cookies = (req.headers.cookie || "").split(";").map((part) => part.trim());
    const cookie = cookies.find((part) => part.startsWith(`${COOKIE_NAME}=`));
    if (!cookie) return null;

    let token;
    try {
        token = decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1));
    } catch {
        return null;
    }
    // The token is the session data followed by its signature.
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

    try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        return session.expires > Date.now() ? session : null;
    } catch {
        return null;
    }
}

function attachUser(req, res, next) {
    // Make the signed-in user available to every route as req.user.
    req.user = readSession(req);
    next();
}

function requireLogin(req, res, next) {
    // Use this before pages that should only be visible after login.
    if (!req.user) return res.redirect("/login");
    return next();
}

function setSessionCookie(res, user) {
    // HttpOnly prevents page JavaScript from reading the login cookie.
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(createSession(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`);
}

function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

module.exports = { attachUser, requireLogin, setSessionCookie, clearSessionCookie };

const jwt = require("jsonwebtoken");

const env = require("../config/env");
const prisma = require("../config/prisma");

async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Missing user ID");
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true, sessionVersion: true } });
    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "This account is not active" });
    }
    if ((payload.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
      return res.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
    }
    if (payload.sid) {
      const session = await prisma.adminSession.findUnique({ where: { id: payload.sid } });
      if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date()) return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
    }
    req.user = { id: user.id, role: user.role, sessionId: payload.sid, sessionVersion: user.sessionVersion ?? 0 };
    return next();
  } catch (error) { return next(error); }
}

module.exports = authenticate;

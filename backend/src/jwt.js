import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function signAccessToken(profile) {
  return jwt.sign(
    {
      sub: profile.id,
      email: profile.email,
      role: profile.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

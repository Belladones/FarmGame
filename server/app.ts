import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import rateLimit from "express-rate-limit";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import type pg from "pg";
import { validFarm } from "./validation.js";
import path from "node:path";
import { catalogRoutes } from "./modules/catalog/adapters/http/catalogRoutes.js";
import { readCatalog } from "./modules/catalog/adapters/postgres/catalogRepository.js";
import { readProgress } from "./modules/saves/adapters/postgres/progressRepository.js";
const COOKIE = "farmscript_session",
  AGE = 30 * 24 * 60 * 60 * 1000;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest();
function token(req: Request) {
  const raw = req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
async function verify(password: string, hash: string) {
  const parts = hash.split(":");
  if (
    parts[0] !== "scrypt-v1" ||
    parts[1]?.length !== 32 ||
    parts[2]?.length !== 128
  )
    return false;
  return timingSafeEqual(
    await derive(password, parts[1]),
    Buffer.from(parts[2], "hex"),
  );
}
interface Session {
  playerId: string;
  username: string;
  expiresAt: Date;
}
export function createApp(
  pool: pg.Pool,
  options: {
    secureCookies?: boolean;
    serveFrontend?: boolean;
    authLimit?: number;
  } = {},
) {
  const app = express(),
    secure =
      options.secureCookies ??
      (process.env.COOKIE_SECURE === "true" ||
        process.env.NODE_ENV === "production");
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-FarmScript-Request") !== "1") {
        res.status(403).json({ error: "Requête non autorisée." });
        return;
      }
      const origin = req.get("Origin");
      if (origin) {
        try {
          const parsed = new URL(origin);
          if (
            !["http:", "https:"].includes(parsed.protocol) ||
            parsed.host !== req.get("Host")
          ) {
            res.status(403).json({ error: "Origine non autorisée." });
            return;
          }
        } catch {
          res.status(403).json({ error: "Origine invalide." });
          return;
        }
      }
    }
    next();
  });
  app.use("/api", express.json({ limit: "2mb", strict: true }));
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.authLimit ?? 50,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
  });
  const cookie = (res: Response, value: string, maxAge = AGE) =>
    res.cookie(COOKIE, value, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/api",
      maxAge,
    });
  async function newSession(req: Request, res: Response, playerId: string) {
    const raw = randomBytes(32).toString("hex"),
      previous = token(req);
    if (previous)
      await pool.query("DELETE FROM player_sessions WHERE token_hash=$1", [
        hashToken(previous),
      ]);
    await pool.query("DELETE FROM player_sessions WHERE expires_at <= now()");
    const expiresAt = new Date(Date.now() + AGE);
    await pool.query(
      "INSERT INTO player_sessions(id,player_id,token_hash,expires_at) VALUES($1,$2,$3,$4)",
      [randomUUID(), playerId, hashToken(raw), expiresAt],
    );
    cookie(res, raw);
    return expiresAt;
  }
  async function authenticate(req: Request, res: Response, next: NextFunction) {
    const raw = token(req);
    if (!raw) {
      res
        .status(401)
        .json({ error: "Connectez-vous pour sauvegarder cette ferme." });
      return;
    }
    const found = await pool.query(
      "UPDATE player_sessions SET expires_at=now()+interval '30 days' FROM players WHERE player_sessions.player_id=players.id AND token_hash=$1 AND expires_at>now() RETURNING players.id,players.username,player_sessions.expires_at",
      [hashToken(raw)],
    );
    if (!found.rowCount) {
      cookie(res, "", 0);
      res.status(401).json({ error: "La session a expiré. Reconnectez-vous." });
      return;
    }
    const row = found.rows[0];
    res.locals.session = {
      playerId: row.id,
      username: row.username,
      expiresAt: row.expires_at,
    } satisfies Session;
    cookie(res, raw);
    next();
  }
  const credentials = (body: unknown) => {
    if (!body || typeof body !== "object") return null;
    const v = body as Record<string, unknown>;
    if (
      typeof v.username !== "string" ||
      !/^[A-Za-z0-9_-]{3,24}$/.test(v.username) ||
      typeof v.password !== "string" ||
      v.password.length < 10 ||
      v.password.length > 128
    )
      return null;
    return {
      username: v.username,
      key: v.username.toLowerCase(),
      password: v.password,
    };
  };
  const getSave = async (id: string) => {
    const result = await pool.query(
      "SELECT COALESCE(game_restore_save(player_id,'active'),state) AS state,revision,updated_at,last_write_id FROM farm_saves WHERE player_id=$1",
      [id],
    );
    const row = result.rows[0];
    return row
      ? {
          farm: row.state,
          revision: row.revision,
          updatedAt: row.updated_at,
          writeId: row.last_write_id,
        }
      : null;
  };
  catalogRoutes(app, { read: () => readCatalog(pool) });
  app.get("/api/progress", authenticate, async (_req, res) =>
    res.json(
      await readProgress(pool, (res.locals.session as Session).playerId),
    ),
  );
  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "postgresql" });
  });
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const data = credentials(req.body);
    if (!data) {
      res.status(400).json({
        error:
          "Pseudo : 3 à 24 lettres, chiffres, _ ou -. Mot de passe : 10 à 128 caractères.",
      });
      return;
    }
    const id = randomUUID();
    try {
      await pool.query(
        "INSERT INTO players(id,username,username_key,password_hash) VALUES($1,$2,$3,$4)",
        [id, data.username, data.key, await passwordHash(data.password)],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Ce pseudo est déjà utilisé." });
        return;
      }
      throw error;
    }
    const expiresAt = await newSession(req, res, id);
    res
      .status(201)
      .json({ player: { id, username: data.username }, expiresAt, save: null });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const data = credentials(req.body);
    if (!data) {
      res.status(401).json({ error: "Pseudo ou mot de passe incorrect." });
      return;
    }
    const result = await pool.query(
      "SELECT id,username,password_hash FROM players WHERE username_key=$1",
      [data.key],
    );
    const row = result.rows[0];
    const valid = await verify(
      data.password,
      row?.password_hash ??
        "scrypt-v1:" + "0".repeat(32) + ":" + "0".repeat(128),
    );
    if (!row || !valid) {
      res.status(401).json({ error: "Pseudo ou mot de passe incorrect." });
      return;
    }
    const expiresAt = await newSession(req, res, row.id);
    res.json({
      player: { id: row.id, username: row.username },
      expiresAt,
      save: await getSave(row.id),
    });
  });
  app.get(
    "/api/session",
    (req, res, next) => {
      // Discovering a guest session is normal; protected save routes still use 401.
      if (!token(req)) {
        res.status(204).end();
        return;
      }
      return authenticate(req, res, next);
    },
    async (_req, res) => {
      const s = res.locals.session as Session;
      res.json({
        player: { id: s.playerId, username: s.username },
        expiresAt: s.expiresAt,
        save: await getSave(s.playerId),
      });
    },
  );
  app.post("/api/auth/logout", async (req, res) => {
    const raw = token(req);
    if (raw)
      await pool.query("DELETE FROM player_sessions WHERE token_hash=$1", [
        hashToken(raw),
      ]);
    cookie(res, "", 0);
    res.status(204).end();
  });
  app.get("/api/save", authenticate, async (_req, res) =>
    res.json({ save: await getSave((res.locals.session as Session).playerId) }),
  );
  app.put("/api/save", authenticate, async (req, res) => {
    const {
      farm,
      revision,
      schemaVersion,
      writeId: suppliedWriteId,
    } = req.body ?? {};
    if (
      suppliedWriteId !== undefined &&
      (typeof suppliedWriteId !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          suppliedWriteId,
        ))
    ) {
      res.status(400).json({ error: "Identifiant d’écriture invalide." });
      return;
    }
    const writeId = suppliedWriteId ?? randomUUID();
    if (
      schemaVersion !== 1 ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      !validFarm(farm)
    ) {
      res
        .status(400)
        .json({ error: "Sauvegarde invalide ou format incompatible." });
      return;
    }
    const id = (res.locals.session as Session).playerId;
    const query =
      revision === 0
        ? await pool.query(
            "INSERT INTO farm_saves(player_id,state,revision,last_write_id) VALUES($1,$2,1,$3) ON CONFLICT DO NOTHING RETURNING revision,updated_at",
            [id, JSON.stringify(farm), writeId],
          )
        : await pool.query(
            "UPDATE farm_saves SET state=$2,revision=revision+1,updated_at=now(),last_write_id=$4 WHERE player_id=$1 AND revision=$3 RETURNING revision,updated_at",
            [id, JSON.stringify(farm), revision, writeId],
          );
    if (!query.rowCount) {
      const latest = await pool.query(
        "SELECT revision,last_write_id,updated_at FROM farm_saves WHERE player_id=$1",
        [id],
      );
      if (latest.rows[0]?.last_write_id === writeId) {
        res.json({
          revision: latest.rows[0].revision,
          updatedAt: latest.rows[0].updated_at,
        });
        return;
      }
      res.status(409).json({
        error: "Une autre session a modifié cette ferme.",
        code: "save_conflict",
        revision: latest.rows[0]?.revision ?? 0,
      });
      return;
    }
    res.json({
      revision: query.rows[0].revision,
      updatedAt: query.rows[0].updated_at,
    });
  });
  // Named snapshots are separate from the revision-protected active autosave.
  app.get("/api/slots", authenticate, async (_req, res) => {
    const result = await pool.query(
      "SELECT id,name,created_at FROM farm_slots WHERE player_id=$1 ORDER BY created_at DESC",
      [(res.locals.session as Session).playerId],
    );
    res.json({
      slots: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      })),
    });
  });
  app.post("/api/slots", authenticate, async (req, res) => {
    const { id, name, farm } = req.body ?? {};
    if (
      typeof id !== "string" ||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ||
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 60 ||
      !validFarm(farm)
    ) {
      res
        .status(400)
        .json({ error: "Nom ou sauvegarde invalide (60 caractères maximum)." });
      return;
    }
    const player = (res.locals.session as Session).playerId;
    // Immutable IDs make retries safe without overwriting another snapshot.
    await pool.query(
      "INSERT INTO farm_slots(player_id,id,name,state) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [player, id, name.trim(), JSON.stringify(farm)],
    );
    res.status(201).json({ id });
  });
  app.get("/api/slots/:id", authenticate, async (req, res) => {
    const result = await pool.query(
      "SELECT COALESCE(game_restore_save(player_id,id::text),state) AS state FROM farm_slots WHERE player_id=$1 AND id::text=$2",
      [(res.locals.session as Session).playerId, req.params.id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Sauvegarde introuvable." });
      return;
    }
    res.json({ farm: result.rows[0].state });
  });
  app.delete("/api/slots/:id", authenticate, async (req, res) => {
    const result = await pool.query(
      "DELETE FROM farm_slots WHERE player_id=$1 AND id::text=$2",
      [(res.locals.session as Session).playerId, req.params.id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Sauvegarde introuvable." });
      return;
    }
    res.sendStatus(204);
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Route API inconnue." }),
  );
  if (options.serveFrontend) {
    const root = path.resolve("dist");
    app.use(express.static(root));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.join(root, "index.html")),
    );
  }
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const e = error as { status?: number; type?: string };
      if (e.status === 413) {
        res.status(413).json({ error: "La sauvegarde dépasse 2 Mo." });
        return;
      }
      if (e.status === 400) {
        res.status(400).json({ error: "Requête JSON invalide." });
        return;
      }
      console.error("Erreur API PostgreSQL ou serveur.");
      res.status(503).json({
        error: "Sauvegarde indisponible. Votre copie locale reste conservée.",
      });
    },
  );
  return app;
}

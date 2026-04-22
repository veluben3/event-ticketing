import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

fs.mkdirSync(env.upload.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const sub = (req.params.eventId as string) || 'misc';
    const dir = path.join(env.upload.dir, 'events', sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxBytes, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      return cb(HttpError.validation('Only JPG/PNG/WEBP/GIF images allowed'));
    }
    cb(null, true);
  },
});

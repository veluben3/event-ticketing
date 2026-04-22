import type { Request, Response } from 'express';
import path from 'path';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { eventsService } from '../services/events.service';

function fileToPublicUrl(req: Request, absolutePath: string): string {
  const rel = path.relative(env.upload.dir, absolutePath).split(path.sep).join('/');
  return `${req.protocol}://${req.get('host')}${env.upload.publicPath}/${rel}`;
}

export const uploadController = {
  async single(req: Request, res: Response) {
    if (!req.file) throw HttpError.validation('file is required');
    const url = fileToPublicUrl(req, req.file.path);
    res.json({ url, filename: req.file.filename, size: req.file.size });
  },

  async eventImage(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    if (!req.file) throw HttpError.validation('file is required');
    const url = fileToPublicUrl(req, req.file.path);
    const image = await eventsService.attachImage(
      req.params.eventId,
      url,
      req.user.sub,
      req.user.role,
    );
    res.status(201).json({ url, image });
  },
};

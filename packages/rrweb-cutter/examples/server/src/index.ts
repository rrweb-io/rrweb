import * as fs from 'fs';
import express, { Request, Response } from 'express';
import { eventWithTime } from '@rrweb/types';
import { cutSession } from '@rrweb/cutter';

const app = express();

// Sample events load from file.
// You can replace this with your own events loaded from other places (DataBase, Network, etc).
const events: eventWithTime[] = JSON.parse(
  fs.readFileSync('./events1.json').toString(),
);

app.get('/events/:timepoint', (req: Request, res: Response) => {
  const timepoint = parseInt(req.params.timepoint);
  const sessions = cutSession(events, {
    points: [timepoint],
  });
  if (sessions.length < 2)
    return res.json({
      error: 'Invalid timepoint',
    });
  return res.json(sessions[1].events);
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

import { config } from './config';

/** The link people share: the short share host. */
export function shareUrl(slug: string): string {
  return `${config.SHARE_URL}/w/${slug}`;
}

export function profileUrl(username: string): string {
  return `${config.BASE_URL}/u/${encodeURIComponent(username)}`;
}

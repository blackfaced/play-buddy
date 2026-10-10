import { clockworkEpisode } from './episodes/clockwork';
import { shadowEpisode } from './episodes/shadow';
import { greenhouseEpisode } from './episodes/greenhouse';
import { radioEpisode } from './episodes/radio';
import { musicEpisode } from './episodes/music';
import { cargoEpisode } from './episodes/cargo';
import { observatoryEpisode } from './episodes/observatory';
import type { EpisodeDefinition } from './types';
export const CAMPAIGN_EPISODES: readonly EpisodeDefinition[] = [clockworkEpisode,shadowEpisode,greenhouseEpisode,radioEpisode,musicEpisode,cargoEpisode,observatoryEpisode];

import type { ComponentType, ReactNode } from 'react';
import type { GuidanceMode } from '../guidancePolicy';
export const CAMPAIGN_IDS = ['clockwork', 'shadow', 'greenhouse', 'radio', 'music', 'cargo', 'observatory'] as const;
export type CampaignId = typeof CAMPAIGN_IDS[number];
export type EpisodeValue = number | string | boolean | number[] | string[];
export interface EpisodeState {
  values: Record<string, EpisodeValue>;
  solved: string[];
  inventory: string[];
  inspected: string[];
}
export interface EpisodeProps {
  state: EpisodeState;
  update: (patch: Partial<EpisodeState>) => void;
  complete: () => void;
  announce: (message: string) => void;
  mode: GuidanceMode;
  openDetail: (title: string, content: ReactNode | ((props: EpisodeProps) => ReactNode)) => void;
  closeDetail: () => void;
}
export interface EpisodeDefinition {
  id: CampaignId;
  title: string;
  place: string;
  description: string;
  motif: string;
  initial: () => EpisodeState;
  /** Recompute derived inventory/solved flags from actual physical state; never trust saved flags. */
  normalize: (state: EpisodeState) => EpisodeState;
  isComplete: (state: EpisodeState) => boolean;
  hints: (state: EpisodeState) => readonly [string, string, string];
  Component: ComponentType<EpisodeProps>;
}

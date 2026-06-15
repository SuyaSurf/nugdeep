import { apiFetch } from './api';

export interface Activity {
  id: number;
  day_of_year: number;
  prompt: string;
  type: string;
  options: Array<{ value: string; label: string; icon?: string }>;
}

export interface QueueResponse {
  status: 'queued' | 'matched';
  match_id?: string;
  queued_at?: number;
}

export interface MatchResult {
  match: boolean;
}

export interface AIGameResponse {
  match_id: string;
  opponent: string;
  game_mode: string;
}

export function getTodaysActivity(): Promise<Activity> {
  return apiFetch('/api/v1/lobby/activity');
}

export function joinQueue(params: {
  intent: string;
  game: string;
  activity_code: string;
  choice: string;
}, token?: string | null): Promise<QueueResponse> {
  return apiFetch('/api/v1/lobby/queue', {
    method: 'POST',
    body: JSON.stringify(params),
    token,
  });
}

export function leaveQueue(token?: string | null): Promise<void> {
  return apiFetch('/api/v1/lobby/queue', { method: 'DELETE', token });
}

export function pickLocations(matchId: string, locationIds: string[], token?: string | null): Promise<void> {
  return apiFetch(`/api/v1/lobby/${matchId}/locations`, {
    method: 'POST',
    body: JSON.stringify({ location_ids: locationIds }),
    token,
  });
}

export function chooseLocation(matchId: string, locationId: string, token?: string | null): Promise<MatchResult> {
  return apiFetch(`/api/v1/lobby/${matchId}/choose-location`, {
    method: 'POST',
    body: JSON.stringify({ location_id: locationId }),
    token,
  });
}

export function startAIGame(token?: string | null): Promise<AIGameResponse> {
  return apiFetch('/api/v1/lobby/ai', { method: 'POST', token });
}

export function reportGameResult(matchId: string, winnerId: string, token?: string | null): Promise<void> {
  return apiFetch(`/api/v1/lobby/${matchId}/result`, {
    method: 'POST',
    body: JSON.stringify({ winner_id: winnerId }),
    token,
  });
}

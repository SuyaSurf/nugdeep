import { apiFetch } from "./api.ts";

export type ChallengeType = "the_button" | "palette" | "quick_draw" | "food_remedy";
export type QuizType = "culture" | "language";

export interface QuizQuestion {
	question: string;
	options: string[];
}

export interface TodayResponse {
	date: string;
	destination: {
		country_code: string;
		country_name: string;
		region: string;
		flag_emoji: string;
		challenge_type: ChallengeType;
		challenge_params: Record<string, unknown>;
		score_threshold: number;
		daily_fact?: string;
		deep_dive_facts?: string[];
		quiz_culture?: QuizQuestion[];
		quiz_language?: QuizQuestion[];
	};
	status: {
		unlocked: boolean;
		completed_today: boolean;
		expedition_score: number;
		quiz_culture_score: number;
		quiz_language_score: number;
		total_score: number;
	};
	streak: {
		current_streak: number;
		longest_streak: number;
		streak_shields: number;
		active_rewards: string[];
	};
	atlas: {
		discovered: number;
		total: number;
	};
}

export interface CompleteRequest {
	country_code: string;
	challenge_type: ChallengeType;
	raw_score: number;
	duration_ms: number;
	accuracy: number;
}

export interface CompleteResponse {
	unlocked: boolean;
	country_code: string;
	country_name: string;
	flag_emoji: string;
	daily_fact?: string;
	expedition_score: number;
	score_threshold: number;
	total_score?: number;
	streak: {
		current_streak: number;
		longest_streak: number;
		streak_shields: number;
		active_rewards: string[];
	};
	leaderboard_rank?: number;
}

export interface QuizRequest {
	country_code: string;
	quiz_type: QuizType;
	answers: number[];
}

export interface QuizResponse {
	quiz_type: QuizType;
	score: number;
	correct: number;
	total: number;
	streak_shield_earned: boolean;
	deep_dive_facts: string[];
	total_score: number;
}

export interface AtlasEntry {
	country_code: string;
	country_name: string;
	region: string;
	flag_emoji: string;
	discovered_date: string;
	expedition_score: number;
	quiz_culture_score: number;
	quiz_language_score: number;
	total_score: number;
	streak_shield_earned: boolean;
}

export interface AtlasResponse {
	unlocked: AtlasEntry[];
	locked: Array<{
		country_code: string;
		country_name?: string;
		region: string;
		flag_emoji?: string;
		score_target?: number;
		challenge_type?: ChallengeType;
	}>;
}

export interface CountryResponse {
	country_code: string;
	country_name: string;
	region: string;
	flag_emoji: string;
	unlocked: boolean;
	daily_fact?: string;
	deep_dive_facts?: string[];
	discovered_date?: string;
	expedition_score?: number;
	quiz_culture_score?: number;
	quiz_language_score?: number;
	total_score?: number;
	streak_shield_earned?: boolean;
}

export interface LeaderboardEntry {
	rank: number;
	user_id: string;
	country_code: string;
	total_score: number;
}

export interface LeaderboardResponse {
	date: string;
	entries: LeaderboardEntry[];
}

export async function getExpeditionToday(token: string | null): Promise<TodayResponse> {
	return apiFetch("/api/v1/expedition/today", { token });
}

export async function completeExpedition(
	token: string | null,
	req: CompleteRequest,
): Promise<CompleteResponse> {
	return apiFetch("/api/v1/expedition/complete", {
		method: "POST",
		token,
		body: JSON.stringify(req),
	});
}

export async function submitExpeditionQuiz(
	token: string | null,
	req: QuizRequest,
): Promise<QuizResponse> {
	return apiFetch("/api/v1/expedition/quiz", {
		method: "POST",
		token,
		body: JSON.stringify(req),
	});
}

export async function getExpeditionAtlas(token: string | null): Promise<AtlasResponse> {
	return apiFetch("/api/v1/atlas", { token });
}

export async function getExpeditionCountry(
	token: string | null,
	countryCode: string,
): Promise<CountryResponse> {
	return apiFetch(`/api/v1/atlas/${countryCode}`, { token });
}

export async function getExpeditionLeaderboard(
	token: string | null,
	date: string,
	n = 20,
): Promise<LeaderboardResponse> {
	return apiFetch(`/api/v1/expedition/leaderboard/${date}?n=${n}`, { token });
}

export interface AtlasStats {
	discovered: number;
	total: number;
	completionPercentage: number;
	totalScore: number;
	shieldsEarned: number;
}

export interface RegionProgress {
	region: string;
	discovered: number;
	total: number;
	completionPercentage: number;
}

export interface ExpeditionSharePayload {
	countryName: string;
	flagEmoji: string;
	dailyFact: string;
	score: number;
	rank?: number;
	streak: number;
	discovered: number;
	total: number;
	url: string;
}

export function getAtlasStats(atlas: AtlasResponse): AtlasStats {
	const discovered = atlas.unlocked.length;
	const total = atlas.unlocked.length + atlas.locked.length;
	return {
		discovered,
		total,
		completionPercentage: total > 0 ? Math.round((discovered / total) * 100) : 0,
		totalScore: atlas.unlocked.reduce((sum, entry) => sum + entry.total_score, 0),
		shieldsEarned: atlas.unlocked.filter((entry) => entry.streak_shield_earned).length,
	};
}

export function getRegionProgress(atlas: AtlasResponse): RegionProgress[] {
	const regions = new Map<string, { discovered: number; total: number }>();
	for (const entry of atlas.unlocked) {
		const current = regions.get(entry.region) ?? { discovered: 0, total: 0 };
		current.discovered += 1;
		current.total += 1;
		regions.set(entry.region, current);
	}
	for (const entry of atlas.locked) {
		const current = regions.get(entry.region) ?? { discovered: 0, total: 0 };
		current.total += 1;
		regions.set(entry.region, current);
	}
	return Array.from(regions.entries())
		.map(([region, progress]) => ({
			region,
			discovered: progress.discovered,
			total: progress.total,
			completionPercentage: progress.total > 0 ? Math.round((progress.discovered / progress.total) * 100) : 0,
		}))
		.sort((a, b) => b.discovered - a.discovered || a.region.localeCompare(b.region));
}

export function getQuizProgressLabel(cultureScore: number, languageScore: number): string {
	return `Culture ${Math.round(cultureScore / 100)}/3 / Language ${Math.round(languageScore / 100)}/3`;
}

export function buildExpeditionShareText(payload: ExpeditionSharePayload): string {
	const rank = payload.rank ? ` Rank #${payload.rank}.` : "";
	return `${payload.flagEmoji} I unlocked ${payload.countryName} on Nugdeep. ${payload.discovered}/${payload.total} found. ${payload.streak}-day streak.${rank}\n\n${payload.dailyFact}\n\nCan you unlock today's country? ${payload.url}`;
}

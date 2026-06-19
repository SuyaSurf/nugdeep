import { describe, it } from "node:test";
import assert from "node:assert";
import {
	buildExpeditionShareText,
	getAtlasStats,
	getQuizProgressLabel,
	getRegionProgress,
	type AtlasResponse,
	type CompleteResponse,
	type CountryResponse,
	type LeaderboardResponse,
	type QuizResponse,
	type TodayResponse,
} from "./expedition.ts";

describe("expedition types", () => {
	it("TodayResponse has expected structure", () => {
		const response: TodayResponse = {
			date: "2026-06-17",
			destination: {
				country_code: "JP",
				country_name: "Japan",
				region: "East Asia",
				flag_emoji: "🇯🇵",
				challenge_type: "palette",
				challenge_params: { theme: "country_unlock" },
				score_threshold: 700,
			},
			status: {
				unlocked: false,
				completed_today: false,
				expedition_score: 0,
				quiz_culture_score: 0,
				quiz_language_score: 0,
				total_score: 0,
			},
			streak: {
				current_streak: 5,
				longest_streak: 7,
				streak_shields: 1,
				active_rewards: ["bronze_compass"],
			},
			atlas: {
				discovered: 12,
				total: 30,
			},
		};
		assert.strictEqual(response.date, "2026-06-17");
		assert.strictEqual(response.destination.country_code, "JP");
		assert.strictEqual(response.status.unlocked, false);
		assert.strictEqual(response.streak.current_streak, 5);
	});

	it("CompleteResponse has expected structure", () => {
		const response: CompleteResponse = {
			unlocked: true,
			country_code: "JP",
			country_name: "Japan",
			flag_emoji: "🇯🇵",
			daily_fact: "The Shinkansen's average delay is less than one minute.",
			expedition_score: 850,
			score_threshold: 700,
			streak: {
				current_streak: 6,
				longest_streak: 7,
				streak_shields: 1,
				active_rewards: ["bronze_compass"],
			},
			leaderboard_rank: 15,
		};
		assert.strictEqual(response.unlocked, true);
		assert.strictEqual(response.country_code, "JP");
		assert.strictEqual(response.leaderboard_rank, 15);
	});

	it("QuizResponse has expected structure", () => {
		const response: QuizResponse = {
			quiz_type: "culture",
			score: 200,
			correct: 2,
			total: 3,
			streak_shield_earned: false,
			deep_dive_facts: ["Fact 1", "Fact 2"],
			total_score: 1050,
		};
		assert.strictEqual(response.quiz_type, "culture");
		assert.strictEqual(response.score, 200);
		assert.strictEqual(response.correct, 2);
		assert.strictEqual(response.total, 3);
	});

	it("AtlasResponse has expected structure", () => {
		const response: AtlasResponse = {
			unlocked: [
				{
					country_code: "JP",
					country_name: "Japan",
					region: "East Asia",
					flag_emoji: "JP",
					discovered_date: "2026-06-17",
					expedition_score: 850,
					quiz_culture_score: 200,
					quiz_language_score: 200,
					total_score: 1250,
					streak_shield_earned: false,
				},
			],
			locked: [
				{
					country_code: "BR",
					region: "South America",
				},
			],
		};
		assert.strictEqual(response.unlocked.length, 1);
		assert.strictEqual(response.locked.length, 1);
		assert.strictEqual(response.unlocked[0].country_code, "JP");
	});

	it("CountryResponse has expected structure", () => {
		const response: CountryResponse = {
			country_code: "JP",
			country_name: "Japan",
			region: "East Asia",
			flag_emoji: "🇯🇵",
			unlocked: true,
			daily_fact: "The Shinkansen's average delay is less than one minute.",
			deep_dive_facts: ["Fact 1", "Fact 2"],
			discovered_date: "2026-06-17",
			expedition_score: 850,
			quiz_culture_score: 200,
			quiz_language_score: 200,
			total_score: 1250,
			streak_shield_earned: false,
		};
		assert.strictEqual(response.unlocked, true);
		assert.strictEqual(response.country_code, "JP");
		assert.strictEqual(response.deep_dive_facts?.length, 2);
	});

	it("LeaderboardResponse has expected structure", () => {
		const response: LeaderboardResponse = {
			date: "2026-06-17",
			entries: [
				{
					rank: 1,
					user_id: "user-123",
					country_code: "JP",
					total_score: 1500,
				},
			],
		};
		assert.strictEqual(response.date, "2026-06-17");
		assert.strictEqual(response.entries.length, 1);
		assert.strictEqual(response.entries[0].rank, 1);
	});

	it("getAtlasStats includes locked countries in the collection total", () => {
		const atlas: AtlasResponse = {
			unlocked: [
				{
					country_code: "JP",
					country_name: "Japan",
					region: "East Asia",
					flag_emoji: "🇯🇵",
					discovered_date: "2026-06-17",
					expedition_score: 850,
					quiz_culture_score: 300,
					quiz_language_score: 200,
					total_score: 1350,
					streak_shield_earned: false,
				},
			],
			locked: [
				{ country_code: "BR", country_name: "Brazil", region: "South America", flag_emoji: "BR" },
				{ country_code: "EG", country_name: "Egypt", region: "North Africa", flag_emoji: "EG" },
			],
		};

		assert.deepStrictEqual(getAtlasStats(atlas), {
			discovered: 1,
			total: 3,
			completionPercentage: 33,
			totalScore: 1350,
			shieldsEarned: 0,
		});
	});

	it("getRegionProgress groups locked and unlocked countries together", () => {
		const atlas: AtlasResponse = {
			unlocked: [
				{
					country_code: "JP",
					country_name: "Japan",
					region: "East Asia",
					flag_emoji: "JP",
					discovered_date: "2026-06-17",
					expedition_score: 850,
					quiz_culture_score: 300,
					quiz_language_score: 300,
					total_score: 1450,
					streak_shield_earned: true,
				},
			],
			locked: [
				{ country_code: "KR", country_name: "South Korea", region: "East Asia", flag_emoji: "KR" },
			],
		};

		assert.deepStrictEqual(getRegionProgress(atlas), [
			{ region: "East Asia", discovered: 1, total: 2, completionPercentage: 50 },
		]);
	});

	it("getQuizProgressLabel summarizes quiz progress", () => {
		assert.strictEqual(getQuizProgressLabel(300, 200), "Culture 3/3 / Language 2/3");
	});

	it("buildExpeditionShareText is compact and includes atlas progress", () => {
		const text = buildExpeditionShareText({
			countryName: "Japan",
			flagEmoji: "JP",
			dailyFact: "The Shinkansen's average delay is less than one minute.",
			score: 842,
			streak: 7,
			discovered: 12,
			total: 30,
			url: "https://nugdeep.suya.surf",
		});

		assert.match(text, /Japan/);
		assert.match(text, /12\/30/);
		assert.match(text, /7-day streak/);
	});
});

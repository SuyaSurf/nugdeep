"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Globe } from "lucide-react";
import { getExpeditionToday, type TodayResponse } from "@/lib/expedition";

export function ExpeditionCard() {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<TodayResponse | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		async function load() {
			if (!isLoaded) return;
			if (!isSignedIn) {
				setLoading(false);
				return;
			}
			try {
				const token = await getToken();
				setData(await getExpeditionToday(token));
			} catch (e: any) {
				setError(e.message || "Failed to load expedition");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [getToken, isLoaded, isSignedIn]);

	if (loading) {
		return (
			<div className="intent-card" style={{ opacity: 0.5 }}>
				<span className="intent-card__number">04</span>
				<Globe className="intent-card__icon" aria-hidden="true" />
				<span className="intent-card__copy">
					<strong>Daily Expedition</strong>
					<span>Loading today&apos;s route...</span>
				</span>
			</div>
		);
	}

	if (error || !data) return null;

	return (
		<a
			href="/expedition"
			className="intent-card"
			style={{ "--intent-accent": "#e94560" } as React.CSSProperties}
			aria-label="Start today's daily expedition"
		>
			<span className="intent-card__number">04</span>
			<Globe className="intent-card__icon" aria-hidden="true" />
			<span className="intent-card__copy">
				<strong>Daily Expedition</strong>
				<span>
					{data.status.unlocked
						? `Unlocked ${data.destination.country_name}. Deep dive or open your atlas.`
						: "Today's destination is hiding. Prove your skill to reveal it."}
				</span>
			</span>
			<small>
				{data.status.unlocked ? data.destination.flag_emoji : data.destination.region} /{" "}
				{data.streak.current_streak} day streak / {data.atlas.discovered}/{data.atlas.total}
			</small>
		</a>
	);
}

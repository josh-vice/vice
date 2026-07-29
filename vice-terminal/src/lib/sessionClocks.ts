export type MarketSession = {
	id: string;
	city: string;
	venue: string;
	timeZone: string;
	openHour: number;
	closeHour: number;
};

export type SessionClock = MarketSession & {
	weekday: string;
	time: string;
	open: boolean;
};

export const marketSessions: readonly MarketSession[] = [
	{ id: 'nyse', city: 'New York', venue: 'NYSE', timeZone: 'America/New_York', openHour: 9.5, closeHour: 16 },
	{ id: 'lse', city: 'London', venue: 'LSE', timeZone: 'Europe/London', openHour: 8, closeHour: 16.5 },
	{ id: 'tse', city: 'Tokyo', venue: 'TSE', timeZone: 'Asia/Tokyo', openHour: 9, closeHour: 15 },
	{ id: 'asx', city: 'Sydney', venue: 'ASX', timeZone: 'Australia/Sydney', openHour: 10, closeHour: 16 }
];

type ClockParts = Record<string, string>;

function clockParts(date: Date, timeZone: string): ClockParts {
	return new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(date).reduce<ClockParts>((parts, part) => {
		if (part.type !== 'literal') parts[part.type] = part.value;
		return parts;
	}, {});
}

export function isSessionOpen(weekday: string, hour: number, minute: number, session: MarketSession): boolean {
	const localHour = hour + minute / 60;
	return weekday !== 'Sat' && weekday !== 'Sun' && localHour >= session.openHour && localHour < session.closeHour;
}

export function sessionClock(session: MarketSession, date = new Date()): SessionClock {
	const parts = clockParts(date, session.timeZone);
	const hour = Number(parts.hour);
	const minute = Number(parts.minute);
	return {
		...session,
		weekday: parts.weekday,
		time: `${parts.hour}:${parts.minute}:${parts.second}`,
		open: isSessionOpen(parts.weekday, hour, minute, session)
	};
}

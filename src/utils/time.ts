const DURATION_UNITS_MS = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
	w: 604_800_000,
} as const;

type DurationUnit = keyof typeof DURATION_UNITS_MS;

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/i;

/**
 * Convert a duration such as `15m`, `2h`, `7d`, or plain seconds into
 * milliseconds. Numeric input is treated as seconds, matching the semantics
 * of `jsonwebtoken`'s `expiresIn` option.
 */
export function parseDurationToMs(value: string | number): number {
	if (typeof value === "number") {
		if (!Number.isFinite(value) || value <= 0) {
			throw new Error("Duration must be a positive number");
		}

		return Math.round(value * 1_000);
	}

	const match = DURATION_PATTERN.exec(value.trim());
	if (!match) {
		throw new Error(`Invalid duration: "${value}"`);
	}

	const amount = Number(match[1]);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error(`Invalid duration: "${value}"`);
	}

	const unit = (match[2]?.toLowerCase() ?? "s") as DurationUnit;
	return Math.round(amount * DURATION_UNITS_MS[unit]);
}

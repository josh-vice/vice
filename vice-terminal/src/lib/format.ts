/** Production-safe display formatting helpers. These contain no market or
 * account data and are intentionally separate from development fixtures. */
export const formatPrice = (price: number, decimals = 2): string => {
	if (price >= 1000) {
		return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
	}
	return price.toFixed(decimals);
};

export const formatVolume = (volume: number): string => {
	if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
	if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
	if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
	return `$${volume.toFixed(2)}`;
};

export const formatSize = (size: number): string => {
	if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(2)}M`;
	if (size >= 1_000) return `${(size / 1_000).toFixed(2)}K`;
	return size.toFixed(4);
};

export const formatTime = (timestamp: number): string => new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });

export const formatDate = (value: string | number | Date): string =>
	new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

import type { Order } from '$lib/types';

export function liveOrderPrice(order: Pick<Order, 'price' | 'triggerPrice'>): number | null {
	const price = order.triggerPrice ?? order.price ?? null;
	return price !== null && Number.isFinite(price) ? price : null;
}

export function liveOrderStatusLabel(order: Pick<Order, 'status' | 'pending' | 'error'>): string {
	if (order.pending) return 'PENDING';
	if (order.error) return 'REJECTED';
	return order.status.toUpperCase();
}

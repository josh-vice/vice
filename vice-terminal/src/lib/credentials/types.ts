import type { VenueEnvironment } from '$lib/venue/adapter';
import type { VenueId } from '$lib/venue/identity';

/** Permissions that can be stored for a venue API key. Transfer is deliberate absent. */
export type TradingPermission = 'read' | 'trade';

/** Venue credentials are only available through `withUnlockedCredentials`. */
export interface CredentialInput {
	apiKey: string;
	secret: string;
	passphrase: string;
}

/** Non-secret account metadata safe for UI state and account selectors. */
export interface SavedVenueAccount {
	id: string;
	venue: VenueId;
	label: string;
	environment: VenueEnvironment;
	permissions: readonly TradingPermission[];
	createdAt: number;
	updatedAt: number;
}

/** The single versioned record persisted in browser storage. */
export interface EncryptedVaultV1 {
	version: 1;
	salt: string;
	iv: string;
	ciphertext: string;
}

/** Input used when adding a new saved account. */
export type NewVenueAccount = Omit<SavedVenueAccount, 'id' | 'createdAt' | 'updatedAt'>;

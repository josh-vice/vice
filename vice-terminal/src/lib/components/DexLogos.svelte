<script lang="ts">
	export let dex: 'hyperliquid' | 'lighter' | 'nado' | 'derive';
	export let size: number = 16;
</script>

{#if dex === 'lighter'}
	<!--
		Lighter: two white parallelogram bars — a tall narrow left bar and a
		shorter wider bar at bottom-right, both slanted ~15deg clockwise.
	-->
	<svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Lighter">
		<!-- Tall left bar -->
		<polygon points="28,4  42,4  37,96  23,96" fill="white"/>
		<!-- Short lower-right bar -->
		<polygon points="52,54  78,54  73,96  47,96" fill="white"/>
	</svg>

{:else if dex === 'hyperliquid'}
	<!--
		Hyperliquid: orange-to-yellow gradient horse-head mark on a black circle.
		The silhouette has a tall forehead, angled snout pointing right, a dark
		diagonal slash through the body, and a small eye notch.
	-->
	<svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Hyperliquid">
		<defs>
			<linearGradient id="hl-g" x1="30%" y1="10%" x2="70%" y2="90%">
				<stop offset="0%"   stop-color="#f96c3a"/>
				<stop offset="100%" stop-color="#f5b800"/>
			</linearGradient>
		</defs>
		<circle cx="50" cy="50" r="50" fill="#111"/>
		<!--
			Horse head: broad top mane/neck, narrows to snout at lower-right.
			Two interlocking quadrilateral shapes with the diagonal gap between them.
		-->
		<!-- Upper shape: mane + neck + head top -->
		<polygon
			points="22,72  30,24  44,18  64,24  68,38  56,34  62,50  54,66  40,72"
			fill="url(#hl-g)"
		/>
		<!-- Lower shape: jaw / chest -->
		<polygon
			points="30,72  40,72  48,82  36,82"
			fill="url(#hl-g)"
		/>
		<!-- Diagonal slash gap -->
		<polygon
			points="30,70  38,40  44,42  36,72"
			fill="#111"
		/>
		<!-- Eye -->
		<ellipse cx="58" cy="36" rx="4" ry="5" fill="#111"/>
	</svg>

{:else if dex === 'nado'}
	<!--
		Nado: white angular geometric mark — three thick chamfered bars forming
		a broken rotary/boomerang shape. One bar goes top-left, one diagonal
		going down-right from center, one short stub at bottom-left.
	-->
	<svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Nado">
		<!-- Top-left horizontal bar -->
		<polygon points="8,28  54,18  58,32  12,42" fill="white"/>
		<!-- Diagonal bar going down-right from center -->
		<polygon points="52,18  66,28  48,76  34,66" fill="white"/>
		<!-- Bottom-left stub -->
		<polygon points="36,66  48,76  42,88  28,80" fill="white"/>
	</svg>

{:else if dex === 'derive'}
	<!--
		Derive: a wide double-hump mint wave shape on a very dark green circle.
		The two bumps sit side by side like a wide letter M or a smooth wave.
	-->
	<svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Derive">
		<circle cx="50" cy="50" r="50" fill="#0a1f15"/>
		<path
			d="
			  M18,62
			  C18,62  20,34  34,34
			  C41,34  44,46  50,46
			  C56,46  59,34  66,34
			  C80,34  82,62  82,62
			  C82,62  77,68  66,68
			  C59,68  56,56  50,56
			  C44,56  41,68  34,68
			  C23,68  18,62  18,62 Z
			"
			fill="#4fffcc"
		/>
	</svg>
{/if}

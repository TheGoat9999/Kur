import part01 from './part-01';
import part02 from './part-02';
import part03 from './part-03';
import part04 from './part-04';
import part05 from './part-05';
import part06 from './part-06';
import part07 from './part-07';
import part08 from './part-08';
import part09 from './part-09';
import part10 from './part-10';

/**
 * Clean generated Market Street / Block 3 environment plate.
 *
 * The image intentionally contains no player, NPC or vehicle actors. Runtime
 * actors remain separate so traffic, parking occupancy and NPC presence stay
 * authoritative and can change without contradicting the environment art.
 *
 * This pilot keeps the generated WebP encoded with the feature because the
 * GitHub connector used by the project cannot upload binary files directly.
 * A later asset-pipeline pass can move the same bytes to /public without
 * changing StreetScene semantics.
 */
const encoded = `${part01}${part02}${part03}${part04}${part05}${part06}${part07}${part08}${part09}${part10}`;

export const MARKET_STREET_BLOCK_3_BACKGROUND = `data:image/webp;base64,${encoded}`;

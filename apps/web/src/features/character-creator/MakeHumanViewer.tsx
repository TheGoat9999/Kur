import { useMemo, useState } from 'react';
import type { CharacterRecipe } from '@sol-dorado/contracts';
import {
  WorldCharacter,
  visualFromCharacterRecipe,
  type WorldCharacterDirection
} from '../../components/WorldCharacter';
import type { CharacterAppearanceRecipe } from './characterRecipe';
import './vector-character-viewer.css';

const DIRECTIONS: Array<{ id: WorldCharacterDirection; label: string; glyph: string }> = [
  { id: 'south', label: 'Front', glyph: '↓' },
  { id: 'east', label: 'Right', glyph: '→' },
  { id: 'north', label: 'Back', glyph: '↑' },
  { id: 'west', label: 'Left', glyph: '←' }
];

/**
 * Kept under the historic MakeHumanViewer export so CharacterView stays
 * regression-safe while the runtime itself moves to the lightweight shared
 * SVG character system. There is no Three.js/network model dependency here.
 */
export function MakeHumanViewer({
  recipe,
  focus = 'full'
}: {
  recipe: CharacterAppearanceRecipe;
  focus?: 'full' | 'face';
}) {
  const [direction, setDirection] = useState<WorldCharacterDirection>('south');
  const [walking, setWalking] = useState(false);
  const visual = useMemo(
    () => visualFromCharacterRecipe(recipe as unknown as CharacterRecipe),
    [recipe]
  );

  return (
    <div className={`vector-character-viewer ${focus === 'face' ? 'vector-character-viewer-face' : ''}`}>
      <header className="vector-character-viewer-head">
        <div>
          <span>SOL DORADO · VECTOR CHARACTER V2</span>
          <b>{visual.body === 'female' ? 'Female base' : 'Male base'} · {visual.build}</b>
        </div>
        <span className="vector-character-runtime-badge">SVG RUNTIME</span>
      </header>

      <div className="vector-character-stage">
        <div className="vector-character-stage-glow" />
        <div className="vector-character-height-line vector-character-height-line-a" />
        <div className="vector-character-height-line vector-character-height-line-b" />
        <WorldCharacter
          visual={visual}
          direction={direction}
          moving={walking}
          className="vector-character-hero"
        />
        <div className="vector-character-ground" />
        <div className="vector-character-stage-meta">
          <span>{visual.hairStyle}</span>
          <span>{visual.outerStyle === 'none' ? visual.topStyle : visual.outerStyle}</span>
          <span>{visual.bottomStyle}</span>
          {visual.tattooStyle !== 'none' && <span>{visual.tattooStyle}</span>}
          {visual.accessoryStyle !== 'none' && <span>{visual.accessoryStyle}</span>}
        </div>
      </div>

      <div className="vector-character-controls">
        <div className="vector-character-directions" role="group" aria-label="Character direction">
          {DIRECTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              className={direction === option.id ? 'active' : ''}
              onClick={() => setDirection(option.id)}
              aria-pressed={direction === option.id}
            >
              <span>{option.glyph}</span>{option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`vector-character-walk ${walking ? 'active' : ''}`}
          onClick={() => setWalking(current => !current)}
          aria-pressed={walking}
        >
          {walking ? 'Stop walk' : 'Preview walk'}
        </button>
      </div>

      <div className="vector-character-turnaround" aria-label="Four direction character preview">
        {DIRECTIONS.map(option => (
          <div key={option.id} className={direction === option.id ? 'active' : ''}>
            <WorldCharacter visual={visual} direction={option.id} />
            <span>{option.label}</span>
          </div>
        ))}
      </div>

      <footer className="vector-character-viewer-foot">
        <span>Shared player + NPC renderer</span>
        <span>No FBX · no texture atlas · no WebGL</span>
      </footer>
    </div>
  );
}

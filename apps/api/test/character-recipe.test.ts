import { describe, expect, it } from 'vitest';
import { CharacterRecipeSchema } from '@sol-dorado/contracts';

const recipe = {
  body: 'female' as const,
  appearance: {
    height: 12,
    weight: -8,
    muscle: 18,
    age: 29,
    skinTone: 'warm-medium',
    eyeColor: 'green'
  },
  grooming: {
    hairStyle: 'bob01',
    hairColor: 'dark-brown',
    equipped: {
      torsoOuter: 'female_casualsuit01',
      legs: 'female_casualsuit01',
      feet: 'shoes01'
    }
  },
  morphs: { shoulders: -10, waist: -16, hips: 12 },
  faceMorphs: { cheekbones: 18, noseWidth: -9, upperLip: 7 }
};

describe('CharacterRecipeSchema', () => {
  it('accepts the production character recipe including live hair and clothing slots', () => {
    const parsed = CharacterRecipeSchema.parse(recipe);
    expect(parsed.body).toBe('female');
    expect(parsed.appearance.eyeColor).toBe('green');
    expect(parsed.grooming.hairStyle).toBe('bob01');
    expect(parsed.grooming.equipped).toEqual({
      torsoOuter: 'female_casualsuit01',
      legs: 'female_casualsuit01',
      feet: 'shoes01'
    });
    expect(parsed.faceMorphs.cheekbones).toBe(18);
  });

  it('rejects unsupported body foundations', () => {
    expect(() => CharacterRecipeSchema.parse({ ...recipe, body: 'alien' })).toThrow();
  });
});

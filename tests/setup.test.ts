import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Project Setup', () => {
  it('should have vitest configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should resolve path aliases', async () => {
    // This verifies that the @ alias resolves correctly
    const pkg = await import('@/package.json');
    expect(pkg.name).toBe('smart-health-ai-platform');
  });

  it('should support property-based testing with fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      })
    );
  });
});

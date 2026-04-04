import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { handleCheckNvzRules } from '../../src/tools/check-nvz-rules.js';
import { createSeededDatabase } from '../helpers/seed-db.js';
import type { Database } from '../../src/db.js';
import { existsSync, unlinkSync } from 'fs';

const TEST_DB = 'tests/test-nvz-rules.db';

describe('check_nvz_rules tool', () => {
  let db: Database;

  beforeAll(() => {
    db = createSeededDatabase(TEST_DB);
  });

  afterAll(() => {
    db.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  test('returns rules for epandage lisier', () => {
    const result = handleCheckNvzRules(db, { activity: 'lisier' });
    expect(result).toHaveProperty('results_count');
    expect((result as { results_count: number }).results_count).toBeGreaterThan(0);
  });

  test('returns rules for fumier', () => {
    const result = handleCheckNvzRules(db, { activity: 'fumier' });
    const typed = result as { results_count: number };
    expect(typed.results_count).toBeGreaterThan(0);
  });

  test('returns not_found for unknown activity', () => {
    const result = handleCheckNvzRules(db, { activity: 'flying helicopters' });
    expect(result).toHaveProperty('error', 'not_found');
  });

  test('rejects unsupported jurisdiction', () => {
    const result = handleCheckNvzRules(db, { activity: 'lisier', jurisdiction: 'DE' });
    expect(result).toHaveProperty('error', 'jurisdiction_not_supported');
  });

  test('returns nitrogen limits', () => {
    const result = handleCheckNvzRules(db, { activity: 'Plafond azote' });
    const typed = result as { rules: Array<{ max_application_rate: string }> };
    expect(typed.rules.length).toBeGreaterThan(0);
    const hasNLimit = typed.rules.some(r => r.max_application_rate?.includes('170'));
    expect(hasNLimit).toBe(true);
  });

  test('returns volailles rules', () => {
    const result = handleCheckNvzRules(db, { activity: 'volailles' });
    const typed = result as { results_count: number };
    expect(typed.results_count).toBeGreaterThan(0);
  });
});

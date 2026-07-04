import { describe, it, expect, vi } from 'vitest';
import { validateEnv, REQUIRED_ENV_VARS, EnvConfig } from './env';

/**
 * Unit tests for environment variable validation (Task 1.4).
 * Validates: Requirements 11.2, 11.3
 */

function makeCompleteEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const varName of REQUIRED_ENV_VARS) {
    env[varName] = `test-value-${varName}`;
  }
  return env;
}

describe('validateEnv', () => {
  it('returns a typed config object when all env vars are present', () => {
    const env = makeCompleteEnv();
    const exit = vi.fn();
    const logger = vi.fn();

    const result = validateEnv({ env, exit, logger });

    expect(result).toBeDefined();
    expect(exit).not.toHaveBeenCalled();
    expect(logger).not.toHaveBeenCalled();

    // Verify all keys are present and have correct values
    for (const varName of REQUIRED_ENV_VARS) {
      expect((result as EnvConfig)[varName]).toBe(`test-value-${varName}`);
    }
  });

  it('calls exit(1) and logs missing vars when all are missing', () => {
    const env: Record<string, string | undefined> = {};
    const exit = vi.fn();
    const logger = vi.fn();

    const result = validateEnv({ env, exit, logger });

    expect(result).toBeUndefined();
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger).toHaveBeenCalledTimes(1);

    // The log message should list all required vars
    const logMessage = logger.mock.calls[0][0];
    for (const varName of REQUIRED_ENV_VARS) {
      expect(logMessage).toContain(varName);
    }
  });

  it('logs exactly the missing variables and no others', () => {
    const env = makeCompleteEnv();
    // Remove two specific variables
    delete env.GEMINI_API_KEY;
    delete env.PORT;

    const exit = vi.fn();
    const logger = vi.fn();

    validateEnv({ env, exit, logger });

    expect(exit).toHaveBeenCalledWith(1);
    const logMessage: string = logger.mock.calls[0][0];

    // Should contain the missing ones
    expect(logMessage).toContain('GEMINI_API_KEY');
    expect(logMessage).toContain('PORT');

    // Should NOT contain the ones that are present
    expect(logMessage).not.toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(logMessage).not.toContain('FIREBASE_ADMIN_PROJECT_ID');
  });

  it('treats empty string values as missing', () => {
    const env = makeCompleteEnv();
    env.GOOGLE_MAPS_API_KEY = '';

    const exit = vi.fn();
    const logger = vi.fn();

    validateEnv({ env, exit, logger });

    expect(exit).toHaveBeenCalledWith(1);
    const logMessage: string = logger.mock.calls[0][0];
    expect(logMessage).toContain('GOOGLE_MAPS_API_KEY');

    // The present ones should not be in the error
    expect(logMessage).not.toContain('GEMINI_API_KEY');
  });

  it('treats undefined values as missing', () => {
    const env = makeCompleteEnv();
    (env as Record<string, string | undefined>).FIREBASE_ADMIN_PRIVATE_KEY = undefined;

    const exit = vi.fn();
    const logger = vi.fn();

    validateEnv({ env, exit, logger });

    expect(exit).toHaveBeenCalledWith(1);
    const logMessage: string = logger.mock.calls[0][0];
    expect(logMessage).toContain('FIREBASE_ADMIN_PRIVATE_KEY');
  });

  it('does not call exit when all vars are valid non-empty strings', () => {
    const env = makeCompleteEnv();
    const exit = vi.fn();
    const logger = vi.fn();

    validateEnv({ env, exit, logger });

    expect(exit).not.toHaveBeenCalled();
    expect(logger).not.toHaveBeenCalled();
  });

  it('reports a single missing variable correctly', () => {
    const env = makeCompleteEnv();
    delete env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    const exit = vi.fn();
    const logger = vi.fn();

    validateEnv({ env, exit, logger });

    expect(exit).toHaveBeenCalledWith(1);
    const logMessage: string = logger.mock.calls[0][0];
    expect(logMessage).toContain('NEXT_PUBLIC_FIREBASE_DATABASE_URL');

    // Ensure only the one missing var is in the message
    const otherVars = REQUIRED_ENV_VARS.filter(
      (v) => v !== 'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
    );
    for (const v of otherVars) {
      expect(logMessage).not.toContain(v);
    }
  });
});

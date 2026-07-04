/**
 * Environment variable validation and startup check.
 *
 * Validates that all required environment variables are defined and non-empty.
 * If any are missing, logs an error listing exactly those variables and exits
 * with a non-zero status code.
 *
 * The exit behavior is injectable for testing purposes.
 */

/**
 * List of all required environment variable names.
 */
export const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'PORT',
] as const;

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

/**
 * Typed configuration object containing all validated environment variable values.
 */
export interface EnvConfig {
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: string;
  FIREBASE_ADMIN_PROJECT_ID: string;
  FIREBASE_ADMIN_CLIENT_EMAIL: string;
  FIREBASE_ADMIN_PRIVATE_KEY: string;
  GEMINI_API_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
  PORT: string;
}

/**
 * Options for validateEnv, allowing injection of dependencies for testing.
 */
export interface ValidateEnvOptions {
  /** Override for process.env. Defaults to process.env. */
  env?: Record<string, string | undefined>;
  /** Override for the exit function. Defaults to process.exit. */
  exit?: (code: number) => void;
  /** Override for the logger. Defaults to console.error. */
  logger?: (message: string) => void;
}

/**
 * Validates that all required environment variables are present (defined and non-empty).
 *
 * If any are missing:
 * - Logs an error message listing exactly the missing variable names.
 * - Calls the exit function with status code 1.
 *
 * If all are present, returns a typed config object.
 *
 * @param options - Injectable dependencies for testability.
 * @returns The validated config object, or undefined if validation fails.
 */
export function validateEnv(options: ValidateEnvOptions = {}): EnvConfig | undefined {
  const env = options.env ?? process.env;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const logger = options.logger ?? ((message: string) => console.error(message));

  const missingVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value = env[varName];
    if (value === undefined || value === '') {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    logger(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
    exit(1);
    return undefined;
  }

  // All variables are present; build the typed config object
  const config: EnvConfig = {
    NEXT_PUBLIC_FIREBASE_API_KEY: env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
    FIREBASE_ADMIN_PROJECT_ID: env.FIREBASE_ADMIN_PROJECT_ID!,
    FIREBASE_ADMIN_CLIENT_EMAIL: env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    FIREBASE_ADMIN_PRIVATE_KEY: env.FIREBASE_ADMIN_PRIVATE_KEY!,
    GEMINI_API_KEY: env.GEMINI_API_KEY!,
    GOOGLE_MAPS_API_KEY: env.GOOGLE_MAPS_API_KEY!,
    PORT: env.PORT!,
  };

  return config;
}

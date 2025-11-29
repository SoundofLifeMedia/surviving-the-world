/**
 * Telemetry Sink
 * Persists telemetry events and incidents to external storage (Neon/Postgres).
 * Safe to use when NEON_DATABASE_URL is not configured (falls back to Noop sink).
 */

import { TelemetryDB } from '../db/neonClient';
import { TelemetryEvent, TelemetryIncident } from './types/TelemetryTypes';

/**
 * Telemetry sink contract
 */
export interface ITelemetrySink {
  logEvent(event: TelemetryEvent): Promise<void>;
  logIncident?(incident: TelemetryIncident): Promise<void>;
  flush?(): Promise<void>;
}

/**
 * No-op sink used when DB is not configured
 */
export class NoopTelemetrySink implements ITelemetrySink {
  async logEvent(): Promise<void> {
    return;
  }
  async logIncident(): Promise<void> {
    return;
  }
  async flush(): Promise<void> {
    return;
  }
}

/**
 * Neon-backed telemetry sink. Uses the shared TelemetryDB helper.
 */
export class NeonTelemetrySink implements ITelemetrySink {
  async logEvent(event: TelemetryEvent): Promise<void> {
    try {
      await TelemetryDB.log(event.eventType, event, undefined, event.traceId);
    } catch (error) {
      console.error('Telemetry sink logEvent failed:', error);
    }
  }

  async logIncident(incident: TelemetryIncident): Promise<void> {
    try {
      await TelemetryDB.log('incident', incident, undefined, incident.traceId);
    } catch (error) {
      console.error('Telemetry sink logIncident failed:', error);
    }
  }

  async flush(): Promise<void> {
    // Neon serverless auto-commits; nothing to flush.
    return;
  }
}

/**
 * Factory that returns a Neon sink when configured, otherwise no-op.
 */
export function createTelemetrySink(): ITelemetrySink {
  // TelemetryDB internally checks sql client presence; if missing we return noop for clarity.
  const hasDb =
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    !!process.env.NEON_DATABASE_URL;

  if (hasDb) {
    return new NeonTelemetrySink();
  }

  return new NoopTelemetrySink();
}

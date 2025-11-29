/**
 * Telemetry Sink Tests
 * Ensures TelemetrySystem forwards events/incidents to sinks
 */

import { TelemetrySystem } from '../src/core/TelemetrySystem';
import { ITelemetrySink } from '../src/core/TelemetrySink';
import { AnomalyThresholds } from '../src/core/types/TelemetryTypes';

class FakeSink implements ITelemetrySink {
  public events: number = 0;
  public incidents: number = 0;
  async logEvent(): Promise<void> {
    this.events++;
  }
  async logIncident(): Promise<void> {
    this.incidents++;
  }
}

describe('Telemetry sink forwarding', () => {
  test('events and incidents are forwarded to sink', () => {
    const sink = new FakeSink();
    const thresholds: Partial<AnomalyThresholds> = {
      excessiveSpawningPerSecond: 1 // low to trigger
    };
    const telemetry = new TelemetrySystem({}, thresholds, sink);

    telemetry.emit('decision_executed', { decisionType: 'spawn', entityId: 'e1' });
    telemetry.emit('decision_executed', { decisionType: 'spawn', entityId: 'e2' });

    // Trigger anomaly detection to persist incident
    telemetry.detectAnomaly();

    expect(sink.events).toBeGreaterThanOrEqual(2);
    expect(sink.incidents).toBeGreaterThanOrEqual(1);
  });
});

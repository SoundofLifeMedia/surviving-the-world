class InstrumentationLogger {
  constructor() {
    this.events = [];
  }

  log(event) {
    const payload = { ...event, timestamp: new Date().toISOString() };
    this.events.push(payload);
    console.log('[INSTRUMENT]', payload);
    return payload;
  }

  triggerAutofix(type, context) {
    const message = {
      type: 'autofix',
      autofixType: type,
      context,
      status: 'pending'
    };
    this.log(message);
  }
}

module.exports = new InstrumentationLogger();

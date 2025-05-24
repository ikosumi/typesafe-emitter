/**
 * Base class for custom errors in TypeSafeEmitter.
 */
export class TypeSafeEmitterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Set the prototype explicitly to allow instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when an event is emitted but has no listeners,
 * and the `throwOnNoListeners` option is enabled.
 */
export class NoListenersError extends TypeSafeEmitterError {
  constructor(eventName: string | number | symbol) {
    super(`No listeners for event "${String(eventName)}"`);
    // Set the prototype explicitly to allow instanceof checks
    Object.setPrototypeOf(this, NoListenersError.prototype);
  }
}

/**
 * Error thrown when an invalid event name is used.
 * (e.g., an empty string).
 */
export class InvalidEventNameError extends TypeSafeEmitterError {
  constructor(message: string) {
    super(message);
    // Set the prototype explicitly to allow instanceof checks
    Object.setPrototypeOf(this, InvalidEventNameError.prototype);
  }
}

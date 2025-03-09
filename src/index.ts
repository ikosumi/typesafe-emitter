/**
 * Type definition for event handlers
 */
type EventHandler<T> = (data: T) => void;

/**
 * Type definition for event map structure
 * Keys are event names, values are the corresponding payload types
 */
export type EventMap = {
  [K: string]: any;
};

/**
 * TypeSafeEmitter class that provides type-safe event handling
 */
export class TypeSafeEmitter<T extends EventMap> {
  private handlers: {
    [K in keyof T]?: Set<EventHandler<T[K]>>;
  } = {};

  /**
   * Subscribe to an event
   * @param eventName The name of the event to subscribe to
   * @param handler The callback function to handle the event
   * @returns An unsubscribe function
   */
  on<K extends keyof T>(eventName: K, handler: EventHandler<T[K]>): () => void {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = new Set();
    }

    this.handlers[eventName]!.add(handler);

    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Unsubscribe from an event
   * @param eventName The name of the event to unsubscribe from
   * @param handler The callback function to remove
   */
  off<K extends keyof T>(eventName: K, handler: EventHandler<T[K]>): void {
    const handlers = this.handlers[eventName];
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        delete this.handlers[eventName];
      }
    }
  }

  /**
   * Emit an event with data
   * @param eventName The name of the event to emit
   * @param data The data to pass to event handlers
   */
  emit<K extends keyof T>(eventName: K, data: T[K]): void {
    const handlers = this.handlers[eventName];
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Subscribe to an event for one-time execution
   * @param eventName The name of the event to subscribe to
   * @param handler The callback function to handle the event
   * @returns An unsubscribe function
   */
  once<K extends keyof T>(eventName: K, handler: EventHandler<T[K]>): () => void {
    const wrappedHandler: EventHandler<T[K]> = (data: T[K]) => {
      this.off(eventName, wrappedHandler);
      handler(data);
    };

    return this.on(eventName, wrappedHandler);
  }

  /**
   * Remove all event handlers
   * @param eventName Optional event name to clear handlers for
   */
  clear<K extends keyof T>(eventName?: K): void {
    if (eventName) {
      delete this.handlers[eventName];
    } else {
      this.handlers = {};
    }
  }
} 
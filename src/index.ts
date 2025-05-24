import { NoListenersError, InvalidEventNameError } from './errors';

/**
 * Type definition for event handlers
 * Can be synchronous or asynchronous (return a Promise).
 */
type EventHandler<T> = (data: T) => void | Promise<void>;

/**
 * Type definition for wildcard event handlers
 * Can be synchronous or asynchronous (return a Promise).
 */
export type WildcardEventHandler = (eventName: string, data: any) => void | Promise<void>;

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
  private starHandlers: Set<WildcardEventHandler> = new Set();
  private wildcardHandlers: Map<string, Set<WildcardEventHandler>> = new Map();
  private throwOnNoListeners: boolean;

  /**
   * Creates an instance of TypeSafeEmitter.
   * @param options Configuration options for the emitter.
   * @param options.throwOnNoListeners If true, the emitter will throw NoListenersError when `emit` is called for an event with no listeners. Defaults to false.
   */
  constructor(options?: { throwOnNoListeners?: boolean }) {
    this.throwOnNoListeners = options?.throwOnNoListeners ?? false;
  }

  /**
   * Validates an event name.
   * Throws InvalidEventNameError if the event name is invalid.
   * @param eventName The event name to validate.
   * @param allowWildcards Whether wildcards are allowed for this operation.
   */
  private validateEventName(eventName: keyof T | string, allowWildcards: boolean = true): void {
    if (typeof eventName === 'string' && eventName.trim() === '') {
      throw new InvalidEventNameError('Event name cannot be an empty string.');
    }
    // Specific validation for non-wildcard operations if needed
    if (!allowWildcards && typeof eventName === 'string' && eventName.includes('*')) {
        throw new InvalidEventNameError(`Wildcard pattern "${eventName}" is not allowed for this operation.`);
    }
  }

  /**
   * Subscribe to an event
   * @param eventName The name of the event to subscribe to. Cannot be an empty string. Wildcards '*' and patterns like 'event.*' or '*.action' are supported.
   * @param handler The callback function to handle the event
   * @returns An unsubscribe function
   * @throws {InvalidEventNameError} If the eventName is an empty string.
   */
  on<K extends keyof T | string>(
    eventName: K,
    handler: K extends keyof T ? EventHandler<T[K]> : WildcardEventHandler
  ): () => void {
    this.validateEventName(eventName);

    if (eventName === '*') {
      this.starHandlers.add(handler as WildcardEventHandler);
      return () => this.off(eventName, handler);
    }

    if (typeof eventName === 'string' && eventName.includes('*')) {
      if (!this.wildcardHandlers.has(eventName)) {
        this.wildcardHandlers.set(eventName, new Set());
      }
      this.wildcardHandlers.get(eventName)!.add(handler as WildcardEventHandler);
      return () => this.off(eventName, handler);
    }

    const event = eventName as keyof T;
    // For specific events, we might not want to allow patterns that weren't caught by the initial wildcard checks.
    // However, 'K extends keyof T' should handle this. If eventName is not in T, it's a string handled by wildcards.
    // If it is in T, it's a specific event.

    if (!this.handlers[event]) {
      this.handlers[event] = new Set();
    }

    this.handlers[event]!.add(handler as EventHandler<T[keyof T]>);

    return () => {
      this.off(event, handler as any); // Use 'as any' to bypass complex type checking here
    };
  }

  /**
   * Unsubscribe from an event
   * @param eventName The name of the event to unsubscribe from. Cannot be an empty string.
   * @param handler The callback function to remove
   * @throws {InvalidEventNameError} If the eventName is an empty string.
   */
  off<K extends keyof T | string>(
    eventName: K,
    handler: K extends keyof T ? EventHandler<T[K]> : WildcardEventHandler
  ): void {
    this.validateEventName(eventName);

    if (eventName === '*') {
      this.starHandlers.delete(handler as WildcardEventHandler);
      return;
    }

    if (typeof eventName === 'string' && eventName.includes('*')) {
      const handlers = this.wildcardHandlers.get(eventName);
      if (handlers) {
        handlers.delete(handler as WildcardEventHandler);
        if (handlers.size === 0) {
          this.wildcardHandlers.delete(eventName);
        }
      }
      return;
    }

    const event = eventName as keyof T;
    const handlers = this.handlers[event];
    if (handlers) {
      handlers.delete(handler as EventHandler<T[keyof T]>);
      if (handlers.size === 0) {
        delete this.handlers[event];
      }
    }
  }

  /**
   * Emit an event with data
   * @param eventName The name of the event to emit. Cannot be an empty string if it's a string type.
   * @param data The data to pass to event handlers
   * @throws {InvalidEventNameError} If the eventName is an empty string.
   * @throws {NoListenersError} If `throwOnNoListeners` is true and no listeners are found for the event.
   */
  emit<K extends keyof T>(eventName: K, data: T[K]): void {
    // Event name validation for emit should not allow wildcards as eventName must be a key of T.
    // However, K can be `keyof T` which might be a string.
    // If K is a string literal type from EventMap, it's fine.
    // If K is `string` (e.g. if EventMap is `[key: string]: any`), then it could be empty.
    // The `keyof T` constraint helps, but if T allows arbitrary string keys, validation is good.
    this.validateEventName(eventName, false); // Do not allow wildcards like '*' or 'foo.*' as actual event names to emit

    const eventNameStr = eventName as string;
    let listenersFound = false;

    // Exact match handlers
    const exactHandlers = this.handlers[eventName];
    if (exactHandlers && exactHandlers.size > 0) {
      exactHandlers.forEach(handler => handler(data));
      listenersFound = true;
    }

    // Star handlers
    if (this.starHandlers.size > 0) {
      this.starHandlers.forEach(handler => handler(eventNameStr, data));
      listenersFound = true;
    }

    // Pattern wildcard handlers
    this.wildcardHandlers.forEach((handlers, pattern) => {
      const parts = pattern.split('*');
      let matches = false;
      if (parts.length === 1) { // e.g. "user." (should be "user.*" to be a pattern) - this case might be redundant if patterns always have '*'
        // This logic implies a pattern "user." matches "user.created".
        // For robustness, patterns should ideally contain '*'.
        // Assuming "user." means "user.*" effectively, or it's a literal prefix.
        // Let's stick to the current interpretation: "user." matches if eventNameStr starts with "user."
        matches = eventNameStr.startsWith(parts[0]);
      } else if (parts.length === 2) {
        if (pattern.startsWith('*') && pattern.endsWith('*')) { // e.g. "*.action.*"
          if (parts[1] === '') { // " * " case, matches any event
            matches = true;
          } else {
            matches = eventNameStr.includes(parts[1]);
          }
        } else if (pattern.startsWith('*')) { // e.g. "*.updated"
          matches = eventNameStr.endsWith(parts[1]);
        } else if (pattern.endsWith('*')) { // e.g. "user.*"
          matches = eventNameStr.startsWith(parts[0]);
        } else { // e.g. "user.*.event"
          matches = eventNameStr.startsWith(parts[0]) && eventNameStr.endsWith(parts[1]) && eventNameStr.length >= (parts[0].length + parts[1].length);
        }
      }
      if (matches && handlers.size > 0) {
        handlers.forEach(handler => handler(eventNameStr, data));
        listenersFound = true;
      }
    });

    if (!listenersFound && this.throwOnNoListeners) {
      throw new NoListenersError(eventNameStr);
    }
  }

  /**
   * Asynchronously emit an event with data and wait for all handlers to complete.
   * @param eventName The name of the event to emit. Cannot be an empty string.
   * @param data The data to pass to event handlers.
   * @returns A promise that resolves when all handlers have completed, or rejects if any handler throws an error or if `throwOnNoListeners` is true and no listeners are found.
   * @throws {InvalidEventNameError} If the eventName is an empty string or an invalid pattern for emit.
   */
  async emitAsync<K extends keyof T>(eventName: K, data: T[K]): Promise<void> {
    this.validateEventName(eventName, false); // Do not allow wildcards like '*' or 'foo.*' as actual event names to emit

    const eventNameStr = eventName as string;
    const promises: Promise<void>[] = [];
    let listenersFound = false;

    // Exact match handlers
    const exactHandlers = this.handlers[eventName];
    if (exactHandlers && exactHandlers.size > 0) {
      exactHandlers.forEach(handler => {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (err) {
          promises.push(Promise.reject(err));
        }
      });
      listenersFound = true;
    }

    // Star handlers
    if (this.starHandlers.size > 0) {
      this.starHandlers.forEach(handler => {
        try {
          const result = handler(eventNameStr, data);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (err) {
          promises.push(Promise.reject(err));
        }
      });
      listenersFound = true;
    }

    // Pattern wildcard handlers
    this.wildcardHandlers.forEach((handlers, pattern) => {
      const parts = pattern.split('*');
      let matches = false;
      if (parts.length === 1) {
        matches = eventNameStr.startsWith(parts[0]);
      } else if (parts.length === 2) {
        if (pattern.startsWith('*') && pattern.endsWith('*')) {
          if (parts[1] === '') { 
            matches = true;
          } else {
            matches = eventNameStr.includes(parts[1]);
          }
        } else if (pattern.startsWith('*')) {
          matches = eventNameStr.endsWith(parts[1]);
        } else if (pattern.endsWith('*')) {
          matches = eventNameStr.startsWith(parts[0]);
        } else {
          matches = eventNameStr.startsWith(parts[0]) && eventNameStr.endsWith(parts[1]) && eventNameStr.length >= (parts[0].length + parts[1].length);
        }
      }
      if (matches && handlers.size > 0) {
        handlers.forEach(handler => {
          try {
            const result = handler(eventNameStr, data);
            if (result instanceof Promise) {
              promises.push(result);
            }
          } catch (err) {
            promises.push(Promise.reject(err));
          }
        });
        listenersFound = true;
      }
    });

    if (!listenersFound && this.throwOnNoListeners) {
      return Promise.reject(new NoListenersError(eventNameStr));
    }

    return Promise.all(promises).then(() => undefined); // Ensure it resolves with void
  }


  /**
   * Subscribe to an event for one-time execution.
   * If the handler is asynchronous, `off` will be called after the promise resolves or rejects.
   * @param eventName The name of the event to subscribe to. Cannot be an empty string.
   * @param handler The callback function to handle the event. Can be synchronous or asynchronous.
   * @returns An unsubscribe function.
   * @throws {InvalidEventNameError} If the eventName is an empty string.
   */
  once<K extends keyof T | string>(
    eventName: K,
    handler: K extends keyof T ? EventHandler<T[K]> : WildcardEventHandler
  ): () => void {
    this.validateEventName(eventName);

    const wrappedHandler = async (nameOrData: string | T[K], data?: any) => {
      // Remove the handler immediately to ensure "once" behavior even for rapid sync emits.
      this.off(eventName, wrappedHandler as any); 

      try {
        let result: void | Promise<void>;
        if (typeof eventName === 'string' && (eventName === '*' || eventName.includes('*'))) {
          // For wildcard, handler expects (eventName, data)
          result = (handler as WildcardEventHandler)(nameOrData as string, data);
        } else {
          // For specific event, handler expects (data)
          result = (handler as EventHandler<T[K]>)(nameOrData as T[K]);
        }
        
        if (result instanceof Promise) {
          await result; // Await the promise if one is returned.
        }
      } catch (err) {
        // The handler has already been removed. If it throws, the error should propagate
        // to the caller of emitAsync if it's an async flow. For sync emit, it's fire-and-forget.
        // Re-throwing allows Promise.all in emitAsync to catch it.
        throw err;
      }
    };

    // When calling 'on', the wrappedHandler should match the type expected by 'on' for the given eventName.
    // When calling 'on', the wrappedHandler should match the type expected by 'on' for the given eventName.
    // The logic within wrappedHandler ensures it behaves correctly based on eventName type.
    // Using 'as any' here to simplify overly complex type inference for TS.
    return this.on(eventName, wrappedHandler as any);
  }

  /**
   * Remove all event handlers
   * @param eventName Optional event name to clear handlers for. If an empty string, it will throw an error.
   * @throws {InvalidEventNameError} If the eventName is provided and is an empty string.
   */
  clear<K extends keyof T | string>(eventName?: K): void {
    if (eventName !== undefined) { // only validate if eventName is provided
        this.validateEventName(eventName);
    }

    if (eventName) {
      if (eventName === '*') {
        this.starHandlers.clear();
      } else if (typeof eventName === 'string' && eventName.includes('*')) {
        this.wildcardHandlers.delete(eventName);
      } else {
        delete this.handlers[eventName as keyof T];
      }
    } else {
      this.handlers = {};
      this.starHandlers.clear();
      this.wildcardHandlers.clear();
    }
  }
} 
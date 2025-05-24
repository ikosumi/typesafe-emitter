# TypeSafe Emitter

A type-safe event emitter for TypeScript that provides compile-time checking for event names and payload types, along with support for wildcard listeners, asynchronous event handling, and enhanced error management.

## Features

- TypeScript support with robust type inference.
- Compile-time checking of event names and payload types.
- **Wildcard Event Listeners:** Subscribe to all events (`*`) or specific patterns (e.g., `user.*`, `*.created`).
- **Asynchronous Event Handling:** Handlers can be `async` and return Promises. Use `emitAsync` to wait for all handlers to complete.
- **Enhanced Error Handling:** Opt-in to receive errors for unhandled events and benefit from specific error types for invalid operations.
- Support for one-time event handlers (`once`).
- Zero dependencies.
- Lightweight and performant.

## Installation

```bash
npm install @ikosumi/typesafe-emitter
```

## Basic Usage

```typescript
import { TypeSafeEmitter } from '@ikosumi/typesafe-emitter'; // Assuming published name

// Define your events interface
interface MyEvents {
  userJoined: { userId: string; username: string };
  messageReceived: { id: number; text: string };
  userLeft: string;
}

// Create a type-safe emitter instance
const emitter = new TypeSafeEmitter<MyEvents>();

// Subscribe to events (handlers can be sync or async)
const unsubscribeUserJoined = emitter.on('userJoined', (data) => {
  console.log(`User ${data.username} joined with ID ${data.userId}`);
});

// One-time event subscription
emitter.once('messageReceived', (data) => {
  console.log(`Got message: ${data.text}`);
});

// Emit events (with type checking)
emitter.emit('userJoined', { userId: '123', username: 'john' }); // ✅ Valid
emitter.emit('messageReceived', { id: 1, text: 'Hello!' }); // ✅ Valid
emitter.emit('userLeft', 'john'); // ✅ Valid

// TypeScript will catch these errors at compile time:
// emitter.emit('userJoined', { userId: '123' }); // ❌ Error: missing username
// emitter.emit('unknownEvent', {}); // ❌ Error: unknown event
// emitter.emit('messageReceived', 'wrong type'); // ❌ Error: invalid payload type

// Unsubscribe when done
unsubscribeUserJoined();
```

## Key Concepts & Advanced Usage

### Wildcard Event Listeners

You can subscribe to multiple events using wildcard patterns:

- **Star Wildcard (`*`):** Listens to all events emitted by the emitter.
- **Pattern Wildcards:** Use `*` within event names to match parts of an event, e.g., `user.*` (matches `user.created`, `user.updated`) or `*.created` (matches `user.created`, `post.created`).

Handlers for wildcard events receive the actual event name as the first argument and the event data as the second:
` (eventName: string, data: any) => void | Promise<void>; `

```typescript
import { TypeSafeEmitter, WildcardEventHandler } from '@ikosumi/typesafe-emitter';

interface AppEvents {
  'user.created': { id: string; name: string };
  'user.updated': { id: string; changes: object };
  'post.created': { postId: string; author: string };
}

const emitter = new TypeSafeEmitter<AppEvents>();

// Star wildcard
emitter.on('*', (eventName, data) => {
  console.log(`[EVENT *]: ${eventName}`, data);
});

// Pattern wildcard
const userActivityHandler: WildcardEventHandler = (eventName, data) => {
  console.log(`[USER ACTIVITY]: ${eventName}`, data);
};
emitter.on('user.*', userActivityHandler);

emitter.emit('user.created', { id: 'u1', name: 'Alice' });
// Output:
// [EVENT *]: user.created { id: 'u1', name: 'Alice' }
// [USER ACTIVITY]: user.created { id: 'u1', name: 'Alice' }

emitter.emit('post.created', { postId: 'p1', author: 'Alice' });
// Output:
// [EVENT *]: post.created { postId: 'p1', author: 'Alice' }

// To remove a wildcard listener, use the same eventName and handler instance:
// emitter.off('*', starHandler);
// emitter.off('user.*', userActivityHandler);
```

### Asynchronous Event Handling

Event handlers can be synchronous or asynchronous (returning a `Promise`).

- **`emit(eventName, data)`:**
  - Executes all relevant handlers (specific, wildcard).
  - If a handler is `async` or returns a Promise, `emit` does **not** wait for it to complete ("fire and forget").
  - This is suitable when you don't need to know if or when async operations within handlers complete.

- **`emitAsync(eventName, data): Promise<void>`:**
  - Executes all relevant handlers.
  - Returns a `Promise` that resolves when all handlers (including `async` ones) have completed.
  - If any handler throws an error or returns a rejected Promise, the Promise returned by `emitAsync` will reject with that error.

```typescript
import { TypeSafeEmitter } from '@ikosumi/typesafe-emitter';

interface MyTasks {
  processData: { data: string; id: number };
}

const emitter = new TypeSafeEmitter<MyTasks>();

emitter.on('processData', async (payload) => {
  console.log(`[Handler 1] Starting async processing for ID: ${payload.id}`);
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async work
  console.log(`[Handler 1] Finished async processing for ID: ${payload.id}`);
});

emitter.on('processData', (payload) => {
  console.log(`[Handler 2] Sync handler for ID: ${payload.id}`);
});

async function runAsyncExample() {
  console.log('Using emit (fire and forget for async handlers):');
  emitter.emit('processData', { data: 'test1', id: 1 });
  console.log('After sync emit call (async handler may still be running).\n');

  // Allow some time for the async handler from sync emit to potentially run
  await new Promise(resolve => setTimeout(resolve, 100)); 

  console.log('Using emitAsync (waits for all handlers):');
  try {
    await emitter.emitAsync('processData', { data: 'test2', id: 2 });
    console.log('All handlers completed for emitAsync call.');
  } catch (error) {
    console.error('An error occurred in an async handler:', error);
  }
}

runAsyncExample();
```

### Error Handling

The emitter provides mechanisms for robust error management:

- **`throwOnNoListeners` (Constructor Option):**
  - When creating an emitter, you can pass `{ throwOnNoListeners: true }`.
  - If set to `true`, `emit` or `emitAsync` will throw a `NoListenersError` if no handlers are found for the emitted event.
  ```typescript
  const strictEmitter = new TypeSafeEmitter<MyEvents>({ throwOnNoListeners: true });
  try {
    strictEmitter.emit('userLeft', 'test'); // If no listeners for 'userLeft'
  } catch (e) {
    if (e instanceof NoListenersError) {
      console.error(e.message); // "No listeners for event "userLeft""
    }
  }
  ```

- **Custom Error Types (`src/errors.ts`):**
  - `TypeSafeEmitterError`: Base class for errors from this library.
  - `NoListenersError`: Thrown as described above.
  - `InvalidEventNameError`: Thrown by methods like `on`, `off`, `emit`, etc., if an invalid event name is used (e.g., an empty string, or a wildcard pattern in `emit`).

## API Reference

### `TypeSafeEmitter<T extends EventMap>(options?: { throwOnNoListeners?: boolean })`

The constructor. `T` is an interface extending `EventMap` that defines your event names and their payload types.

- **`options.throwOnNoListeners`** (optional, boolean, default: `false`): If `true`, the emitter will throw `NoListenersError` when `emit` or `emitAsync` is called for an event with no registered listeners.

### `WildcardEventHandler`

Type alias for wildcard event handlers:
`(eventName: string, data: any) => void | Promise<void>;`

### Methods

- `on<K extends keyof T | string>(eventName: K, handler: K extends keyof T ? (data: T[K]) => void | Promise<void> : WildcardEventHandler): () => void`
  - Subscribes to a specific event or a wildcard pattern.
  - `eventName`: The specific event name (key of `T`) or a string for wildcards (`*`, `namespace.*`, `*.action`).
  - `handler`: The callback function. For specific events, it's `(data: T[K]) => void | Promise<void>`. For wildcards, it's `WildcardEventHandler`.
  - Returns an unsubscribe function.

- `once<K extends keyof T | string>(eventName: K, handler: K extends keyof T ? (data: T[K]) => void | Promise<void> : WildcardEventHandler): () => void`
  - Subscribes to an event for one-time execution. Handler signatures are the same as `on`.
  - The handler is removed before execution. If asynchronous, removal is still synchronous.
  - Returns an unsubscribe function.

- `off<K extends keyof T | string>(eventName: K, handler: K extends keyof T ? (data: T[K]) => void | Promise<void> : WildcardEventHandler): void`
  - Unsubscribes a specific handler from an event or wildcard pattern.
  - `handler` must be the same instance passed to `on` or `once`.

- `emit<K extends keyof T>(eventName: K, data: T[K]): void`
  - Emits an event synchronously.
  - `eventName` must be a specific event name (key of `T`), not a wildcard pattern.
  - If async handlers are present, they are called but not awaited ("fire and forget").
  - Throws `InvalidEventNameError` if `eventName` is empty or a wildcard.
  - Throws `NoListenersError` if `throwOnNoListeners` is true and no listeners are found.

- `emitAsync<K extends keyof T>(eventName: K, data: T[K]): Promise<void>`
  - Emits an event and waits for all handlers (including asynchronous ones) to complete.
  - `eventName` must be a specific event name (key of `T`).
  - Returns a `Promise` that resolves when all handlers complete, or rejects if any handler throws or returns a rejected Promise.
  - Throws `InvalidEventNameError` if `eventName` is empty or a wildcard.
  - Rejects with `NoListenersError` if `throwOnNoListeners` is true and no listeners are found.

- `clear<K extends keyof T | string>(eventName?: K): void`
  - Clears handlers.
  - If `eventName` (specific or wildcard) is provided, clears handlers for that event/pattern.
  - If no `eventName` is provided, clears all handlers of all types (specific, star, wildcard).
  - Throws `InvalidEventNameError` if `eventName` is provided and is an empty string.

### Custom Error Types

- **`TypeSafeEmitterError`**: Base error class.
- **`NoListenersError`**: Thrown by `emit`/`emitAsync` if `throwOnNoListeners` is true and no listeners are found.
- **`InvalidEventNameError`**: Thrown if an invalid event name is used (e.g., empty string, or wildcard in `emit`/`emitAsync`).

## Best Practices

1.  **Define Event Types Clearly**
    ```typescript
    interface MyEvents {
      userAuthenticated: { userId: string; role: 'admin' | 'user' };
      paymentProcessed: { transactionId: string; amount: number };
      errorOccurred: { code: number; message: string }; // Consider a generic error event
    }
    ```

2.  **Unsubscribe to Prevent Memory Leaks**
    - For long-lived components or listeners, always call the unsubscribe function returned by `on` or `once`, or use `off` when the listener is no longer needed.
    ```typescript
    const unsubscribe = emitter.on('eventName', handler);
    // Later, e.g., in a component's cleanup phase:
    unsubscribe();
    ```

3.  **Use `once` for One-Time Events**
    - Ideal for initialization, setup confirmation, or any event that should only trigger its handler a single time.

4.  **Choosing `emit` vs. `emitAsync`**
    - Use `emit` for most cases, especially for UI events or when the completion of handlers isn't critical to the emitting logic. It provides "fire and forget" for async handlers.
    - Use `emitAsync` when you need to ensure all handlers (especially async ones) have completed before proceeding, e.g., during critical data processing steps or before responding to a request.

5.  **Wildcard Considerations**
    - **Specificity:** Wildcard listeners (especially `*`) can be very broad. Use them judiciously. Specific event listeners are generally preferred for clarity and performance.
    - **Performance:** Events matching many wildcard patterns or a `*` listener will trigger more handlers. While performant, be mindful in very high-throughput scenarios.
    - **Debugging:** Tracing event flow can be more complex with many wildcard listeners. Clear naming conventions for events can help.

6.  **Error Handling in Handlers**
    - Wrap `async` handler code in `try...catch` if you need to handle errors within the handler itself and prevent them from rejecting `emitAsync`.
    - Errors thrown by synchronous handlers or unhandled rejections from `async` handlers will propagate to `emitAsync`'s returned Promise.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run benchmarks
npm run benchmark
```

## License

MIT
# TypeSafe Emitter

A type-safe event emitter for TypeScript that provides compile-time checking for event names and payload types.

## Features

- TypeScript support with type inference
- Compile-time checking of event names and payload types
- Support for one-time event handlers
- Zero dependencies
- Lightweight and performant

## Installation

```bash
npm install @ikosumi/typesafe-emitter
```

## Basic Usage

```typescript
import { TypeSafeEmitter } from 'typesafe-emitter';

// Define your events interface
interface MyEvents {
  userJoined: { userId: string; username: string };
  messageReceived: { id: number; text: string };
  userLeft: string;
}

// Create a type-safe emitter instance
const emitter = new TypeSafeEmitter<MyEvents>();

// Subscribe to events (with proper type inference)
const unsubscribe = emitter.on('userJoined', (data) => {
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

// TypeScript will catch these errors:
emitter.emit('userJoined', { userId: '123' }); // ❌ Error: missing username
emitter.emit('unknownEvent', {}); // ❌ Error: unknown event
emitter.emit('messageReceived', 'wrong type'); // ❌ Error: invalid payload type

// Unsubscribe when done
unsubscribe();
```

## Advanced Usage Examples

Checkout the examples directory.

## API Reference

### `TypeSafeEmitter<T extends EventMap>`

#### Methods

- `on<K extends keyof T>(eventName: K, handler: (data: T[K]) => void): () => void`
  - Subscribe to an event
  - Returns an unsubscribe function
  - Handler receives typed event data

- `once<K extends keyof T>(eventName: K, handler: (data: T[K]) => void): () => void`
  - Subscribe to an event for one-time execution
  - Returns an unsubscribe function
  - Handler receives typed event data

- `off<K extends keyof T>(eventName: K, handler: (data: T[K]) => void): void`
  - Unsubscribe from an event
  - Removes the specific handler for the event

- `emit<K extends keyof T>(eventName: K, data: T[K]): void`
  - Emit an event with data
  - Data must match the type defined in the event map

- `clear<K extends keyof T>(eventName?: K): void`
  - Clear all handlers for a specific event
  - If no event name provided, clears all handlers

## Best Practices

1. **Define Event Types Clearly**
   ```typescript
   interface MyEvents {
     // Use descriptive names and clear payload types
     userAuthenticated: { userId: string; role: 'admin' | 'user' };
     error: { code: number; message: string };
   }
   ```

2. **Unsubscribe to Prevent Memory Leaks**
   ```typescript
   const unsubscribe = emitter.on('eventName', handler);
   // Later when done:
   unsubscribe();
   ```

3. **Use Once for One-time Events**
   ```typescript
   emitter.once('initialization', (data) => {
     // This will run only once
   });
   ```

4. **Chain Events When Needed**
   ```typescript
   emitter.on('userJoined', (data) => {
     // Emit another event in response
     emitter.emit('notification', {
       message: `${data.username} joined`
     });
   });
   ```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TypeSafeEmitter } from './index';

// Define our event map with type-safe event names and payload types
interface MyEvents {
  userJoined: { userId: string; username: string };
  messageReceived: { id: number; text: string };
  userLeft: string;
}

describe('TypeSafeEmitter', () => {
  let emitter: TypeSafeEmitter<MyEvents>;

  beforeEach(() => {
    emitter = new TypeSafeEmitter<MyEvents>();
  });

  test('should handle events with type-safe payloads', () => {
    const mockUserJoinedHandler = jest.fn();
    const mockMessageHandler = jest.fn();

    // Subscribe to events
    emitter.on('userJoined', mockUserJoinedHandler);
    emitter.on('messageReceived', mockMessageHandler);

    // Emit events with correct payload types
    emitter.emit('userJoined', { userId: '123', username: 'john' });
    emitter.emit('messageReceived', { id: 1, text: 'Hello!' });

    expect(mockUserJoinedHandler).toHaveBeenCalledWith({
      userId: '123',
      username: 'john'
    });
    expect(mockMessageHandler).toHaveBeenCalledWith({
      id: 1,
      text: 'Hello!'
    });
  });

  test('should handle unsubscription correctly', () => {
    const mockHandler = jest.fn();
    const unsubscribe = emitter.on('userLeft', mockHandler);

    emitter.emit('userLeft', 'john');
    expect(mockHandler).toHaveBeenCalledTimes(1);

    unsubscribe();
    emitter.emit('userLeft', 'john');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test('should handle one-time events correctly', () => {
    const mockHandler = jest.fn();
    emitter.once('messageReceived', mockHandler);

    emitter.emit('messageReceived', { id: 1, text: 'First message' });
    emitter.emit('messageReceived', { id: 2, text: 'Second message' });

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith({
      id: 1,
      text: 'First message'
    });
  });

  test('should clear all handlers', () => {
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();

    emitter.on('userJoined', mockHandler1);
    emitter.on('messageReceived', mockHandler2);

    emitter.clear();

    emitter.emit('userJoined', { userId: '123', username: 'john' });
    emitter.emit('messageReceived', { id: 1, text: 'Hello!' });

    expect(mockHandler1).not.toHaveBeenCalled();
    expect(mockHandler2).not.toHaveBeenCalled();
  });
}); 
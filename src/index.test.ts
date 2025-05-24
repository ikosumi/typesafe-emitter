import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TypeSafeEmitter, WildcardEventHandler } from './index';
import { NoListenersError, InvalidEventNameError } from './errors';

// Define our event map with type-safe event names and payload types
interface MyEvents {
  userJoined: { userId: string; username: string };
  messageReceived: { id: number; text: string };
  userLeft: string;
}

describe('TypeSafeEmitter', () => {
  let emitter: TypeSafeEmitter<MyEvents>;
  let emitterWithOptions: TypeSafeEmitter<MyEvents>;

  beforeEach(() => {
    emitter = new TypeSafeEmitter<MyEvents>();
    emitterWithOptions = new TypeSafeEmitter<MyEvents>({ throwOnNoListeners: true });
  });

  test('should handle events with type-safe payloads', () => {
    const mockUserJoinedHandler = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['userJoined']) => void | Promise<void>>;
    const mockMessageHandler = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['messageReceived']) => void | Promise<void>>;

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
    const mockHandler = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['userLeft']) => void | Promise<void>>;
    const unsubscribe = emitter.on('userLeft', mockHandler);

    emitter.emit('userLeft', 'john');
    expect(mockHandler).toHaveBeenCalledTimes(1);

    unsubscribe();
    emitter.emit('userLeft', 'john');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test('should handle one-time events correctly', () => {
    const mockHandler = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['messageReceived']) => void | Promise<void>>;
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
    const mockHandler1 = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['userJoined']) => void | Promise<void>>;
    const mockHandler2 = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['messageReceived']) => void | Promise<void>>;

    emitter.on('userJoined', mockHandler1);
    emitter.on('messageReceived', mockHandler2);

    emitter.clear();

    emitter.emit('userJoined', { userId: '123', username: 'john' });
    emitter.emit('messageReceived', { id: 1, text: 'Hello!' });

    expect(mockHandler1).not.toHaveBeenCalled();
    expect(mockHandler2).not.toHaveBeenCalled();
  });

  describe('Error Handling', () => {
    test('emit should throw NoListenersError if throwOnNoListeners is true and no listeners exist', () => {
      expect(() => {
        emitterWithOptions.emit('userJoined', { userId: '1', username: 'test' });
      }).toThrow(NoListenersError);
      expect(() => {
        emitterWithOptions.emit('userJoined', { userId: '1', username: 'test' });
      }).toThrow('No listeners for event "userJoined"');
    });

    test('emit should not throw NoListenersError if throwOnNoListeners is true but listeners exist', () => {
      emitterWithOptions.on('userJoined', jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['userJoined']) => void | Promise<void>>);
      expect(() => {
        emitterWithOptions.emit('userJoined', { userId: '1', username: 'test' });
      }).not.toThrow(NoListenersError);
    });
    
    test('emit should not throw NoListenersError if throwOnNoListeners is true and star listeners exist', () => {
      emitterWithOptions.on('*', jest.fn() as WildcardEventHandler);
      expect(() => {
        emitterWithOptions.emit('userJoined', { userId: '1', username: 'test' });
      }).not.toThrow(NoListenersError);
    });

    test('emit should not throw NoListenersError if throwOnNoListeners is true and wildcard listeners exist', () => {
      emitterWithOptions.on('user.*', jest.fn() as WildcardEventHandler);
      expect(() => {
        // Assuming MyEvents can have 'user.joined' or similar for this test
      // Need to cast to use a string event name not strictly in MyEvents for this wildcard test
      (emitterWithOptions as TypeSafeEmitter<any>).emit('user.action' as any, { detail: 'test' });
      }).not.toThrow(NoListenersError);
    });

    test('emit should not throw NoListenersError if throwOnNoListeners is false (default)', () => {
      expect(() => {
        emitter.emit('userJoined', { userId: '1', username: 'test' });
      }).not.toThrow(NoListenersError);
    });

    const invalidEventNames = ['', '   '];
    invalidEventNames.forEach(eventName => {
      const mockWildcardHandler = jest.fn(() => {}) as WildcardEventHandler;
      test(`on should throw InvalidEventNameError for event name "${eventName}"`, () => {
        expect(() => emitter.on(eventName, mockWildcardHandler)).toThrow(InvalidEventNameError);
        expect(() => emitter.on(eventName, mockWildcardHandler)).toThrow('Event name cannot be an empty string.');
      });

      test(`off should throw InvalidEventNameError for event name "${eventName}"`, () => {
        expect(() => emitter.off(eventName, mockWildcardHandler)).toThrow(InvalidEventNameError);
      });

      test(`once should throw InvalidEventNameError for event name "${eventName}"`, () => {
        expect(() => emitter.once(eventName, mockWildcardHandler)).toThrow(InvalidEventNameError);
      });

      test(`clear should throw InvalidEventNameError for event name "${eventName}"`, () => {
        expect(() => emitter.clear(eventName)).toThrow(InvalidEventNameError);
      });
    });
    
    test('emit should throw InvalidEventNameError for empty event name if EventMap allows arbitrary strings', () => {
      const stringEmitter = new TypeSafeEmitter<{[key: string]: any}>({ throwOnNoListeners: true });
      expect(() => stringEmitter.emit('', {data: 'test'})).toThrow(InvalidEventNameError);
      expect(() => stringEmitter.emit('   ', {data: 'test'})).toThrow(InvalidEventNameError);
    });

    test('emit should throw InvalidEventNameError for wildcard pattern as event name', () => {
        expect(() => emitter.emit('user.*' as any, {data: 'test'})).toThrow(InvalidEventNameError);
        expect(() => emitter.emit('*' as any, {data: 'test'})).toThrow(InvalidEventNameError);
        expect(() => emitter.emit('*.action' as any, {data: 'test'})).toThrow(/Wildcard pattern "\*.action" is not allowed for this operation/);
    });


    test('clear should not throw InvalidEventNameError if eventName is undefined', () => {
      expect(() => emitter.clear()).not.toThrow();
    });
  });
  
  describe('Asynchronous Event Handling', () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    test('emitAsync should resolve when all synchronous handlers complete', async () => {
      const mockHandler1 = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['userJoined']) => void | Promise<void>>;
      const mockHandler2 = jest.fn(() => {}) as jest.MockedFunction<(data: MyEvents['userJoined']) => void | Promise<void>>;
      emitter.on('userJoined', mockHandler1);
      emitter.on('userJoined', mockHandler2);
      await emitter.emitAsync('userJoined', { userId: 'async1', username: 'TestAsync' });
      expect(mockHandler1).toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalled();
    });

    test('emitAsync should resolve when all asynchronous handlers complete', async () => {
      let handler1Completed = false;
      let handler2Completed = false;
      const mockHandler1Impl: (data: MyEvents['userJoined']) => Promise<void> = async () => { await delay(10); handler1Completed = true; };
      const mockHandler2Impl: (data: MyEvents['userJoined']) => Promise<void> = async () => { await delay(5); handler2Completed = true; };
      const mockHandler1 = jest.fn(mockHandler1Impl);
      const mockHandler2 = jest.fn(mockHandler2Impl);
      
      emitter.on('userJoined', mockHandler1);
      emitter.on('userJoined', mockHandler2);

      await emitter.emitAsync('userJoined', { userId: 'async2', username: 'TestAsync' });
      expect(mockHandler1).toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalled();
      expect(handler1Completed).toBe(true);
      expect(handler2Completed).toBe(true);
    });

    test('emitAsync should resolve with a mix of sync and async handlers', async () => {
      let asyncHandlerCompleted = false;
      const mockSyncHandlerImpl: (data: MyEvents['userJoined']) => void = () => {};
      const mockAsyncHandlerImpl: (data: MyEvents['userJoined']) => Promise<void> = async () => { await delay(10); asyncHandlerCompleted = true;};
      const mockSyncHandler = jest.fn(mockSyncHandlerImpl);
      const mockAsyncHandler = jest.fn(mockAsyncHandlerImpl);

      emitter.on('userJoined', mockSyncHandler);
      emitter.on('userJoined', mockAsyncHandler);

      await emitter.emitAsync('userJoined', { userId: 'async3', username: 'TestAsyncMix' });
      expect(mockSyncHandler).toHaveBeenCalled();
      expect(mockAsyncHandler).toHaveBeenCalled();
      expect(asyncHandlerCompleted).toBe(true);
    });

    test('emitAsync should reject if any handler rejects', async () => {
      const mockHandler1Impl: (data: MyEvents['userJoined']) => void = () => {};
      const mockHandler2Impl: (data: MyEvents['userJoined']) => Promise<void> = async () => { await delay(5); throw new Error('Handler rejection'); };
      const mockHandler1 = jest.fn(mockHandler1Impl);
      const mockHandler2 = jest.fn(mockHandler2Impl);

      emitter.on('userJoined', mockHandler1);
      emitter.on('userJoined', mockHandler2);

      await expect(
        emitter.emitAsync('userJoined', { userId: 'asyncError', username: 'TestAsyncError' })
      ).rejects.toThrow('Handler rejection');
      expect(mockHandler1).toHaveBeenCalled(); // Sync handler should still be called
    });
    
    test('emitAsync should reject if a synchronous handler throws', async () => {
      const mockHandler1Impl: (data: MyEvents['userLeft']) => void = () => { throw new Error('Sync Handler Exception'); };
      const mockHandler1 = jest.fn(mockHandler1Impl);
      emitter.on('userLeft', mockHandler1);
      await expect(emitter.emitAsync('userLeft', 'test')).rejects.toThrow('Sync Handler Exception');
    });

    test('emitAsync should reject with NoListenersError if throwOnNoListeners is true', async () => {
      await expect(
        emitterWithOptions.emitAsync('userJoined', { userId: 'noListenerAsync', username: 'Test' })
      ).rejects.toThrow(NoListenersError);
    });
    
    test('emitAsync should reject with InvalidEventNameError for empty event name', async () => {
        const stringEmitter = new TypeSafeEmitter<{[key: string]: any}>();
        await expect(stringEmitter.emitAsync('', {data: 'test'})).rejects.toThrow(InvalidEventNameError);
    });

    test('emitAsync should reject with InvalidEventNameError for wildcard pattern as event name', async () => {
        await expect(emitter.emitAsync('user.*' as any, {data: 'test'})).rejects.toThrow(InvalidEventNameError);
    });

    test('emitAsync should handle wildcard listeners (star and pattern) that are async', async () => {
      const starHandlerAsync = jest.fn().mockImplementation(async () => { await delay(5); });
      const patternHandlerAsync = jest.fn().mockImplementation(async () => { await delay(5); });
      
      emitter.on('*', starHandlerAsync as WildcardEventHandler);
      emitter.on('user.*', patternHandlerAsync as WildcardEventHandler);
      
      const eventData = { userId: 'userAsyncWildcard', username: 'TestUser' };
      // Cast to any for this specific test structure if 'user.joined' is not in MyEvents
      await (emitter as TypeSafeEmitter<any>).emitAsync('user.joined', eventData);
      
      expect(starHandlerAsync).toHaveBeenCalledWith('user.joined', eventData);
      expect(patternHandlerAsync).toHaveBeenCalledWith('user.joined', eventData);
    });

    test('emit should call async handlers but not wait (fire and forget)', (done) => {
      let asyncHandlerCalled = false;
      const asyncHandlerImpl: (data: MyEvents['userLeft']) => Promise<void> = async () => { await delay(20); asyncHandlerCalled = true; };
      const asyncHandler = jest.fn(asyncHandlerImpl);
      emitter.on('userLeft', asyncHandler);
      emitter.emit('userLeft', 'testUser');
      
      // Check immediately that it's not true
      expect(asyncHandlerCalled).toBe(false);
      
      // Check after a short delay that it eventually becomes true
      setTimeout(() => {
        expect(asyncHandlerCalled).toBe(true);
        done();
      }, 50);
    });

    test('once with async handler should work with emit (fire and forget for emit)', (done) => {
      let asyncHandlerCompleted = false;
      const mockHandlerImpl: (data: MyEvents['userLeft']) => Promise<void> = async () => { await delay(10); asyncHandlerCompleted = true; };
      const mockHandler = jest.fn(mockHandlerImpl);
      emitter.once('userLeft', mockHandler);
      emitter.emit('userLeft', 'testUserOnce'); // First emit
      
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(asyncHandlerCompleted).toBe(false); // Not completed yet

      // Emit again, handler should not be called
      emitter.emit('userLeft', 'testUserOnceAgain');
      expect(mockHandler).toHaveBeenCalledTimes(1); 

      setTimeout(() => {
        expect(asyncHandlerCompleted).toBe(true); // Should have completed by now
        done();
      }, 30);
    });

    test('once with async handler should work with emitAsync (waits for completion)', async () => {
      let asyncHandlerCompleted = false;
      const mockHandlerImpl: (data: MyEvents['userLeft']) => Promise<void> = async () => { await delay(10); asyncHandlerCompleted = true; };
      const mockHandler = jest.fn(mockHandlerImpl);
      emitter.once('userLeft', mockHandler);
      
      await emitter.emitAsync('userLeft', 'testUserOnceAsync'); // First emit
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(asyncHandlerCompleted).toBe(true); // Should be completed due to await

      // Emit again, handler should not be called
      await emitter.emitAsync('userLeft', 'testUserOnceAsyncAgain').catch(() => {}); // Catch potential NoListenersError if strict
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
    
    test('once with async handler that throws, should still be removed (emitAsync)', async () => {
      const mockHandlerImpl: (data: MyEvents['userLeft']) => Promise<void> = async () => { await delay(5); throw new Error("AsyncOnceError"); };
      const mockHandler = jest.fn(mockHandlerImpl);
      emitter.once('userLeft', mockHandler);

      await expect(emitter.emitAsync('userLeft', 'testError')).rejects.toThrow("AsyncOnceError");
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Try emitting again, handler should not be called (it was removed)
      const tempEmitter = new TypeSafeEmitter<MyEvents>(); 
      const mockHandlerForTempEmitter = jest.fn(mockHandlerImpl); // Create a new mock instance for the new emitter
      tempEmitter.once('userLeft', mockHandlerForTempEmitter); 
      await expect(tempEmitter.emitAsync('userLeft', 'testError')).rejects.toThrow("AsyncOnceError"); 
      await expect(tempEmitter.emitAsync('userLeft', 'testErrorSecondAttempt')).resolves.toBeUndefined(); 
      expect(mockHandler).toHaveBeenCalledTimes(1); // Original mock (on `emitter`) should be called once.
      expect(mockHandlerForTempEmitter).toHaveBeenCalledTimes(1); // New mock (on `tempEmitter`) should be called once.
    });
  });

  // Wildcard tests
  describe('Wildcard Event Handling', () => {
    interface WildcardEvents extends MyEvents {
      'user.created': { id: string; name: string };
      'user.deleted': { id: string };
      'post.created': { postId: string; content: string };
      'post.updated': { postId: string; newContent: string };
      // For testing emit with throwOnNoListeners and wildcard
      'user.action': { detail: string };
      'user.updated': { userId: string, newName: string }; // Added for *.updated test
    }
    let wildcardEmitter: TypeSafeEmitter<WildcardEvents>;
    let wildcardEmitterWithOptions: TypeSafeEmitter<WildcardEvents>;


    beforeEach(() => {
      wildcardEmitter = new TypeSafeEmitter<WildcardEvents>();
      wildcardEmitterWithOptions = new TypeSafeEmitter<WildcardEvents>({throwOnNoListeners: true});
    });

    test('should handle "*" wildcard subscriptions', () => {
      const mockStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.on('*', mockStarHandler);

      wildcardEmitter.emit('userJoined', { userId: 'u1', username: 'Alice' });
      expect(mockStarHandler).toHaveBeenCalledWith('userJoined', { userId: 'u1', username: 'Alice' });
      expect(mockStarHandler).toHaveBeenCalledTimes(1);

      wildcardEmitter.emit('messageReceived', { id: 100, text: 'Hi there' });
      expect(mockStarHandler).toHaveBeenCalledWith('messageReceived', { id: 100, text: 'Hi there' });
      expect(mockStarHandler).toHaveBeenCalledTimes(2);
    });

    test('should unsubscribe "*" wildcard listener', () => {
      const mockStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      const unsubscribe = wildcardEmitter.on('*', mockStarHandler);

      wildcardEmitter.emit('userLeft', 'testUser');
      expect(mockStarHandler).toHaveBeenCalledTimes(1);

      unsubscribe();
      wildcardEmitter.emit('userJoined', { userId: 'u2', username: 'Bob' });
      expect(mockStarHandler).toHaveBeenCalledTimes(1); // Should not be called again
    });
    
    test('should handle "once" for "*" wildcard listener', () => {
      const mockStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.once('*', mockStarHandler);

      wildcardEmitter.emit('userJoined', { userId: 'u1', username: 'Alice' });
      expect(mockStarHandler).toHaveBeenCalledWith('userJoined', { userId: 'u1', username: 'Alice' });
      expect(mockStarHandler).toHaveBeenCalledTimes(1);

      wildcardEmitter.emit('messageReceived', { id: 100, text: 'Hi there' });
      expect(mockStarHandler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('should clear "*" wildcard listeners', () => {
      const mockStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.on('*', mockStarHandler);
      wildcardEmitter.clear('*');
      wildcardEmitter.emit('userJoined', { userId: 'u1', username: 'Alice' });
      expect(mockStarHandler).not.toHaveBeenCalled();
    });

    test('should handle pattern wildcard "namespace.*" subscriptions', () => {
      const mockUserStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.on('user.*', mockUserStarHandler);

      wildcardEmitter.emit('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUserStarHandler).toHaveBeenCalledWith('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(1);

      wildcardEmitter.emit('user.deleted', { id: 'user2' });
      expect(mockUserStarHandler).toHaveBeenCalledWith('user.deleted', { id: 'user2' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(2);

      wildcardEmitter.emit('post.created', { postId: 'p1', content: 'Hello Post' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(2); // Should not be called for post.created
    });
    
    test('should handle pattern wildcard "*.action" subscriptions', () => {
      const mockUpdatedHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.on('*.updated', mockUpdatedHandler);

      wildcardEmitter.emit('post.updated', { postId: 'p1', newContent: 'Updated Post' });
      expect(mockUpdatedHandler).toHaveBeenCalledWith('post.updated', { postId: 'p1', newContent: 'Updated Post' });
      expect(mockUpdatedHandler).toHaveBeenCalledTimes(1);
      
      wildcardEmitter.emit('user.updated', { userId: 'u3', newName: 'Diana' }); 
      expect(mockUpdatedHandler).toHaveBeenCalledWith('user.updated', { userId: 'u3', newName: 'Diana' });
      expect(mockUpdatedHandler).toHaveBeenCalledTimes(2);

      wildcardEmitter.emit('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUpdatedHandler).toHaveBeenCalledTimes(2); // Should not be called for user.created
    });

    test('should unsubscribe pattern wildcard listeners', () => {
      const mockUserStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      const unsubscribe = wildcardEmitter.on('user.*', mockUserStarHandler);

      wildcardEmitter.emit('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(1);

      unsubscribe();
      wildcardEmitter.emit('user.deleted', { id: 'user2' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(1); // Should not be called again
    });
    
    test('should handle "once" for pattern wildcard listeners', () => {
      const mockUserStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.once('user.*', mockUserStarHandler);

      wildcardEmitter.emit('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUserStarHandler).toHaveBeenCalledWith('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(1);

      wildcardEmitter.emit('user.deleted', { id: 'user2' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(1); // Should not be called again
      
      wildcardEmitter.emit('post.created', { postId: 'p1', content: 'Another post' });
      expect(mockUserStarHandler).toHaveBeenCalledTimes(1); // Should not be called
    });

    test('should clear specific pattern wildcard listeners', () => {
      const mockUserStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      const mockPostStarHandler = jest.fn(() => {}) as jest.MockedFunction<WildcardEventHandler>;
      wildcardEmitter.on('user.*', mockUserStarHandler);
      wildcardEmitter.on('post.*', mockPostStarHandler);
      
      wildcardEmitter.clear('user.*');
      
      wildcardEmitter.emit('user.created', { id: 'user1', name: 'Charlie' });
      expect(mockUserStarHandler).not.toHaveBeenCalled();
      
      wildcardEmitter.emit('post.created', { postId: 'p1', content: 'A post' });
      expect(mockPostStarHandler).toHaveBeenCalledWith('post.created', { postId: 'p1', content: 'A post' });
      expect(mockPostStarHandler).toHaveBeenCalledTimes(1);
    });

    test('clear with no arguments should clear all listeners including wildcards', () => {
      const mockSpecificHandlerImpl: (data: WildcardEvents['userJoined']) => void = () => {};
      const mockStarHandlerImpl: WildcardEventHandler = () => {};
      const mockPatternHandlerImpl: WildcardEventHandler = () => {};
      const mockSpecificHandler = jest.fn(mockSpecificHandlerImpl);
      const mockStarHandler = jest.fn(mockStarHandlerImpl);
      const mockPatternHandler = jest.fn(mockPatternHandlerImpl);

      wildcardEmitter.on('userJoined', mockSpecificHandler);
      wildcardEmitter.on('*', mockStarHandler);
      wildcardEmitter.on('user.*', mockPatternHandler);

      wildcardEmitter.clear();

      wildcardEmitter.emit('userJoined', { userId: 'u1', username: 'Test' });
      wildcardEmitter.emit('user.created', { id: 'u2', name: 'Test2' });

      expect(mockSpecificHandler).not.toHaveBeenCalled();
      expect(mockStarHandler).not.toHaveBeenCalled();
      expect(mockPatternHandler).not.toHaveBeenCalled();
    });

    test('specific listeners should work with wildcard listeners', () => {
      const mockSpecificUserJoinedImpl: (data: WildcardEvents['userJoined']) => void = () => {};
      const mockStarHandlerImpl: WildcardEventHandler = () => {};
      const mockUserPatternHandlerImpl: WildcardEventHandler = () => {};
      const mockSpecificUserCreatedHandlerImpl: (data: WildcardEvents['user.created']) => void = () => {};

      const mockSpecificUserJoined = jest.fn(mockSpecificUserJoinedImpl);
      const mockStarHandler = jest.fn(mockStarHandlerImpl);
      const mockUserPatternHandler = jest.fn(mockUserPatternHandlerImpl); 
      const mockSpecificUserCreatedHandler = jest.fn(mockSpecificUserCreatedHandlerImpl);


      wildcardEmitter.on('userJoined', mockSpecificUserJoined);
      wildcardEmitter.on('*', mockStarHandler);
      wildcardEmitter.on('user.*', mockUserPatternHandler);
      wildcardEmitter.on('user.created', mockSpecificUserCreatedHandler); 

      const userJoinedData = { userId: 'uj1', username: 'Eve' };
      wildcardEmitter.emit('userJoined', userJoinedData);
      expect(mockSpecificUserJoined).toHaveBeenCalledWith(userJoinedData);
      expect(mockSpecificUserJoined).toHaveBeenCalledTimes(1);
      expect(mockStarHandler).toHaveBeenCalledWith('userJoined', userJoinedData);
      expect(mockStarHandler).toHaveBeenCalledTimes(1);
      expect(mockUserPatternHandler).not.toHaveBeenCalledWith('userJoined', userJoinedData); 
      
      const userCreatedData = { id: 'uc1', name: 'Frank' };
      wildcardEmitter.emit('user.created', userCreatedData);
      
      expect(mockSpecificUserJoined).toHaveBeenCalledTimes(1); 
      expect(mockStarHandler).toHaveBeenCalledWith('user.created', userCreatedData);
      expect(mockStarHandler).toHaveBeenCalledTimes(2);
      expect(mockUserPatternHandler).toHaveBeenCalledWith('user.created', userCreatedData);
      expect(mockUserPatternHandler).toHaveBeenCalledTimes(1); 
      expect(mockSpecificUserCreatedHandler).toHaveBeenCalledWith(userCreatedData);
      expect(mockSpecificUserCreatedHandler).toHaveBeenCalledTimes(1);


      wildcardEmitter.emit('messageReceived', { id: 1, text: 'Hello' });
      expect(mockSpecificUserJoined).toHaveBeenCalledTimes(1); 
      expect(mockStarHandler).toHaveBeenCalledTimes(3); 
      expect(mockUserPatternHandler).toHaveBeenCalledTimes(1); 
      expect(mockSpecificUserCreatedHandler).toHaveBeenCalledTimes(1); 
    });

    test('emit should not throw NoListenersError if throwOnNoListeners is true and wildcard listeners exist for specific event', () => {
      const mockWildcardHandlerImpl: WildcardEventHandler = () => {};
      wildcardEmitterWithOptions.on('user.*', jest.fn(mockWildcardHandlerImpl));
      expect(() => {
        wildcardEmitterWithOptions.emit('user.action', { detail: 'test' });
      }).not.toThrow(NoListenersError);
    });
  });
}); 
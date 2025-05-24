import Benchmark from 'benchmark';
import { TypeSafeEmitter, WildcardEventHandler } from '../src'; // Adjust path as needed

const suite = new Benchmark.Suite('TypeSafeEmitter Benchmarks');

// Define event maps for testing
interface MyEvents {
  foo: string;
  bar: number;
  baz: boolean;
  'user.created': { id: string; name: string };
  'user.updated': { id: string; changes: Partial<{ name: string; email: string }> };
  'user.deleted': { id: string };
  'post.created': { postId: string; authorId: string };
  'post.updated': { postId: string; content: string };
  'post.deleted': { postId: string };
  // For many listeners test
  manyListenersEvent: number;
  // For async tests
  asyncEvent: string;
}

const ITERATIONS_FOR_SETUP = 1000; // For "many listeners" scenarios
const ITERATIONS_FOR_ASYNC_MANY = 100; // For "many async listeners"

// --- Instantiation Benchmark ---
suite.add('Instantiation: new TypeSafeEmitter()', () => {
  new TypeSafeEmitter<MyEvents>();
});

// --- Subscription Benchmarks ---
suite.add('Subscription: on() - single listener', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  emitter.on('foo', (data) => {});
});

suite.add(`Subscription: on() - ${ITERATIONS_FOR_SETUP} listeners to one event`, () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  for (let i = 0; i < ITERATIONS_FOR_SETUP; i++) {
    emitter.on('manyListenersEvent', (data) => {});
  }
});

// --- Emission Benchmarks ---
suite.add('Emission: emit() - one listener', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  emitter.on('foo', (data) => {});
  emitter.emit('foo', 'test');
});

// Pre-setup the emitter for the "many listeners" emit test
const manyListenersEmitTest = (() => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  for (let i = 0; i < ITERATIONS_FOR_SETUP; i++) {
    emitter.on('manyListenersEvent', (data: number) => {});
  }
  return () => {
    emitter.emit('manyListenersEvent', 123);
  };
})();
suite.add(`Emission: emit() - ${ITERATIONS_FOR_SETUP} listeners`, manyListenersEmitTest);


suite.add('Emission: emit() - no listeners', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  emitter.emit('foo', 'test');
});

// emitAsync
suite.add('Emission: emitAsync() - one synchronous listener', async (deferred: any) => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  emitter.on('asyncEvent', (data) => {});
  await emitter.emitAsync('asyncEvent', 'test').finally(() => deferred.resolve());
}, { defer: true });

suite.add('Emission: emitAsync() - one asynchronous listener', async (deferred: any) => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  emitter.on('asyncEvent', async (data) => {});
  await emitter.emitAsync('asyncEvent', 'test').finally(() => deferred.resolve());
}, { defer: true });


suite.add(`Emission: emitAsync() - ${ITERATIONS_FOR_ASYNC_MANY} synchronous listeners`, async (deferred: any) => {
    const emitter = new TypeSafeEmitter<MyEvents>();
    for (let i = 0; i < ITERATIONS_FOR_ASYNC_MANY; i++) {
      emitter.on('manyListenersEvent', (data) => {});
    }
    await emitter.emitAsync('manyListenersEvent', 123).finally(() => deferred.resolve());
  }, { defer: true });

suite.add(`Emission: emitAsync() - ${ITERATIONS_FOR_ASYNC_MANY} asynchronous listeners`, async (deferred: any) => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  for (let i = 0; i < ITERATIONS_FOR_ASYNC_MANY; i++) {
    emitter.on('manyListenersEvent', async (data) => {});
  }
  await emitter.emitAsync('manyListenersEvent', 123).finally(() => deferred.resolve());
}, { defer: true });


// emit() with wildcard listeners
suite.add('Emission: emit() - one "*" listener', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  const handler: WildcardEventHandler = (event, data) => {};
  emitter.on('*', handler);
  emitter.emit('user.created', { id: '1', name: 'Test User' });
});

suite.add('Emission: emit() - one pattern "user.*" listener, matching event', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  const handler: WildcardEventHandler = (event, data) => {};
  emitter.on('user.*', handler);
  emitter.emit('user.created', { id: '1', name: 'Test User' });
});

suite.add('Emission: emit() - 10 pattern listeners ("*.created", "*.updated"), matching event', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  const handler: WildcardEventHandler = (event, data) => {};
  for (let i = 0; i < 5; i++) {
    emitter.on('*.created', handler);
    emitter.on('*.updated', handler);
  }
  emitter.emit('user.created', { id: '1', name: 'Test User' });
});


// --- Unsubscription Benchmarks ---
suite.add('Unsubscription: off() - single listener', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  const handler = (data: string) => {};
  emitter.on('foo', handler);
  emitter.off('foo', handler);
});

suite.add('Unsubscription: returned unsubscribe function - single listener', () => {
  const emitter = new TypeSafeEmitter<MyEvents>();
  const handler = (data: string) => {};
  const unsubscribe = emitter.on('foo', handler);
  unsubscribe();
});


// --- Suite Configuration & Run ---
suite
  .on('start', function(this: Benchmark.Suite) {
    console.log(`Starting Benchmark Suite: ${this.name}`);
  })
  .on('cycle', (event: Benchmark.Event) => {
    console.log(String(event.target));
    if ((event.target as any).error) {
        console.error('Error in benchmark: ', (event.target as any).error);
    }
  })
  .on('error', function(this: Benchmark.Suite, event: Benchmark.Event) {
    console.error('Benchmark Suite Error:', (event.target as any).error, event.target.name);
  })
  .on('complete', function(this: Benchmark.Suite) {
    console.log('\nFastest is ' + this.filter('fastest').map('name'));
    console.log('Slowest is ' + this.filter('slowest').map('name'));
  })
  .run({ async: true }); // Use async true because some tests are async (emitAsync)

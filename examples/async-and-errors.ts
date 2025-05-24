import { TypeSafeEmitter, NoListenersError, InvalidEventNameError } from '../src'; // Adjust path

console.log('--- Async and Error Handling Example ---');

// Define a sample event map
interface MyEvents {
  taskCompleted: { taskId: string; result: any };
  taskFailed: { taskId: string; error: string };
  statusUpdate: { message: string };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- 1. emitAsync with Promise-returning handlers ---
console.log('\n1. Demonstrating `emitAsync`:');
const emitterAsync = new TypeSafeEmitter<MyEvents>();

emitterAsync.on('taskCompleted', async (data) => {
  console.log(`[Async Handler 1] Task ${data.taskId} starting processing (20ms)...`);
  await delay(20);
  console.log(`[Async Handler 1] Task ${data.taskId} finished processing. Result: ${data.result}`);
});

emitterAsync.on('taskCompleted', (data) => {
  console.log(`[Sync Handler 2] Task ${data.taskId} notification received immediately. Result: ${data.result}`);
});

emitterAsync.on('taskFailed', async (data) => {
  console.log(`[Async Handler 3] Task ${data.taskId} failure processing (10ms)...`);
  await delay(10);
  console.error(`[Async Handler 3] Task ${data.taskId} failure logged: ${data.error}`);
  throw new Error(`Failed to process task ${data.taskId} due to: ${data.error}`);
});

(async () => {
  console.log('Emitting taskCompleted (should wait for async handler)...');
  try {
    await emitterAsync.emitAsync('taskCompleted', { taskId: 't1', result: 'Success!' });
    console.log('emitAsync for taskCompleted finished successfully.');
  } catch (e: any) {
    console.error('emitAsync for taskCompleted failed:', e.message);
  }

  console.log('\nEmitting taskFailed (should wait and then reject)...');
  try {
    await emitterAsync.emitAsync('taskFailed', { taskId: 't2', error: 'Critical Timeout' });
    console.log('emitAsync for taskFailed finished successfully (this should not happen).');
  } catch (e: any) {
    console.error('emitAsync for taskFailed correctly rejected:', e.message);
  }

  // --- 2. throwOnNoListeners option ---
  console.log('\n\n2. Demonstrating `throwOnNoListeners` option:');
  const strictEmitter = new TypeSafeEmitter<MyEvents>({ throwOnNoListeners: true });

  console.log('Emitting statusUpdate on strictEmitter (no listeners yet)...');
  try {
    strictEmitter.emit('statusUpdate', { message: 'System booting...' }); // or await strictEmitter.emitAsync(...)
    console.log('Strict emit succeeded (this should not happen).');
  } catch (e: any) {
    if (e instanceof NoListenersError) {
      console.log(`Caught NoListenersError correctly: ${e.message}`);
    } else {
      console.error(`Caught unexpected error for NoListenersError test:`, e);
    }
  }

  strictEmitter.on('statusUpdate', (data) => console.log(`[Strict] Status: ${data.message}`));
  console.log('Emitting statusUpdate on strictEmitter (now with a listener)...');
  try {
    strictEmitter.emit('statusUpdate', { message: 'Listener attached, system operational.' });
    console.log('Strict emit with listener succeeded.');
  } catch (e: any) {
    console.error(`Caught unexpected error for strict emit with listener:`, e);
  }


  // --- 3. InvalidEventNameError ---
  console.log('\n\n3. Demonstrating `InvalidEventNameError`:');
  const regularEmitter = new TypeSafeEmitter<MyEvents>();

  console.log("Attempting to use `on` with an empty event name ('')...");
  try {
    regularEmitter.on('', () => console.log('This should not be called.'));
  } catch (e: any) {
    if (e instanceof InvalidEventNameError) {
      console.log(`Caught InvalidEventNameError for 'on' correctly: ${e.message}`);
    } else {
      console.error(`Caught unexpected error for 'on' InvalidEventNameError test:`, e);
    }
  }

  console.log("\nAttempting to `emit` with a whitespace event name ('   ')...");
  try {
    // Need to cast to 'any' or a more permissive EventMap for this specific test,
    // as MyEvents doesn't define '   ' as a key.
    (regularEmitter as TypeSafeEmitter<any>).emit('   ', { message: 'This should not be sent.' });
  } catch (e: any) {
    if (e instanceof InvalidEventNameError) {
      console.log(`Caught InvalidEventNameError for 'emit' correctly: ${e.message}`);
    } else {
      console.error(`Caught unexpected error for 'emit' InvalidEventNameError test:`, e);
    }
  }
  
  console.log('\n--- End of Async and Error Handling Example ---');
})();

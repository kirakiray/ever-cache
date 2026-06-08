import { test, expect } from '@playwright/test';

test.describe('EverCache', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto('http://127.0.0.1:5566/tests/index.html');
    
    // Wait for the module to be loaded and attached to window
    await page.waitForFunction(() => window.storage !== undefined);

    // Clear storage before each test to ensure a clean state
    await page.evaluate(async () => {
      await window.storage.clear();
    });
  });

  test('setItem and getItem should work correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await window.storage.setItem('testKey1', { data: 'test key 1' });
      return await window.storage.getItem('testKey1');
    });
    
    expect(result).toEqual({ data: 'test key 1' });
  });

  test('removeItem should delete the item', async ({ page }) => {
    const result = await page.evaluate(async () => {
      await window.storage.setItem('testKey2', 'some value');
      await window.storage.removeItem('testKey2');
      return await window.storage.getItem('testKey2');
    });

    expect(result).toBeNull();
  });

  test('proxy get and set should work', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.storage.testKey3 = { data: 'test key 3' };
      return await window.storage.testKey3;
    });

    expect(result).toEqual({ data: 'test key 3' });
  });

  test('proxy delete should work', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.storage.testKey4 = 'value to delete';
      delete window.storage.testKey4;
      return await window.storage.testKey4;
    });

    expect(result).toBeNull();
  });

  test('key(index) should return the nth key', async ({ page }) => {
    const keys = await page.evaluate(async () => {
      await window.storage.setItem('a', 1);
      await window.storage.setItem('b', 2);
      await window.storage.setItem('c', 3);

      return [
        await window.storage.key(0),
        await window.storage.key(1),
        await window.storage.key(2)
      ];
    });

    expect(keys).toEqual(['a', 'b', 'c']);
  });

  test('length should return the correct number of items', async ({ page }) => {
    const length = await page.evaluate(async () => {
      await window.storage.setItem('x', 10);
      await window.storage.setItem('y', 20);
      return await window.storage.length;
    });

    expect(length).toBe(2);
  });

  test('clear should remove all items', async ({ page }) => {
    const length = await page.evaluate(async () => {
      await window.storage.setItem('1', 'one');
      await window.storage.setItem('2', 'two');
      await window.storage.clear();
      return await window.storage.length;
    });

    expect(length).toBe(0);
  });

  test('entries iterator should yield all key-value pairs', async ({ page }) => {
    const entries = await page.evaluate(async () => {
      await window.storage.setItem('k1', 'v1');
      await window.storage.setItem('k2', 'v2');
      
      const results = [];
      for await (const [key, value] of window.storage.entries()) {
        results.push([key, value]);
      }
      return results;
    });

    expect(entries).toEqual([
      ['k1', 'v1'],
      ['k2', 'v2']
    ]);
  });

  test('keys iterator should yield all keys', async ({ page }) => {
    const keys = await page.evaluate(async () => {
      await window.storage.setItem('k1', 'v1');
      await window.storage.setItem('k2', 'v2');
      
      const results = [];
      for await (const key of window.storage.keys()) {
        results.push(key);
      }
      return results;
    });

    expect(keys).toEqual(['k1', 'k2']);
  });

  test('values iterator should yield all values', async ({ page }) => {
    const values = await page.evaluate(async () => {
      await window.storage.setItem('k1', 'v1');
      await window.storage.setItem('k2', 'v2');
      
      const results = [];
      for await (const value of window.storage.values()) {
        results.push(value);
      }
      return results;
    });

    expect(values).toEqual(['v1', 'v2']);
  });

  test('BroadcastChannel should emit changes to other instances', async ({ context }) => {
    // Open two pages to simulate two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('http://127.0.0.1:5566/tests/index.html');
    await page2.goto('http://127.0.0.1:5566/tests/index.html');

    await page1.waitForFunction(() => window.storage !== undefined);
    await page2.waitForFunction(() => window.storage !== undefined);

    await page1.evaluate(async () => await window.storage.clear());

    // Listen for custom event on page2
    await page2.evaluate(() => {
      window.receivedEvents = [];
      window.addEventListener('ever-cache-storage', (e) => {
        window.receivedEvents.push(e.detail);
      });
    });

    // Set item on page1
    await page1.evaluate(async () => {
      await window.storage.setItem('sharedKey', 'sharedValue');
    });

    // Wait for event on page2
    const events = await page2.evaluate(async () => {
      // Polling for the event to arrive
      for (let i = 0; i < 20; i++) {
        if (window.receivedEvents.length > 0) break;
        await new Promise(r => setTimeout(r, 50));
      }
      return window.receivedEvents;
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({
      key: 'sharedKey',
      oldValue: null,
      newValue: 'sharedValue',
      cacheId: 'public'
    });
  });
});
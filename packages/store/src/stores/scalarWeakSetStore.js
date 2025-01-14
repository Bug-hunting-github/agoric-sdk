// @ts-check

import { Far, passStyleOf } from '@agoric/marshal';
import { makePatternKit } from '../patterns/patternMatchers.js';

const { details: X, quote: q } = assert;
const { assertMatches, assertPattern } = makePatternKit();

/**
 * @template K
 * @param {WeakSet<K & Object>} jsset
 * @param {(k: K) => void} assertKeyOkToWrite
 * @param {((k: K) => void)=} assertKeyOkToDelete
 * @param {string=} keyName
 * @returns {WeakSetStore<K>}
 */
export const makeWeakSetStoreMethods = (
  jsset,
  assertKeyOkToWrite,
  assertKeyOkToDelete = () => {},
  keyName = 'key',
) => {
  const assertKeyExists = key =>
    assert(jsset.has(key), X`${q(keyName)} not found: ${key}`);

  return harden({
    has: key => {
      // Check if a key exists. The key can be any JavaScript value,
      // though the answer will always be false for keys that cannot be found
      // in this set.
      return jsset.has(key);
    },

    add: key => {
      assertKeyOkToWrite(key);
      jsset.add(key);
    },
    delete: key => {
      assertKeyExists(key);
      assertKeyOkToDelete(key);
      jsset.delete(key);
    },
  });
};

/**
 * This is a *scalar* set in that the keys can only be atomic values, primitives
 * or remotables. Other storeSets will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * TODO For now, this scalarWeakSet accepts only remotables, reflecting the
 * constraints of the underlying JavaScript WeakSet it uses internally. But
 * it should accept the primitives as well, storing them in a separate internal
 * set. What makes it "weak" is that it provides no API for enumerating what's
 * there. Though note that this would only enables collection of the
 * remotables, since the other primitives may always appear.
 *
 * @template K
 * @param {string} [keyName='key'] - the column name for the key
 * @param {Partial<StoreOptions>=} options
 * @returns {WeakSetStore<K>}
 */
export const makeScalarWeakSetStore = (
  keyName = 'key',
  { longLived = true, schema = undefined } = {},
) => {
  const jsset = new (longLived ? WeakSet : Set)();
  if (schema) {
    assertPattern(schema);
  }
  const assertKeyOkToWrite = key => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);

    assert(
      passStyleOf(key) === 'remotable',
      X`Only remotables can be keys of scalar WeakStores: ${key}`,
    );
    if (schema) {
      assertMatches(key, schema);
    }
  };
  const weakSetStore = Far(`scalar WeakSetStore of ${q(keyName)}`, {
    ...makeWeakSetStoreMethods(jsset, assertKeyOkToWrite, undefined, keyName),
  });
  return weakSetStore;
};
harden(makeScalarWeakSetStore);

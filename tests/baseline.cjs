const assert = require('node:assert/strict'), load = require('./js-loader.cjs');
const M=load('Markup'), D=load('Detect'), S=load('Store');
const payload='<a href="https://paypal.com@evil.example">paypal.com</a>Your code is 1234';
assert.notEqual(M.liftSource(payload).source, 'paypal.com');
assert.notEqual(M.liftSource(payload).source, 'paypal.com@evil.example');
assert.equal(M.linkable('https://paypal.com@evil.example'), false);
assert.equal(D.scan('Verification', 'Your code is 938271').code, '938271');
assert.equal(D.scan('codes', 'your code is 482913, backup code is 771204').codes, '482913 771204');
assert.equal(D.scan('Build', '412 passed, 0 failed').code, '');
assert.equal(M.liftSource('<a href="https://app.slack.com">app.slack.com</a>Hello').source, 'app.slack.com');
assert.equal(M.forwardedApp('KDE Connect', 'WhatsApp').name, 'WhatsApp');
assert.ok(D.scan('', '+44 7911 123456').phone);
assert.equal(S.restored({key:'test'}).restored, true);

// The mirror: built-in shape, newest first, dedup by key, both caps bite.
const now = 1000000.0;
const row = {key:'k1', app:'App', appIcon:'', summary:'Hello', body:'World', bodyLine:'World',
             rawBody:'World', source:'app:App', groupKey:'app:App', image:'', code:'', codes:'',
             link:'', meeting:false, phone:'', replyPath:'', replyTo:'', stored_image:'',
             urgency:1, expireTimeout:0, duration:5000, ts:now};
const e1 = S.mirrorEntry(row, 'expired', now);
assert.equal(e1.key, 'k1');
assert.equal(e1.closed_reason, 'expired');
assert.equal(e1.closed_ts, now);
assert.equal(e1.summary, 'Hello');
assert.ok(!('execArgv' in e1) && !('bodyRich' in e1), 'mirror keeps only what the archive reads');
assert.equal(S.mirrorEntry(row, 'nonsense reason', now).closed_reason, '');

let entries = S.addMirror([], e1, now);
const e2 = S.mirrorEntry(Object.assign({}, row, {key:'k2'}), 'dismissed', now - 10);
entries = S.addMirror(entries, e2, now);
assert.deepEqual([...entries.map(e => e.key)], ['k2', 'k1'], 'newest first');
entries = S.addMirror(entries, Object.assign({}, e1, {closed_ts: now - 1}), now);
assert.deepEqual([...entries.map(e => e.key)], ['k1', 'k2'], 'a re-closed key is deduped and newest first');
const later = now + S.MIRROR_HOURS * 3600 + 5;
entries = S.addMirror(entries, S.mirrorEntry(Object.assign({}, row, {key:'k3'}), 'expired', now), now);
entries = S.addMirror(entries, S.mirrorEntry(Object.assign({}, row, {key:'k4'}), 'expired', later), later);
assert.ok(!entries.some(e => e.key === 'k3'), 'rows past retention go');
for (let i = 0; i < S.MIRROR_LIMIT + 5; i++)
  entries = S.addMirror(entries, S.mirrorEntry(Object.assign({}, row, {key:'k' + i}), 'expired', later), later);
assert.equal(entries.length, S.MIRROR_LIMIT, 'the count cap holds');
assert.equal(S.parseMirror(S.serialiseMirror(entries)).length, S.MIRROR_LIMIT);
assert.deepEqual([...S.parseMirror('not json')], []);
assert.deepEqual([...S.parseMirror('[{"nokey":1}]')], []);

console.log('baseline: passed');

import test from 'node:test';
import assert from 'node:assert/strict';
import {boardSignals,hasSignalConflict} from '../dashboard/js/hardwareState.js';
import {Intersection} from '../dashboard/js/simulation/intersection.js';

test('actual red LED polarity maps to simulated signals',()=>{
  assert.equal(boardSignals({la:0,lb:1},true).S,'GREEN');
  assert.equal(boardSignals({la:0,lb:1},true).E,'RED');
  assert.equal(boardSignals({la:1,lb:0},true).E,'GREEN');
});
test('stale, disconnected and conflicting signals hold virtual all-red',()=>{
  for(const signals of [boardSignals({la:0,lb:1},false),boardSignals(null,true),boardSignals({la:0,lb:0},true)]) {
    assert.ok(Object.values(signals).every(state=>state==='RED'));
  }
  assert.ok(hasSignalConflict({la:0,lb:0}));
});
test('sensor controller mode uses actual phase when LED fields are absent',()=>{
  assert.equal(boardSignals({g:'B',ph:'GREEN'},true).E,'GREEN');
  assert.equal(boardSignals({g:'A',ph:'CLEAR'},true).S,'RED');
});
test('external signals take precedence and do not advance with playback speed',()=>{
  const node=new Intersection();
  node.externalSignals=boardSignals({la:1,lb:0},true);
  node.setManualOverride('S','GREEN');
  const before=node.phaseTimer;
  node.update(30,true);
  assert.equal(node.phaseTimer,before);
  assert.equal(node.getSignalStateForApproach('S'),'RED');
  assert.equal(node.getSignalStateForApproach('E'),'GREEN');
});

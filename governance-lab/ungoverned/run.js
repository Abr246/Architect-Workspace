'use strict';

const { proposeAction } = require('./agent');
const { performAct } = require('./act');

const mode = process.env.AGENT_MODE || 'normal';

const proposal = proposeAction(mode);
console.log('PROPOSED ACTION:');
console.log(JSON.stringify(proposal, null, 2));

const result = performAct(proposal);
console.log('CARRIED OUT:');
console.log(JSON.stringify(result, null, 2));

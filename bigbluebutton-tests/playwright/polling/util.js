
const { test } = require('@playwright/test');
const { ELEMENT_WAIT_LONGER_TIME } = require('../core/constants.js');
const e = require('../core/elements.js');
const { getSettings } = require('../core/settings.js');

async function openPoll(testPage) {
  const { pollEnabled } = getSettings();
  test.fail(!pollEnabled, 'Polling is disabled');

  await testPage.waitAndClick(e.actions);
  await testPage.waitAndClick(e.polling);
  await testPage.waitForSelector(e.hidePollDesc);
  await testPage.waitAndClick(e.pollLetterAlternatives);
  await testPage.waitForSelector(e.pollOptionItem);
}

async function startPoll(test, shouldPublishPoll = false, isAnonymous = false) {
  await openPoll(test);
  if (isAnonymous) await test.getLocator(e.anonymousPoll).setChecked();
  await test.waitAndClick(e.startPoll);
  if (shouldPublishPoll) await test.waitAndClick(e.publishPollingLabel);
}

exports.openPoll = openPoll;
exports.startPoll = startPoll;

import bolt, { ExpressReceiver } from '@slack/bolt'; 
import { PrismaClient } from '@prisma/client';
import { IntervalManager } from './utils/intervalManager.js';
import { Environment, Constants } from './constants.js';

//import { createId } from '@paralleldrive/cuid2';

const expressReceiver = new bolt.ExpressReceiver({
    signingSecret: Environment.SLACK_SIGNING_SECRET,
    endpoints: '/slack/events',
    processBeforeResponse: true,
});

export const express = expressReceiver;

export const app = new bolt.App({
    token: Environment.SLACK_BOT_TOKEN,
    appToken: Environment.SLACK_APP_TOKEN,

    receiver: expressReceiver,
});

app.error(async (error) => {
    await app.client.chat.postMessage({
        channel: process.env.LOG_CHANNEL || 'C0P5NE354' ,
        text: `<@U04QD71QWS0> I summon thee for the following reason: \`Hack Hour had an error! - Bolt JS\`\n*Error:*\n\`\`\`${error.message}\`\`\``, //<!subteam^${process.env.DEV_USERGROUP}|hack-hour-dev>
    });
});
 
export const prisma = new PrismaClient();

export const minuteInterval = new IntervalManager(Constants.MIN_MS);
export const hourInterval = new IntervalManager(Constants.HOUR_MS);

hourInterval.setDelay(Constants.HOUR_MS - Date.now() % Constants.HOUR_MS);
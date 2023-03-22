'use strict';

// University:  Middle Tennessee State University - MTSU
// Class:       CSCI 7400 - Assignment 02
// By:          Richard Hoehn (PhD Candiate)
// Pub Date:    2023-03-25
// Due Date:    2023-04-06
// Desc:        This is a project to introduct & demonstate AWS Polly for Assignment 02
// Links:       * AWS Polly: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-pollyClient/
//              * AWS S3:    https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
//              * NodeJS:    https://nodejs.org/en/docs
//              * AWS SDK:   https://aws.amazon.com/sdk-for-javascript/
//              * GIT:       https://github.com/richardhoehn/mtsu.csci.7400.assignment02

require('dotenv').config(); // Load ENV params (.env)

// Convert ALL ENV keys to upper case (this can be an issue with AWS keys not being upper case)
process.env = Object.keys(process.env).reduce((destination, key) => {
    destination[key.toUpperCase()] = process.env[key];
    return destination;
}, {});

// Get Modules
const fs = require('fs');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const player = require("sound-play");

// AWS Polly Module
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');

// Input from Terminal Control
const readline = require('node:readline/promises');
const { stdin:input, stdout:output } = require('node:process');
const rl = readline.createInterface({ input, output });


// Async Funciton Start
const run = async () => {
    console.clear();
    const pollyClient = new PollyClient();

    // Get User's name...
    const userName = await rl.question("\n\nHi,\nWhat's your name: ");
    const dateTime = new Date();
    const dayName = dateTime.toLocaleDateString('en-us', { weekday: 'long' });
    const daysToWeekend = 5 - dateTime.getDay();
    const filename = `${dateTime.toISOString()}.mp3`;

    const pollyParams = {
        Engine: 'neural',
        OutputFormat: 'mp3',
        Text: `Hi ${userName}, I hope you are doing well on this beautiful ${dayName}? Only ${daysToWeekend} days until the weekend!`,
        TextType: 'text',
        VoiceId: 'Ruth',
    };

    // Send to AWS for Speech Syntesis
    console.log(`\nSending to AWS Polly:\n\n>>> ${pollyParams.Text}\n`);
    console.time('AWS Round Trip');
    const data = await pollyClient.send(new SynthesizeSpeechCommand(pollyParams));
    console.timeEnd('AWS Round Trip');

    // If the response is of type "Readable" the stream to local disk and play
    if (data.AudioStream instanceof Readable) {

        await pipeline(data.AudioStream, fs.createWriteStream(`./media/${filename}`));

        console.log('\nPlaying returned "mp3" now...\n');
        await player.play(`./media/${filename}`);
    }

    console.log('\nDone with Demo - Have a good day!\n\n\n');
    rl.close();
};

// Execute Function
run();

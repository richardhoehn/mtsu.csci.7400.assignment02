'use strict';

// University:  Middle Tennessee State University - MTSU
// Class:       CSCI 7400 - Assignment 02
// By:          Richard Hoehn (PhD Candiate)
// Pub Date:    2023-03-25
// Due Date:    2023-04-06
// Desc:        This is a project to introduct & demonstate AWS Polly and S3 for Assignment 02. This application
//              requests a user's name and creates a simple text to speech command that gets syntezied by AWS Polly (cloud)
//              and returned as a Readable Stream to the application. It then saves the file (mp3) to local disk and also
//              uploads to a spesfic S3-bucket on AWS S3. And finally, for demonstration purposes, plays the mp3 file on 
//              the PC's speakers as an added bonus.
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
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// Input from Terminal Control
const readline = require('node:readline/promises');
const { stdin:input, stdout:output } = require('node:process');
const rl = readline.createInterface({ input, output });


// Async Funciton Start
const run = async () => {
    console.clear();
    const pollyClient = new PollyClient();
    const s3Client = new S3Client();

    // Get User's name... and setup date & time variables
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

    const s3Params = {
        Bucket: process.env.AWS_BUCKET,
        Key: filename
    };

    // Send to AWS for Speech Syntesis
    console.log(`\nSending to AWS Polly:\n>>> ${pollyParams.Text} <<<`);
    console.time('AWS Round Trip');
    const data = await pollyClient.send(new SynthesizeSpeechCommand(pollyParams));
    console.timeEnd('AWS Round Trip');

    // If the response is of type "Readable" the stream to local disk and play
    if (data.AudioStream instanceof Readable) {

        console.log(`\nSaving (${filename}) to local disk now...`);
        console.time('Local Save');
        await pipeline(data.AudioStream, fs.createWriteStream(`./media/${filename}`));
        console.log('Local save complete');
        console.timeEnd('Local Save');

        console.log(`\nUploading (${filename}) to S3 now...`);
        console.time('AWS Round Trip');
        const mp3File = fs.readFileSync(`./media/${filename}`);
        await s3Client.send(new PutObjectCommand({Body: mp3File, ...s3Params}));
        console.log('Uploading to S3 complete');
        console.timeEnd('AWS Round Trip');

        console.log('\nGet size of uploaded file from S3 now..');
        console.time('AWS Round Trip');
        const s3Resp = await s3Client.send(new HeadObjectCommand(s3Params));
        console.log(`File (${filename}) retrieved is ${(s3Resp.ContentLength/1024).toFixed(2)}kb`);
        console.timeEnd('AWS Round Trip');

        console.log('\nPlaying returned "mp3" now...');
        console.time('Sound Play Time');
        await player.play(`./media/${filename}`);
        console.timeEnd('Sound Play Time');
    }

    console.log('\nDone with Demo - Have a good day!\n\n\n');
    rl.close();
};

// Execute Function (async)
run();

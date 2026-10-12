// Generates scene .paint.json files: node examples/episode-01/build.mjs
import { writeFileSync } from 'node:fs';
import { s0Title, s1Establish, s2Intro } from './scenes1.mjs';
import { s3Gags, s4Climax, s5Ending, s6End } from './scenes2.mjs';
const dir = new URL('.', import.meta.url).pathname;
[s0Title, s1Establish, s2Intro, s3Gags, s4Climax, s5Ending, s6End].forEach((f, i) => writeFileSync(`${dir}scene${i}.paint.json`, JSON.stringify(f(), null, 1)));
console.log('wrote 7 scenes');

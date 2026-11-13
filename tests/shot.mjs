// Open a page of the running demo in Chrome and save a picture of it:
//   node tests/shot.mjs '/?lat=53.0685&lon=-4.0763&name=Yr%20Wyddfa&forest' out.png [settle ms]
// BASE (default http://localhost:5173) and CHROME (the browser's path) can be set.
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const CHROME =
	process.env.CHROME ??
	(process.platform === 'darwin'
		? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
		: process.platform === 'win32'
			? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
			: '/usr/bin/google-chrome');
const [path = '/', out = 'shot.png', settle = '9000'] = process.argv.slice(2);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: process.env.SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: Number(process.env.W ?? 1280), height: Number(process.env.H ?? 860), deviceScaleFactor: Number(process.env.DPR ?? 1) });
if (process.env.STILL) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 120000 });
await new Promise((r) => setTimeout(r, Number(settle)));
// MOUSE=x,y: point at something first; CLICK=1 to click it
if (process.env.MOUSE) {
	const [mx, my] = process.env.MOUSE.split(',').map(Number);
	await page.mouse.move(mx - 4, my - 4);
	await page.mouse.move(mx, my);
	if (process.env.CLICK) await page.mouse.click(mx, my);
	await new Promise((r) => setTimeout(r, 1500));
}
if (process.env.EVAL) console.log(JSON.stringify(await page.evaluate(process.env.EVAL)));
const clip = process.env.CLIP?.split(',').map(Number);
await page.screenshot({ path: out, ...(clip ? { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } } : {}) });
await browser.close();
console.log(errors.length ? `errors:\n  ${errors.join('\n  ')}` : 'no errors');
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node

const markdown_dir = process.env.INPUT_MARKDOWN_DIR;
const output_dir = process.env.INPUT_OUTPUT_DIR;
const media_dir = process.env.INPUT_MEDIA_DIR;

'use strict';
var fs = require( 'fs' );
var mddir = '/github/workspace/' + markdown_dir;
var dir = '/github/workspace/' + output_dir + '/';
var meddir = '/github/workspace' + media_dir + '/';

/*
 * Show an error message
 */
function showErrorMessage(msg, error) {
	console.log('ERROR: ' + msg);
	if (error) {
	  console.log(error);
	}
}

/*
 * make html
 */
function makeHtml(data) {
	try {
		// read files that make up template
		var style = fs.readFileSync("/styles/markdown.css", ).toString('utf-8') + fs.readFileSync("/styles/markdown-pdf.css", ).toString('utf-8');
		var template = fs.readFileSync("/template/template.html").toString('utf-8');
		// compile template
		var mustache = require('mustache');

		var view = {
			style: style,
			content: data
		};
		return mustache.render(template, view);
	} catch (error) {
		showErrorMessage('makeHtml()', error);
	}
}

/*
 * make PDF
 */
function makePdf(data,file) {
	try {
		file  = file.replace('.md','');
		const puppeteer = require('puppeteer');
  		const express = require('express');
		(async () => {

        //Create server for images
        const app = express();
        app.use(express.static(meddir));
        server = app.listen(3000);

				const browser = await puppeteer.launch( {
				executablePath:'/node_modules/puppeteer/.local-chromium/linux-782078/chrome-linux/chrome',
				args: [
					'--headless',
					'--no-sandbox',
					'--disable-setuid-sandbox'
				]
			} )
			const page = await browser.newPage();
			await page.goto(data, {waitUntil: 'networkidle2'});
			await page.pdf({
				path: dir + file + '.pdf',
				format: 'A4',
				scale: .9,
				displayHeaderFooter: true,
				margin: {top: 100, bottom:100, right: '50', left: '50'},
				footerTemplate: '<div class="pageNumber" style="font-size:8px;width:100%;text-align:center;"></div>',
				headerTemplate: '<div class="date" style="font-size:8px;width:100%;text-align:center;"></div>'
			});

			await browser.close();
                        await server.close();
		  })();
	} catch (error) {
		showErrorMessage('makeHtml()', error);
	}
}

function Slug(string) {
	try {
	  var stg = encodeURI(string.trim()
		.toLowerCase()
		.replace(/[\]\[\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`]/g, '')
		.replace(/\s+/g, '-')
		.replace(/^\-+/, '')
		.replace(/\-+$/, ''));
	  return stg;
	} catch (error) {
	  showErrorMessage('Slug()', error);
	}
}

var path = require('path');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

if (!fs.existsSync(meddir)){
    fs.mkdirSync(meddir);
}

fs.readdir (mddir,function(err, files) {
   for (let file of files) {
      if (path.extname(file) == '.md') {
				var text = fs.readFileSync(mddir + '/' + file).toString('utf-8');
				var md = require('markdown-it')({
					html: true,
					breaks: true,
					highlight: function (str, lang) {
						if (lang && hljs.getLanguage(lang)) {
						try {
							str = hljs.highlight(lang, str, true).value;
						} catch (error) {
							str = md.utils.escapeHtml(str);

							showErrorMessage('markdown-it:highlight', error);
						}
						} else {
						str = md.utils.escapeHtml(str);
						}
						return '<pre class="hljs"><code><div>' + str + '</div></code></pre>';
					}
				}).use(require('markdown-it-highlightjs'), { inline: true });
				var options = {
						slugify: Slug
				}
				md.use(require('markdown-it-named-headers'), options);
	      		md.use(require("markdown-it-anchor"));
				md.use(require("markdown-it-table-of-contents"));
				var body = md.render(text);
				makePdf('data:text/html;,' + encodeURIComponent(makeHtml(body)),file);
      }
   }
});

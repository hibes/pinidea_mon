"use strict";

const SAVE_FILENAME = './data/data.json';

const ONE_SECOND = 1000;
const TEN_SECONDS = 10000;
const ONE_MINUTE = 60000;
const TEN_MINUTES = 600000;
const ONE_DAY = 3600 * 1000 * 24;

const DEFAULT_POLL_TIMER = TEN_MINUTES;
const DEFAULT_RETRY_TIME = ONE_MINUTE;
const MIN_EMAIL_FREQUENCY = ONE_DAY;

function main() {
  load();

  poll();

  interval = setInterval(poll, conf.freq || DEFAULT_POLL_TIMER);
}

let conf = require('./config/main.cfg.json');
let fs = require('fs');
let htmlparser = require('htmlparser');
let https = require('https');
let lastData = undefined;
let lastEmailDate = 0;
let pkg = require('./package.json');
let interval = undefined;
let nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport(conf.transporter);
let uagent = `darwin:${conf.domain}:${pkg.version}`;
let url = require('url');

let mailOptions = {
  'from': '"' + conf.sourceName + '" <' + conf.sourceEmail + '>',
  'to': conf.destinationEmail,
  'html': ''
};

function formatResults(json) {
  return json.reduce((acc, item) => {
    return acc + '<b>' + item.title + '</b><br>' +
      item.url + '<br>' +
      "instock: " + item.instock + '<br>' +
      "outofstock: " + item.outofstock + '<br><br>';
  }, '');
}

function load() {
  if (fs.existsSync(SAVE_FILENAME)) {
    lastData = require(SAVE_FILENAME);
  }
}

function save(data) {
  fs.writeFile(SAVE_FILENAME, JSON.stringify(data), (err) => {
    if (err) console.log(`Error writing file ${err}`);
  });
}

function detectNew(oldArray, newArray) {
  if (oldArray === undefined || oldArray === null || oldArray.length === 0) {
    return newArray;
  }

  return newArray.filter((newItem) => {
    return oldArray.reduce((acc, oldItem) => {
      return acc + (oldItem.id === newItem.id ? 1 : 0);
    }, 0) === 0;
  });
}

function getData(result) {
  return result.filter((element) => {
    return element.name === 'html';
  })[0].children.filter((element) => {
    return element.name === 'body';
  })[0].children.filter((element) => {
    return element.attribs && element.attribs.id === 'page';
  })[0].children.filter((element) => {
    return element.attribs && element.attribs.id === 'content';
  })[0].children.filter((element) => {
    return element.name === 'div' && element.raw.indexOf('col-full');
  })[0].children.filter((element) => {
    return element.attribs && element.attribs.id === 'primary';
  })[0].children.filter((element) => {
    return element.attribs && element.attribs.id === 'main';
  })[0].children.filter((element) => {
    return element.name === 'ul' && element.raw.indexOf('products');
  })[0].children.filter((element) => {
    return element.name === 'li';
  }).map((element) => {
    let productLink = element.children.filter((element) => {
      return element.name === 'a' && element.attribs && element.attribs.href;
    });

    let h3 = productLink[0].children.filter((element) => {
      return element.name === 'h3';
    });

    let mappedElement = {
      'id': h3[0].children[0].raw,
      'outofstock': element.raw.indexOf('outofstock') !== -1,
      'instock': element.raw.indexOf('instock') !== -1,
      'title': h3[0].children[0].raw,
      'url': productLink[0].attribs.href
    };

    return mappedElement;
  });
}

function pollAPI(callback) {
  let apiUrl = url.parse(conf.url);

  let options = {
    'protocol': apiUrl.protocol,
    'hostname': apiUrl.hostname,
    'port': apiUrl.port,
    'path': apiUrl.path,
    'query': apiUrl.query,
    'method': 'GET',
    'User-Agent': uagent
  };

  https.get(options, (response) => {
    let rawData = '';

    console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`);

    let xrates = {
      'used': response.headers['X-Ratelimit-Used'],
      'remd': response.headers['X-Ratelimit-Remaining'],
      'rest': response.headers['X-Ratelimit-Reset']
    };

    if (xrates.used || xrates.remd || xrates.rest) {
      console.log(`X-Ratelimits: ${JSON.stringify(xrates, null, 2)}`);
    }

    let handler = new htmlparser.DefaultHandler(function (error, dom) {
      callback(dom, error);
    });
    let parser = new htmlparser.Parser(handler);

    response.on('data', (chunk) => {
      parser.parseChunk(chunk);
    });

    response.on('end', () => {
      parser.done();
    }).on('error', (e) => {
      callback(null, e);
    });
  });
}

function sendMail(html) {
  mailOptions.html = html;

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }

    lastEmailDate = getTime();

    console.log('Message %s sent: %s', info.messageId, info.response);
  });
}

function poll() {
  pollAPI((result, err) => {
    if (result) {
      if (result.error) {
        console.log('Error: ' + JSON.stringify(result));

        setTimeout(poll, DEFAULT_RETRY_TIME);

        return;
      }

      let newData = getData(result);

      let newIds = detectNew(lastData, newData);

      if (newIds.length > 0) {
        mailOptions.subject = conf.emailSubject;

        sendMail(formatResults(newData));
      } else if (lastEmailDate + MIN_EMAIL_FREQUENCY < getTime()) {
        mailOptions.subject = conf.periodicEmailSubject;

        sendMail(formatResults(newData));
      }

      lastData = newData;

      save(newData);
    }
    if (err) {
      console.log("Error: " + err);
    }
  });
}

function getTime() {
  return (new Date()).getTime();
}

main();

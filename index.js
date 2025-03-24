// index.js
require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const LOG_PATH = path.join(__dirname, 'action-log.txt');

const GMAIL_USER = process.env.GMAIL_USER;

// ===== Load OAuth and Start Loop =====
fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.error('❌ Error loading client secret:', err);
  authorize(JSON.parse(content), startLoop);
});

// ===== OAuth =====
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  } else {
    console.error('❌ Missing token.json. Run locally to generate it.');
  }
}

// ===== Ping Endpoint (for UptimeRobot) =====
app.get('/', (req, res) => {
  res.send('✅ Email Responder is running');
});

// ===== Start Email Check Loop =====
function startLoop(auth) {
  setInterval(() => checkInbox(auth), 5 * 60 * 1000); // every 5 minutes
  console.log('⏱️ Email check loop started (every 5 min)');
}

// ===== Inbox Checker =====
async function checkInbox(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 10 });

  const messages = res.data.messages || [];
  for (const msg of messages) {
    const data = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = data.data.payload.headers;

    const from = getHeader(headers, 'From');
    const replyTo = getHeader(headers, 'Reply-To');
    const subject = getHeader(headers, 'Subject');
    const snippet = data.data.snippet;

    const fromEmail = extractEmail(from);
    const replyToEmail = extractEmail(replyTo);

    const isFromSelf = fromEmail === GMAIL_USER;
    const isFromTJs = fromEmail === 'tj@tjsktm.ccsend.com' || replyToEmail === 'tj@tjs-cycle.com';

    if (isFromSelf) {
      await sendReply(gmail, msg.id);
      logAction('✅ Replied "yes" to', from, subject, snippet);
    } else if (isFromTJs) {
      await markAsRead(gmail, msg.id);
      logAction('📥 Marked as read from TJ', from, subject, snippet);
    }
  }

  console.log('📬 Inbox checked');
}

// ===== Helpers =====
function getHeader(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function extractEmail(raw) {
  const match = raw.match(/<(.+)>/);
  return match ? match[1] : raw;
}

async function sendReply(gmail, msgId) {
  const raw = Buffer.from([
    `From: ${GMAIL_USER}`,
    `To: ${GMAIL_USER}`,
    'Subject: Re: Yes',
    '',
    'yes'
  ].join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  await markAsRead(gmail, msgId);
}

async function markAsRead(gmail, msgId) {
  await gmail.users.messages.modify({
    userId: 'me',
    id: msgId,
    requestBody: { removeLabelIds: ['UNREAD'] }
  });
}

function logAction(action, from, subject, snippet) {
  const entry = `[${new Date().toISOString()}] ${action} — From: ${from}, Subject: ${subject}, Snippet: ${snippet}\n`;
  fs.appendFileSync(LOG_PATH, entry);
}

// ===== Start Web Server =====
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
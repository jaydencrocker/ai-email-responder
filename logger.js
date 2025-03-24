import fs from 'fs';
const logFile = 'log.txt';

export function logReply(subject, from) {
  const time = new Date().toISOString();
  const msg = `[${time}] ✅ Replied "yes" to: ${from} | Subject: ${subject}\n`;
  fs.appendFileSync(logFile, msg);
  console.log(msg.trim());
}

export function logRead(subject, from) {
  const time = new Date().toISOString();
  const msg = `[${time}] 📖 Read (no reply): ${from} | Subject: ${subject}\n`;
  fs.appendFileSync(logFile, msg);
  console.log(msg.trim());
}
import imaplib
import smtplib
import email
from email.mime.text import MIMEText

# Email credentials (use environment variables for security)
EMAIL_USER = "your_email@example.com"
EMAIL_PASS = "your_password"

# Connect to email server
mail = imaplib.IMAP4_SSL("imap.gmail.com")
mail.login(EMAIL_USER, EMAIL_PASS)
mail.select("inbox")

# Search for unread emails
status, messages = mail.search(None, 'UNSEEN')
emails = messages[0].split()

for num in emails:
    status, msg_data = mail.fetch(num, '(RFC822)')
    raw_email = msg_data[0][1]
    msg = email.message_from_bytes(raw_email)

    # Extract sender and subject
    sender = msg["From"]
    subject = msg["Subject"]

    # Generate a response
    response = "Thank you for your email. We will get back to you soon!"

    # Send auto-reply
    smtp = smtplib.SMTP_SSL("smtp.gmail.com", 465)
    smtp.login(EMAIL_USER, EMAIL_PASS)
    reply = MIMEText(response)
    reply["Subject"] = "Re: " + subject
    reply["From"] = EMAIL_USER
    reply["To"] = sender
    smtp.sendmail(EMAIL_USER, sender, reply.as_string())
    smtp.quit()

mail.logout()
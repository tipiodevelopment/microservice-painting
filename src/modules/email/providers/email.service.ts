// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from 'src/modules/firebase/firebase.service';
import { Configuration } from '../../../config/utils/config.keys';

@Injectable()
export class EmailService {
  private oauth2Client = this.createOAuthClient();

  constructor(
    private readonly config: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {}

  healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Email' };
  }

  private createOAuthClient() {
    // const client = new google.auth.OAuth2(
    //   this.config.get(Configuration.GMAIL_CLIENT_ID),
    //   this.config.get(Configuration.GMAIL_CLIENT_SECRET),
    //   this.config.get(Configuration.GMAIL_REDIRECT_URI),
    // );
    // client.setCredentials({
    //   refresh_token: this.config.get(Configuration.GMAIL_REFRESH_TOKEN),
    // });
    // return client;
    return {} as any;
  }

  private makeRawMessage(to: string, subject: string, text: string) {
    const from = this.config.get(Configuration.EMAIL_FROM);
    const str = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text,
    ].join('\n');

    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendWelcomeEmail(to: string, userName: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const raw = this.makeRawMessage(
      to,
      'Welcome to Your App!',
      `Hi ${userName},\n\nThanks for joining Your App! We’re thrilled to have you on board.\n\n— The Your App Team`,
    );

    try {
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      console.log(`Welcome email sent to ${to}`);
    } catch (err) {
      console.error(`Failed to send welcome to ${to}`, err);
    }
  }

  async sendNewsletter(subject: string, text: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    // Fetch all users from Firestore (adjust collection name as needed)
    const usersSnap = await this.firebaseService.getCollection('users');
    const emails: string[] =
      usersSnap.data
        ?.map((u) => u.email)
        .filter((e) => typeof e === 'string') ?? [];

    for (const email of emails) {
      const raw = this.makeRawMessage(email, subject, text);
      try {
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw },
        });
        console.log(`Newsletter sent to ${email}`);
      } catch (err) {
        console.error(`Newsletter failed for ${email}`, err);
      }
    }
  }
}

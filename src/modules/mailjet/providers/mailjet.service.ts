import { Injectable } from '@nestjs/common';
import * as Mailjet from 'node-mailjet';

export interface Recipient {
  Email: string;
  Name: string;
}

export enum MailjetTemplateId {
  Welcome = 7025737,
}

@Injectable()
export class MailjetService {
  private client: Mailjet.Client;
  private fromEmail: string;
  private fromName: string;
  constructor() {
    this.client = Mailjet.connect(
      'a59ff3a9706008725d58a46c5d6010d5',
      '89e8b87ed39b84a51843816fa76d1560',
    );
    this.fromEmail = 'no-reply@paint-finder.app';
    this.fromName = 'Paint Finder';
  }

  async healthCheck() {
    return {
      executed: true,
      message: 'OK',
      microservice: 'MailjetService',
    };
  }

  async sendTemplate(
    templateId: number,
    to: Recipient[],
    variables: Record<string, any>,
    subject?: string,
  ) {
    return this.client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: this.fromEmail, Name: this.fromName },
          To: to,
          TemplateID: templateId,
          TemplateLanguage: true,
          Subject: subject,
          Variables: variables,
        },
      ],
    });
  }
}

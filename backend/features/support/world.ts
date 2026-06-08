import { setWorldConstructor, World } from '@cucumber/cucumber';
import axios from 'axios';

export class CustomWorld extends World {
  baseUrl = 'http://localhost:3000';
  token: string | null = null;
  response: any = null;
  lastStatusCode: number = 0;
  credentials: { email: string; password: string } = { email: '', password: '' };

  async sendRequest(method: string, path: string, body?: any) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const res = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        data: body,
        headers,
        validateStatus: () => true, // ne pas lever d'exception sur les 4xx/5xx
      });
      this.response = res.data;
      this.lastStatusCode = res.status;
    } catch (e: any) {
      this.lastStatusCode = 500;
      this.response = { error: e.message };
    }
  }
}

setWorldConstructor(CustomWorld);

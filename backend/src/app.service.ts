import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello this mohamed sakly my backend is working properly';
  }
}

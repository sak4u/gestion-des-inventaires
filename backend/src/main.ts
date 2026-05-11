import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './custom-logger';

Object.defineProperty(BigInt.prototype, 'toJSON', {
  value(this: bigint) {
    return Number(this);
  },
  configurable: true,
  writable: true,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });

  app.enableCors({
    origin: ['http://localhost:5173', 'http://192.168.1.19:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on http://localhost:${process.env.PORT ?? 3000}`);
}

void bootstrap();

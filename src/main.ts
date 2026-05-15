import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';

function corsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;
  return ['http://localhost:8080', 'http://localhost:3000'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS — set `CORS_ORIGINS` in production (comma-separated, e.g. https://app.vercel.app)
  app.enableCors({
    origin: corsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));
  
  app.use(bodyParser.json());
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
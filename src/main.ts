import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';

/** Merge env list with dev defaults; allow any `*.vercel.app` (production + preview deploys). */
function corsOriginDelegate(): (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
) => void {
  const defaults = [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://general-pos-frontend.vercel.app',
  ];
  const fromEnv =
    process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ??
    [];
  const allowSet = new Set([...defaults, ...fromEnv]);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowSet.has(origin)) {
      callback(null, true);
      return;
    }
    try {
      const { hostname } = new URL(origin);
      if (hostname.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }
    } catch {
      // ignore invalid origin URL
    }
    callback(null, false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS: defaults + `CORS_ORIGINS` + all *.vercel.app (preview URLs)
  app.enableCors({
    origin: corsOriginDelegate(),
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
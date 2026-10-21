import "reflect-metadata";
import {
  Controller,
  Get,
  Module,
  Param,
  Query,
  ServiceUnavailableException,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ApiOperation, ApiTags, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Database } from "./database";
import { CatalogService } from "./catalog.service";
import { CatalogQuery, TerritoryQuery } from "./catalog.dto";
import { AuthController, SessionGuard } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { LocalSms } from "./auth/local-sms";

@ApiTags("Catalog")
@Controller()
class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get("territories")
  @ApiOperation({ summary: "List territories" })
  territories() {
    return this.catalog.territories();
  }
  @Get("categories")
  @ApiOperation({ summary: "List service categories" })
  categories() {
    return this.catalog.categories();
  }
  @Get("situations")
  @ApiOperation({ summary: "List life situations" })
  situations() {
    return this.catalog.situations();
  }
  @Get("organizations")
  @ApiOperation({ summary: "List providers by territory (not an address eligibility check)" })
  organizations(@Query() query: TerritoryQuery) {
    return this.catalog.organizations(query.territoryId);
  }
  @Get("services")
  @ApiOperation({
    summary: "Search services; localized fields include ru, kk and en; lang reserved for ranking",
  })
  services(@Query() query: CatalogQuery) {
    return this.catalog.search(query);
  }
  @Get("services/:slug")
  @ApiOperation({ summary: "Get service by slug" })
  service(@Param("slug") slug: string) {
    return this.catalog.service(slug);
  }
}

@ApiTags("Health")
@Controller("health")
class HealthController {
  constructor(private readonly db: Database) {}
  @Get("live")
  live() {
    return { status: "ok" };
  }
  @Get("ready")
  async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      throw new ServiceUnavailableException("DATABASE_UNAVAILABLE");
    }
  }
}

@Module({
  controllers: [CatalogController, HealthController, AuthController],
  providers: [Database, CatalogService, AuthService, LocalSms, SessionGuard],
})
class AppModule {}

export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
    bodyParser: true,
  });
  app.use(
    (
      request: { originalUrl: string },
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      if (request.originalUrl.startsWith("/api/v1/auth"))
        response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000" });
  app.enableShutdownHooks();
  const config = new DocumentBuilder()
    .setTitle("Aqmola API")
    .setVersion("0.1.0")
    .setDescription(
      "Local catalog and phone authentication API. Development SMS delivery writes local files. Identity is self-declared until government verification is connected.",
    )
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));
  return app;
}

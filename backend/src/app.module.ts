import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { UsersController } from './admin/users.controller';
import { UsersService } from './admin/users.service';
import { FavoritesController } from './favorites/favorites.controller';
import { FavoritesService } from './favorites/favorites.service';
import { AdminBookingsController } from './bookings/admin-bookings.controller';
import { BookingsController } from './bookings/bookings.controller';
import { BookingsService } from './bookings/bookings.service';
import { OccupancyService } from './bookings/occupancy.service';
import { AdminCalendarController, HostCalendarController } from './bookings/calendar.controller';
import { CalendarService } from './bookings/calendar.service';
import { FeaturedController } from './villas/featured.controller';
import { AdminHostApplicationsController } from './host-applications/admin-host-applications.controller';
import { HostApplicationsController } from './host-applications/host-applications.controller';
import { HostApplicationsService } from './host-applications/host-applications.service';
import { ConceptsController } from './pages/concepts.controller';
import { PagesController } from './pages/pages.controller';
import { RegionsController } from './pages/regions.controller';
import { PagesService } from './pages/pages.service';
import { AdminSettingsController, SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { AdminConceptsController } from './taxonomy/concepts.controller';
import { AdminRegionsController } from './taxonomy/regions.controller';
import { TaxonomyService } from './taxonomy/taxonomy.service';
import { AdminVillasController } from './villas/admin-villas.controller';
import { PublicVillasController } from './villas/public-villas.controller';
import { HostVillasController } from './villas/host-villas.controller';
import { VillaImagesService } from './villas/villa-images.service';
import { VillasService } from './villas/villas.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Varsayılan gevşek; dar limit auth ve host-application uçlarında @Throttle ile veriliyor.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
  ],
  controllers: [
    PagesController,
    RegionsController,
    ConceptsController,
    AdminRegionsController,
    AdminConceptsController,
    AdminController,
    UsersController,
    SettingsController,
    AdminSettingsController,
    HostApplicationsController,
    AdminHostApplicationsController,
    AdminBookingsController,
    BookingsController,
    AdminCalendarController,
    HostCalendarController,
    AdminVillasController,
    FeaturedController,
    HostVillasController,
    PublicVillasController,
    FavoritesController,
  ],
  providers: [
    PrismaService,
    PagesService,
    AdminService,
    UsersService,
    SettingsService,
    HostApplicationsService,
    VillasService,
    VillaImagesService,
    TaxonomyService,
    FavoritesService,
    BookingsService,
    OccupancyService,
    CalendarService,
  ],
})
export class AppModule {}

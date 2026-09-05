import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma.service';
import { VillasService } from './villas.service';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads', 'villas');
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'http://localhost:4000';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

@Injectable()
export class VillaImagesService {
  constructor(
    private prisma: PrismaService,
    private villas: VillasService,
  ) {}

  /** Görseller herkese açık servis edilir (host-application belgelerinin aksine) — pazarlama fotoğrafı. */
  async add(
    villaId: string,
    category: string,
    file: Express.Multer.File,
    dims: { width?: number; height?: number },
    hostId?: string,
  ) {
    await this.villas.getScoped(villaId, hostId);

    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) throw new BadRequestException('Yalnızca JPG veya PNG dosyası yükleyebilirsiniz.');
    if (file.size > MAX_IMAGE_SIZE) throw new BadRequestException('Dosya boyutu 15 MB’ı aşamaz.');

    const dir = join(UPLOAD_ROOT, villaId);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    const storedName = `${randomUUID()}${ext}`;
    await writeFile(join(dir, storedName), file.buffer);

    const count = await this.prisma.villaImage.count({ where: { villaId } });

    return this.prisma.villaImage.create({
      data: {
        villaId,
        category: category as any,
        url: `${PUBLIC_URL}/uploads/villas/${villaId}/${storedName}`,
        storedName,
        fileName: file.originalname.slice(0, 200),
        mimeType: file.mimetype,
        size: file.size,
        width: dims.width,
        height: dims.height,
        order: count,
        isCover: count === 0,
      },
    });
  }

  async reorderOrCover(villaId: string, imageId: string, data: { order?: number; isCover?: boolean }, hostId?: string) {
    await this.villas.getScoped(villaId, hostId);
    const image = await this.assertImage(villaId, imageId);

    if (data.isCover) {
      await this.prisma.villaImage.updateMany({ where: { villaId }, data: { isCover: false } });
    }
    return this.prisma.villaImage.update({
      where: { id: image.id },
      data: {
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.isCover !== undefined ? { isCover: data.isCover } : {}),
      },
    });
  }

  async remove(villaId: string, imageId: string, hostId?: string) {
    await this.villas.getScoped(villaId, hostId);
    const image = await this.assertImage(villaId, imageId);
    await this.prisma.villaImage.delete({ where: { id: image.id } });
    if (image.storedName) {
      await unlink(join(UPLOAD_ROOT, villaId, image.storedName)).catch(() => {});
    }
    return { ok: true };
  }

  private async assertImage(villaId: string, imageId: string) {
    const image = await this.prisma.villaImage.findUnique({ where: { id: imageId } });
    if (!image || image.villaId !== villaId) throw new NotFoundException('Görsel bulunamadı.');
    return image;
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApplicationStatus, DocumentType, OwnershipType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma.service';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads', 'host-applications');

const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type CreateApplicationInput = {
  ownerName: string;
  ownerIdNumber: string;
  phone: string;
  email: string;
  uetsAddress?: string;
  iban: string;
  address: string;
  parcelNo?: string;
  permitNumber?: string;
  maxCapacity?: number;
  kbsCode?: string;
  ownershipType: OwnershipType;
  signatureName: string;
};

export type ListParams = {
  status?: ApplicationStatus;
  q?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class HostApplicationsService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateApplicationInput) {
    return this.prisma.hostApplication.create({
      data: { ...input, termsAcceptedAt: new Date() },
    });
  }

  async list({ status, q, page = 1, pageSize = 20 }: ListParams) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const where = {
      ...(status ? { status } : {}),
      ...(q?.trim()
        ? {
            OR: [
              { ownerName: { contains: q.trim(), mode: 'insensitive' as const } },
              { email: { contains: q.trim(), mode: 'insensitive' as const } },
              { phone: { contains: q.trim(), mode: 'insensitive' as const } },
              { address: { contains: q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.hostApplication.findMany({
        where,
        include: { _count: { select: { documents: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.hostApplication.count({ where }),
    ]);

    return { items, total, page: Math.max(page, 1), pageSize: take };
  }

  async get(id: string) {
    const app = await this.prisma.hostApplication.findUnique({
      where: { id },
      include: { documents: { orderBy: { uploadedAt: 'asc' } } },
    });
    if (!app) throw new NotFoundException('Başvuru bulunamadı.');
    return app;
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', adminNote: string | undefined, actorId: string) {
    await this.get(id);
    return this.prisma.hostApplication.update({
      where: { id },
      data: { status, adminNote, reviewedAt: new Date(), reviewedBy: actorId },
    });
  }

  counts() {
    return this.prisma.hostApplication.count({ where: { status: 'PENDING' } });
  }

  /** Dosyayı diske yazar ve kaydını oluşturur. MIME + boyut kontrolü burada. */
  async addDocument(
    applicationId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    await this.get(applicationId);

    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Yalnızca PDF, JPG veya PNG dosyası yükleyebilirsiniz.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Dosya boyutu 10 MB’ı aşamaz.');
    }

    const dir = join(UPLOAD_ROOT, applicationId);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    // Rastgele ad: orijinal dosya adı (Türkçe karakter, path traversal riski) diske hiç yazılmaz.
    const storedName = `${randomUUID()}${ext}`;
    await writeFile(join(dir, storedName), file.buffer);

    return this.prisma.hostApplicationDocument.create({
      data: {
        applicationId,
        type,
        fileName: file.originalname.slice(0, 200),
        storedName,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  }

  async getDocumentFile(applicationId: string, documentId: string) {
    const doc = await this.prisma.hostApplicationDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.applicationId !== applicationId) {
      throw new NotFoundException('Belge bulunamadı.');
    }
    return { doc, path: join(UPLOAD_ROOT, applicationId, doc.storedName) };
  }

  async removeDocument(applicationId: string, documentId: string) {
    const { doc, path } = await this.getDocumentFile(applicationId, documentId);
    await this.prisma.hostApplicationDocument.delete({ where: { id: doc.id } });
    await unlink(path).catch(() => {});
    return { ok: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@Injectable()
export class PredictionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPredictionDto: CreatePredictionDto) {
    const { estimationSortieDate, ...rest } = createPredictionDto;
    return this.prisma.prediction.create({
      data: {
        ...rest,
        estimationSortieDate: new Date(estimationSortieDate),
      },
      include: { produit: true },
    });
  }

  async findAll() {
    return this.prisma.prediction.findMany({
      include: { produit: true },
    });
  }

  async findOne(id: string) {
    const prediction = await this.prisma.prediction.findUnique({
      where: { id },
      include: { produit: true },
    });
    if (!prediction) {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }
    return prediction;
  }

  async update(id: string, updatePredictionDto: UpdatePredictionDto) {
    const { estimationSortieDate, ...rest } = updatePredictionDto;
    try {
      return await this.prisma.prediction.update({
        where: { id },
        data: {
          ...rest,
          ...(estimationSortieDate !== undefined && {
            estimationSortieDate: new Date(estimationSortieDate),
          }),
        },
        include: { produit: true },
      });
    } catch {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.prediction.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { GetWarehousesFilterDto } from './dto/get-warehouses-filter.dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWarehouseDto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: createWarehouseDto,
    });
  }

  async findAll(filterDto: GetWarehousesFilterDto) {
    const { location, capacity } = filterDto;
    
    const where: any = {};
    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }
    if (capacity !== undefined) {
      where.capacity = capacity;
    }

    return this.prisma.warehouse.findMany({
      where,
    });
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto) {
    try {
      return await this.prisma.warehouse.update({
        where: { id },
        data: updateWarehouseDto,
      });
    } catch (error) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.warehouse.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
  }
}

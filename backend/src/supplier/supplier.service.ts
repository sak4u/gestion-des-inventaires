import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { GetSuppliersFilterDto } from './dto/get-suppliers-filter.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: createSupplierDto,
    });
  }

  async findAll(filterDto: GetSuppliersFilterDto) {
    const { name, email } = filterDto;
    
    const where: any = {};
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }
    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    return this.prisma.supplier.findMany({
      where,
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: updateSupplierDto,
      });
    } catch (error) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.supplier.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
  }
}
